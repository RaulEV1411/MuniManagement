import logging
from datetime import timedelta
from rest_framework_simplejwt.settings import api_settings as jwt_ajustes
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken, TokenError, UntypedToken
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.db.models import OuterRef, Q, Subquery
from django.http import HttpResponse
from django.utils import timezone
from django.contrib.auth.hashers import check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from .models import Ausencia, Especialidad, Roles, Users
from .serializers import (AusenciaSerializer, EspecialidadSerializer, RolesSerializer, UsersSerializer,
                          UsuarioDirectorioSerializer)
from . import ausencias as servicio_ausencias
from Projects.permissions import CatalogoSoloAdministrador
from Notifications.servicios import notificar
from .permissions import UsersPermission, RolesPermission
from Projects import authz
from Projects import catalogo_permisos as cat
from MuniServer.borrado import ProtegidoAlBorrarMixin
from MuniServer.subidas import borrar_imagen_por_url, error_de_imagen, subir_imagen
from .acceso import encolar_correo_de_acceso, revocar_sesiones, usuario_del_enlace
from Auditoria import contexto as auditoria_contexto, servicios as auditoria, sesiones
from Auditoria.models import SesionUsuario
from django.conf import settings as django_settings
from rest_framework import exceptions
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from .autenticacion import (
    ACCESS, REFRESH, RUTA_REFRESH, borrar_cookies_de_sesion, datos_de_sesion, fijar_cookie, fijar_cookies_de_sesion,
)

logger = logging.getLogger(__name__)

DEMASIADOS_INTENTOS = {'error': 'Demasiados intentos. Espere un minuto e inténtelo de nuevo.'}


def _limite(nombre):
    """La tasa sale de settings, para poder ajustarla por instalación (y subirla en las pruebas e2e)."""
    return lambda group, request: getattr(django_settings, nombre)


def _clave_email(group, request):
    return str(request.data.get('email', '')).strip().lower()


def _errores_de_clave(password, user):
    try:
        validate_password(password, user)
    except DjangoValidationError as e:
        return ' '.join(e.messages)
    return None


class RolesViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    """Roles de la institución y su matriz de permisos.

    Los del sistema no se renombran ni se borran, pero sus permisos sí se ajustan; los del
    Administrador quedan fijos para que nadie pierda el acceso a la configuración."""
    queryset = Roles.objects.all().order_by('name')
    serializer_class = RolesSerializer
    permission_classes = [IsAuthenticated, RolesPermission]
    pagination_class = None
    mensaje_protegido = 'No se puede borrar: hay personas con este rol.'

    def perform_update(self, serializer):
        rol = serializer.instance
        datos = serializer.validated_data
        if rol.name == 'Administrador' and 'permisos' in datos:
            raise ValidationError({'permisos': 'Los permisos del Administrador no se cambian: siempre tiene todo.'})
        if rol.is_system and 'name' in datos and datos['name'] != rol.name:
            raise ValidationError({'name': 'Los roles del sistema no se renombran.'})
        serializer.save()

    def perform_destroy(self, instance):
        if instance.is_system:
            raise ValidationError('Los roles del sistema no se borran.')
        super().perform_destroy(instance)

    @action(detail=False, methods=['get'])
    def catalogo(self, request):
        """Módulos, permisos y alcances, para armar la matriz en el front."""
        return Response({
            'modulos': [{'codigo': c, 'nombre': n} for c, n in cat.MODULOS.items()],
            'permisos': [
                {'codigo': c, 'modulo': cat.modulo_de(c), 'etiqueta': e, 'admite_alcance': alc, 'en_proyecto': proy}
                for c, (e, alc, proy) in cat.PERMISOS.items()
            ],
            'alcances': [{'codigo': a, 'etiqueta': cat.ETIQUETAS_ALCANCE[a]} for a in cat.ALCANCES],
        })


class UsersViewSet(ModelViewSet):
    serializer_class = UsersSerializer
    permission_classes = [IsAuthenticated, UsersPermission]

    def get_serializer_class(self):
        # La alcaldía y la propia persona ven la ficha completa; el resto, solo el directorio
        # (nombre, correo, puesto, foto, rol y departamento; sin cédula, teléfono ni nacimiento).
        user = self.request.user
        if authz.alcance_de(user, 'usuarios.ver_datos') == cat.TODOS or authz.es_administrador(user):
            return UsersSerializer
        if self.action == 'list' or (self.action == 'retrieve' and str(self.kwargs.get('pk')) != str(user.user_ID)):
            return UsuarioDirectorioSerializer
        return UsersSerializer

    def get_queryset(self):
        # Cada quien ve a quienes su lugar en la jerarquía le permite (authz.usuarios_visibles);
        # qué datos ve de cada uno lo decide get_serializer_class.
        user = self.request.user
        # Pedir también a los dados de baja: quien gestiona usuarios o equipos (antes: alcaldía y jefaturas).
        gestiona = authz.puede(user, 'usuarios.gestionar') or authz.puede(user, 'equipo.gestionar')
        qs = authz.usuarios_visibles(user).select_related('role', 'departamento_ID__direccion').prefetch_related(
            'especialidades', servicio_ausencias.prefetch_vigentes(),
        ).annotate(
            ultima_conexion=Subquery(
                SesionUsuario.objects.filter(usuario=OuterRef('pk')).order_by('-ultima_actividad').values('ultima_actividad')[:1]
            ),
        )
        if self.action in ('list', 'retrieve'):
            qs = servicio_ausencias.anotar_carga(qs)
        # Los dados de baja no aparecen en las listas; la alcaldía y los jefes pueden pedirlos.
        if self.action == 'list':
            p = self.request.query_params
            if not gestiona or p.get('incluir_inactivos') not in ('1', 'true'):
                qs = qs.filter(is_active=True)
            # Cada palabra en algún dato: así «Ana Rodríguez» encuentra a Ana por nombre y apellido.
            for q in p.get('search', '').split()[:5]:
                qs = qs.filter(
                    Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(email__icontains=q)
                    | Q(puesto__icontains=q) | Q(departamento_ID__name__icontains=q)
                )
            if p.get('rol'):
                qs = qs.filter(role__name=p['rol'])
            if p.get('departamento'):
                qs = qs.filter(departamento_ID=p['departamento'])
            if p.get('especialidad'):
                qs = qs.filter(especialidades=p['especialidad'])
            qs = qs.order_by('first_name', 'last_name')
        return qs

    def _validar_departamento_y_rol(self, datos, anterior=None):
        user = self.request.user
        depto = datos.get('departamento_ID')
        if depto is not None and (anterior is None or depto.pk != anterior.departamento_ID_id):
            alcance = authz.alcance_de(user, 'usuarios.gestionar')
            if not authz.es_administrador(user) and not authz.en_alcance_de_departamento(user, alcance, depto):
                raise PermissionDenied('No puede gestionar usuarios de ese departamento.')
        rol = datos.get('role')
        if rol is not None and (anterior is None or rol.pk != anterior.role_id):
            if rol.name == 'Administrador' and not authz.es_administrador(user):
                raise PermissionDenied('Solo un Administrador puede dar el rol de Administrador.')
            # Nadie da más de lo que tiene: sin roles.gestionar, solo roles que no superen los propios permisos.
            if not authz.puede(user, 'roles.gestionar') and not authz.rol_no_supera(rol, user):
                raise PermissionDenied('No puede asignar un rol con más permisos que los suyos.')

    def perform_create(self, serializer):
        self._validar_departamento_y_rol(serializer.validated_data)
        serializer.save()

    def perform_update(self, serializer):
        self._validar_departamento_y_rol(serializer.validated_data, serializer.instance)
        serializer.save()

    @action(detail=True, methods=['get'])
    def permisos(self, request, pk=None):
        """«Ver como»: lo que puede hacer esta persona, por su rol y por los equipos donde está."""
        persona = self.get_object()
        if persona.pk != request.user.pk and not (
            authz.puede(request.user, 'roles.gestionar') or authz.puede_sobre_usuario(request.user, 'usuarios.gestionar', persona)
        ):
            raise PermissionDenied('No puede ver los permisos de esta persona.')
        from Projects.models import MiembroProyecto
        equipos = MiembroProyecto.objects.filter(authz.membresia_vigente(), usuario=persona).select_related('proyecto', 'rol')
        return Response({
            'rol': persona.role.name if persona.role_id else '',
            'permisos': authz.permisos_del_rol(persona),
            'equipos': [
                {'proyecto': str(m.proyecto_id), 'nombre': m.proyecto.name, 'rol': m.rol.nombre,
                 'hasta': m.hasta.isoformat() if m.hasta else None}
                for m in equipos
            ],
        })

    def perform_destroy(self, instance):
        # Dar de baja en lugar de borrar: conserva sus proyectos, ajustes e historial.
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        revocar_sesiones(instance, 'baja')

    @action(detail=True, methods=['get'])
    def datos(self, request, pk=None):
        """«Mis datos» (Ley 8968, derecho de acceso): todo lo que el sistema guarda de la persona.
        La propia persona, o el Administrador cuando ella lo pide por otra vía."""
        persona = self.get_object()
        if persona.pk != request.user.pk and not authz.es_administrador(request.user):
            raise PermissionDenied('Solo puede descargar sus propios datos.')
        from .datos_personales import datos_de
        auditoria.registrar('usuarios', 'exportar', objeto=persona, objeto_repr=f'Datos personales de {persona.first_name} {persona.last_name}')
        return Response(datos_de(persona))

    @action(detail=False, methods=['get'])
    def exportar(self, request):
        """Lista de usuarios en CSV, con datos personales: quien exporta reportes y ve los datos de todos."""
        user = request.user
        if not authz.es_administrador(user) and not (
            authz.puede(user, 'reportes.exportar') and authz.alcance_de(user, 'usuarios.ver_datos') == cat.TODOS
        ):
            raise PermissionDenied('Su rol no permite exportar los datos de las personas.')
        from .datos_personales import csv_de_usuarios
        qs = self.get_queryset().order_by('first_name', 'last_name')
        contenido, total = csv_de_usuarios(qs)
        auditoria.registrar('usuarios', 'exportar', objeto_repr='Lista de usuarios (CSV)', motivo=f'{total} personas')
        respuesta = HttpResponse(contenido, content_type='text/csv; charset=utf-8')
        respuesta['Content-Disposition'] = f'attachment; filename="usuarios_{timezone.localdate().isoformat()}.csv"'
        return respuesta

    @action(detail=True, methods=['post'])
    def anonimizar(self, request, pk=None):
        """A pedido de la persona, y solo con la cuenta dada de baja: se borran sus datos personales y
        quedan sus proyectos, tareas e historial a nombre de «Persona anonimizada»."""
        persona = self.get_object()
        if not authz.es_administrador(request.user):
            raise PermissionDenied('Solo el Administrador anonimiza cuentas.')
        if persona.is_active:
            raise ValidationError({'is_active': 'Primero dé de baja la cuenta.'})
        if persona.first_name == 'Persona' and persona.last_name == 'anonimizada':
            raise ValidationError({'is_active': 'La cuenta ya está anonimizada.'})
        from .datos_personales import anonimizar
        anonimizar(persona, str(request.data.get('motivo', '')).strip()[:255])
        return Response({'ok': True})

    @action(detail=True, methods=['post'], url_path='enviar-acceso')
    def enviar_acceso(self, request, pk=None):
        """La alcaldía reenvía el enlace para definir contraseña (cuenta nueva o clave olvidada)."""
        user = self.get_object()
        if not authz.puede_gestionar_a(request.user, user):
            return Response({'error': 'No tiene permisos para reenviar el acceso a esta persona.'}, status=403)
        if not user.is_active:
            return Response({'error': 'El usuario está dado de baja.'}, status=400)
        encolar_correo_de_acceso(user, 'recuperacion')
        auditoria.registrar('usuarios', 'enviar_acceso', objeto=user)
        return Response({'ok': True})


class EspecialidadViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    queryset = Especialidad.objects.all()
    serializer_class = EspecialidadSerializer
    permission_classes = [IsAuthenticated, CatalogoSoloAdministrador]
    pagination_class = None
    mensaje_protegido = 'No se puede borrar: hay personas con esta especialidad.'

    def perform_destroy(self, instance):
        # La relación con las personas es M2M y no protege sola: se trata como los demás catálogos en uso.
        from django.db.models import ProtectedError
        if instance.usuarios.exists():
            raise ProtectedError(self.mensaje_protegido, {instance})
        instance.delete()


class AusenciaViewSet(ModelViewSet):
    """Ausencias de las personas que se ven. Las registra la persona, quien la gestiona o su jefatura
    (también quien la cubre como suplente)."""
    serializer_class = AusenciaSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = Ausencia.objects.filter(usuario__in=authz.usuarios_visibles(self.request.user).values('pk')).select_related(
            'usuario__departamento_ID__direccion', 'usuario__role', 'registrada_por',
        )
        persona = self.request.query_params.get('usuario')
        if persona:
            qs = qs.filter(usuario=persona)
        if self.request.query_params.get('desde'):
            qs = qs.filter(hasta__gte=self.request.query_params['desde'])
        return qs

    def _exigir(self, persona):
        if not authz.usuarios_visibles(self.request.user).filter(pk=persona.pk).exists():
            raise ValidationError({'usuario': 'Persona no encontrada.'})
        if not servicio_ausencias.puede_registrar_ausencia(self.request.user, persona):
            raise PermissionDenied('Solo la persona, quien la gestiona o su jefatura registran sus ausencias.')

    def perform_create(self, serializer):
        persona = serializer.validated_data['usuario']
        self._exigir(persona)
        ausencia = serializer.save(registrada_por=self.request.user)
        self._avisar(ausencia)

    def perform_update(self, serializer):
        self._exigir(serializer.instance.usuario)
        serializer.save()

    def perform_destroy(self, instance):
        self._exigir(instance.usuario)
        instance.delete()

    def create(self, request, *args, **kwargs):
        respuesta = super().create(request, *args, **kwargs)
        # Para sugerir la delegación: los proyectos abiertos a cargo que ve quien registra.
        persona = Users.objects.get(pk=respuesta.data['usuario'])
        respuesta.data['proyectos_a_cargo'] = [
            {'proyect_ID': str(p['proyect_ID']), 'name': p['name']}
            for p in servicio_ausencias.proyectos_abiertos_a_cargo(persona, request.user)
        ]
        return respuesta

    def _avisar(self, ausencia):
        """Sin el tipo: la jefatura sabe que no está, no por qué."""
        from Departments.models import Departamentos, Direccion
        persona = ausencia.usuario
        nombre = f'{persona.first_name} {persona.last_name}'.strip()
        periodo = f'del {ausencia.desde:%d/%m/%Y} al {ausencia.hasta:%d/%m/%Y}'
        a_cargo = len(servicio_ausencias.proyectos_abiertos_a_cargo(persona, persona))
        depto = persona.departamento_ID
        if a_cargo and depto:
            jefatura = depto.jefe if depto.jefe_id and depto.jefe_id != persona.pk else (depto.direccion.jefe if depto.direccion_id else None)
            notificar([jefatura], self.request.user, 'general', f'{nombre} estará ausente',
                      f'{nombre} estará ausente {periodo} y tiene {a_cargo} proyecto{"s" if a_cargo != 1 else ""} '
                      'abierto(s) a cargo. Conviene delegarlos en el equipo de cada proyecto.', f'/users/{persona.pk}')
        unidades = [*Departamentos.objects.filter(jefe=persona, suplente__isnull=False).select_related('suplente'),
                    *Direccion.objects.filter(jefe=persona, suplente__isnull=False).select_related('suplente')]
        for unidad in unidades:
            notificar([unidad.suplente], self.request.user, 'delegacion', f'Suplencia: {unidad.name}',
                      f'{nombre} estará ausente {periodo}. Durante esos días usted cubre la jefatura de {unidad.name}.',
                      f'/users/{persona.pk}')


def _fallo_de_inicio(email, motivo):
    """El correo se anota solo si es de una cuenta: a veces se escribe la clave en el campo del correo."""
    cuenta = Users.objects.filter(email__iexact=email).first() if email else None
    if cuenta is not None and not cuenta.is_active and motivo == 'Credenciales incorrectas':
        motivo = 'La cuenta está dada de baja'
    auditoria.registrar(
        'sesion', 'fallo_inicio', objeto=cuenta, usuario_email=cuenta.email if cuenta else '',
        resultado='fallo', motivo=motivo if cuenta else f'{motivo} (correo no registrado)',
    )


# Por correo, para frenar a quien prueba claves de una cuenta; por IP, más alto, porque
# toda una oficina municipal suele salir a internet con la misma IP.
@method_decorator(ratelimit(key='ip', rate=_limite('LOGIN_LIMITE_POR_IP'), method='POST', block=False), name='post')
@method_decorator(ratelimit(key=_clave_email, rate=_limite('LOGIN_LIMITE_POR_CORREO'), method='POST', block=False), name='post')
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = str(request.data.get('email') or '').strip()
        if getattr(request, 'limited', False):
            _fallo_de_inicio(email, 'Demasiados intentos: bloqueado por un minuto')
            return Response(DEMASIADOS_INTENTOS, status=429)
        password = request.data.get('password')
        user = authenticate(username=email, password=password)
        if user is None:
            _fallo_de_inicio(email, 'Credenciales incorrectas')
            return Response({'error': 'Credenciales incorrectas'}, status=400)
        auditoria_contexto.fijar_usuario(user)
        sesion = sesiones.abrir(user, request)
        refresh = RefreshToken.for_user(user)
        refresh['sid'] = str(sesion.pk)
        auditoria.registrar('sesion', 'iniciar_sesion', objeto=user, sesion=sesion.pk)
        respuesta = Response(datos_de_sesion(request, user))
        fijar_cookies_de_sesion(respuesta, refresh)
        return respuesta


@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=False), name='post')
class DefinirClaveView(APIView):
    """Define la contraseña con el enlace del correo, tanto en una cuenta nueva como al recuperarla."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        if getattr(request, 'limited', False):
            return Response(DEMASIADOS_INTENTOS, status=429)
        user = usuario_del_enlace(str(request.data.get('uid', '')), str(request.data.get('token', '')))
        if user is None:
            return Response({'error': 'El enlace no es válido o ya venció. Pida uno nuevo.'}, status=400)
        password = str(request.data.get('password', ''))
        error = _errores_de_clave(password, user)
        if error:
            return Response({'error': error}, status=400)
        auditoria_contexto.fijar_usuario(user)
        user.set_password(password)
        user.save(update_fields=['password'])
        revocar_sesiones(user, 'clave')
        return Response({'ok': True})


@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=False), name='post')
@method_decorator(ratelimit(key=_clave_email, rate='3/h', method='POST', block=False), name='post')
class OlvideClaveView(APIView):
    """Manda el enlace de recuperación. Responde lo mismo exista o no el correo."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        if getattr(request, 'limited', False):
            return Response(DEMASIADOS_INTENTOS, status=429)
        email = _clave_email(None, request)
        user = Users.objects.filter(email__iexact=email, is_active=True).first() if email else None
        if user is not None:
            encolar_correo_de_acceso(user, 'recuperacion')
        return Response({'ok': True, 'mensaje': 'Si el correo está registrado, le enviamos un enlace para definir una contraseña nueva.'})


class LogoutView(APIView):
    """Revoca el refresh (cookie o cuerpo) y borra las cookies de sesión. Funciona aunque el access haya vencido."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        crudo = request.COOKIES.get(REFRESH) or request.data.get('refresh')
        if crudo:
            try:
                token = RefreshToken(crudo)
                token.blacklist()
            except TokenError:
                token = None
            if token is not None and token.get('sid'):
                if sesiones.cerrar(token['sid'], 'cierre'):
                    persona = Users.objects.filter(pk=token.get('user_ID')).first()
                    auditoria.registrar('sesion', 'cerrar_sesion', objeto=persona, usuario=persona, sesion=token['sid'])
        respuesta = Response({'ok': True})
        borrar_cookies_de_sesion(respuesta)
        return respuesta


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(datos_de_sesion(request, request.user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def completar_onboarding(request):
    user = request.user
    user.onboarding_completado = True
    user.save(update_fields=['onboarding_completado'])
    return Response({'onboarding_completado': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_user_photo(request, user_id):
    file = request.FILES.get('image')
    if not file:
        return Response({'error': 'No se proporcionó ninguna imagen.'}, status=400)

    try:
        user = Users.objects.get(user_ID=user_id)
    except Users.DoesNotExist:
        return Response({'error': 'Usuario no encontrado.'}, status=404)

    if request.user.user_ID != user.user_ID and not authz.puede_gestionar_a(request.user, user):
        return Response({'error': 'No tiene permisos para modificar esta foto.'}, status=403)

    error = error_de_imagen(file)
    if error:
        return Response({'error': error}, status=400)

    try:
        borrar_imagen_por_url(user.user_photo)
    except Exception:
        logger.exception('No se pudo borrar la foto anterior')

    result = subir_imagen(file, 'munimanagement/usuarios')
    user.user_photo = result['secure_url']
    user.save()
    return Response({'user_photo': result['secure_url']})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')

    if not check_password(current_password, user.password):
        return Response({'error': 'Contraseña actual incorrecta'}, status=400)

    error = _errores_de_clave(new_password, user)
    if error:
        return Response({'error': error}, status=400)

    user.set_password(new_password)
    user.save(update_fields=['password'])
    return Response({'message': 'Contraseña actualizada correctamente'})


# Un refresh recién rotado sigue valiendo unos segundos. Si la respuesta de la rotación no llega al navegador
# (se recargó la página en medio, o dos pestañas renovaron a la vez), el refresh viejo no debe cerrar la sesión.
GRACIA_DE_ROTACION = timedelta(seconds=30)


def _renovar_recien_rotado(crudo):
    """Tokens nuevos para la misma sesión si `crudo` es un refresh rotado hace menos de GRACIA_DE_ROTACION.
    Solo con la sesión abierta: cerrar sesión, cambiar la clave, dar de baja o cerrarla a distancia la cierran."""
    if not crudo:
        return None
    try:
        token = UntypedToken(crudo)  # firma y vencimiento, sin mirar la lista negra
    except TokenError:
        return None
    sid = token.get('sid')
    if token.get('token_type') != 'refresh' or not sid or not sesiones.esta_abierta(sid):
        return None
    if not BlacklistedToken.objects.filter(
        token__jti=token.get(jwt_ajustes.JTI_CLAIM), blacklisted_at__gte=timezone.now() - GRACIA_DE_ROTACION,
    ).exists():
        return None
    user = Users.objects.filter(**{jwt_ajustes.USER_ID_FIELD: token.get(jwt_ajustes.USER_ID_CLAIM)}).first()
    if user is None or not jwt_ajustes.USER_AUTHENTICATION_RULE(user):
        return None
    refresh = RefreshToken.for_user(user)
    refresh['sid'] = sid
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


class RenovarSesionView(APIView):
    """Renueva el access con el refresh de la cookie (o del cuerpo, para scripts). Rota el refresh."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        crudo = request.COOKIES.get(REFRESH) or request.data.get('refresh')
        serializer = TokenRefreshSerializer(data={'refresh': crudo or ''})
        try:
            sid = RefreshToken(crudo).get('sid') if crudo else None
            if sid and not sesiones.esta_abierta(sid):
                raise exceptions.AuthenticationFailed('La sesión se cerró.')
            serializer.is_valid(raise_exception=True)
            datos = serializer.validated_data
        except (TokenError, exceptions.ValidationError, exceptions.AuthenticationFailed):
            datos = _renovar_recien_rotado(crudo)
        if datos is None:
            # Vencida, revocada, de un usuario dado de baja o ausente: hay que volver a entrar.
            respuesta = Response({'error': 'La sesión venció. Inicie sesión de nuevo.'}, status=401)
            borrar_cookies_de_sesion(respuesta)
            return respuesta
        respuesta = Response({'ok': True})
        jwt = django_settings.SIMPLE_JWT
        fijar_cookie(respuesta, ACCESS, datos['access'], int(jwt['ACCESS_TOKEN_LIFETIME'].total_seconds()), '/')
        if 'refresh' in datos:
            fijar_cookie(respuesta, REFRESH, datos['refresh'], int(jwt['REFRESH_TOKEN_LIFETIME'].total_seconds()), RUTA_REFRESH)
        return respuesta


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def aceptar_privacidad(request):
    """Acepta la versión vigente del aviso de privacidad (queda la versión y la fecha)."""
    from Configuracion.models import Configuracion
    user = request.user
    version = Configuracion.actual().privacidad_version
    if str(request.data.get('version', '')) != str(version):
        return Response({'error': 'El aviso cambió: vuelva a leerlo.', 'version': version}, status=409)
    user.privacidad_version = version
    user.privacidad_aceptada_en = timezone.now()
    user.save(update_fields=['privacidad_version', 'privacidad_aceptada_en'])
    return Response({'ok': True, 'version': version})

