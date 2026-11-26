import cloudinary.uploader
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.db.models import Q
from django.contrib.auth.hashers import check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from .models import Roles, Users
from .serializers import RolesSerializer, UsersSerializer, UsuarioDirectorioSerializer
from .permissions import UsersPermission, RolesPermission, _role_name, _role_flag, ROLES_ADMIN, ROLES_JEFES
from Projects.permissions import SystemRecordReadOnly
from MuniServer.subidas import error_de_imagen, subir_imagen
from .acceso import encolar_correo_de_acceso, revocar_sesiones, usuario_del_enlace
from django.conf import settings as django_settings
from rest_framework import exceptions
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from .autenticacion import (
    ACCESS, REFRESH, RUTA_REFRESH, borrar_cookies_de_sesion, datos_de_sesion, fijar_cookie, fijar_cookies_de_sesion,
)

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


class RolesViewSet(ModelViewSet):
    queryset = Roles.objects.all()
    serializer_class = RolesSerializer
    permission_classes = [IsAuthenticated, RolesPermission, SystemRecordReadOnly]
    pagination_class = None


class UsersViewSet(ModelViewSet):
    serializer_class = UsersSerializer
    permission_classes = [IsAuthenticated, UsersPermission]

    def get_serializer_class(self):
        # La alcaldía y la propia persona ven la ficha completa; los jefes, solo el directorio.
        user = self.request.user
        if _role_name(user) in ROLES_ADMIN or _role_flag(user, 'puede_ver_todo'):
            return UsersSerializer
        if self.action == 'list' or (self.action == 'retrieve' and str(self.kwargs.get('pk')) != str(user.user_ID)):
            return UsuarioDirectorioSerializer
        return UsersSerializer

    def get_queryset(self):
        user = self.request.user
        rol = _role_name(user)
        ver_todo = _role_flag(user, 'puede_ver_todo')
        if rol in ROLES_ADMIN or ver_todo or rol in ROLES_JEFES:
            qs = Users.objects.all().select_related('role', 'departamento_ID')
            # Los dados de baja no aparecen en las listas, salvo que se pidan.
            if self.action == 'list':
                p = self.request.query_params
                if p.get('incluir_inactivos') not in ('1', 'true'):
                    qs = qs.filter(is_active=True)
                if p.get('search', '').strip():
                    q = p['search'].strip()
                    qs = qs.filter(
                        Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(email__icontains=q)
                        | Q(puesto__icontains=q) | Q(departamento_ID__name__icontains=q)
                    )
                if p.get('rol'):
                    qs = qs.filter(role__name=p['rol'])
                if p.get('departamento'):
                    qs = qs.filter(departamento_ID=p['departamento'])
                qs = qs.order_by('first_name', 'last_name')
            return qs
        # Funcionarios solo se ven a sí mismos
        return Users.objects.filter(user_ID=user.user_ID).select_related('role', 'departamento_ID')

    def perform_destroy(self, instance):
        # Dar de baja en lugar de borrar: conserva sus proyectos, ajustes e historial.
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        revocar_sesiones(instance)

    @action(detail=True, methods=['post'], url_path='enviar-acceso')
    def enviar_acceso(self, request, pk=None):
        """La alcaldía reenvía el enlace para definir contraseña (cuenta nueva o clave olvidada)."""
        user = self.get_object()
        if not (_role_name(request.user) in ROLES_ADMIN or _role_flag(request.user, 'puede_ver_todo')):
            return Response({'error': 'Solo la alcaldía o un administrador pueden reenviar el acceso.'}, status=403)
        if not user.is_active:
            return Response({'error': 'El usuario está dado de baja.'}, status=400)
        encolar_correo_de_acceso(user, 'recuperacion')
        return Response({'ok': True})


# Por correo, para frenar a quien prueba claves de una cuenta; por IP, más alto, porque
# toda una oficina municipal suele salir a internet con la misma IP.
@method_decorator(ratelimit(key='ip', rate=_limite('LOGIN_LIMITE_POR_IP'), method='POST', block=False), name='post')
@method_decorator(ratelimit(key=_clave_email, rate=_limite('LOGIN_LIMITE_POR_CORREO'), method='POST', block=False), name='post')
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        if getattr(request, 'limited', False):
            return Response(DEMASIADOS_INTENTOS, status=429)
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(username=email, password=password)
        if user is None:
            return Response({'error': 'Credenciales incorrectas'}, status=400)
        respuesta = Response(datos_de_sesion(request, user))
        fijar_cookies_de_sesion(respuesta, RefreshToken.for_user(user))
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
        user.set_password(password)
        user.save(update_fields=['password'])
        revocar_sesiones(user)
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
                RefreshToken(crudo).blacklist()
            except TokenError:
                pass
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

    if request.user.user_ID != user.user_ID and not (_role_name(request.user) in ROLES_ADMIN or _role_flag(request.user, 'puede_ver_todo')):
        return Response({'error': 'No tienes permisos para modificar esta foto.'}, status=403)

    error = error_de_imagen(file)
    if error:
        return Response({'error': error}, status=400)

    if user.user_photo:
        old_public_id = user.user_photo.split('/')[-1].split('.')[0]
        try:
            cloudinary.uploader.destroy(f'munimanagement/usuarios/{old_public_id}')
        except Exception:
            pass

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


class RenovarSesionView(APIView):
    """Renueva el access con el refresh de la cookie (o del cuerpo, para scripts). Rota el refresh."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        crudo = request.COOKIES.get(REFRESH) or request.data.get('refresh')
        serializer = TokenRefreshSerializer(data={'refresh': crudo or ''})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, exceptions.ValidationError, exceptions.AuthenticationFailed):
            # Vencida, revocada, de un usuario dado de baja o ausente: hay que volver a entrar.
            respuesta = Response({'error': 'La sesión venció. Inicie sesión de nuevo.'}, status=401)
            borrar_cookies_de_sesion(respuesta)
            return respuesta
        datos = serializer.validated_data
        respuesta = Response({'ok': True})
        jwt = django_settings.SIMPLE_JWT
        fijar_cookie(respuesta, ACCESS, datos['access'], int(jwt['ACCESS_TOKEN_LIFETIME'].total_seconds()), '/')
        if 'refresh' in datos:
            fijar_cookie(respuesta, REFRESH, datos['refresh'], int(jwt['REFRESH_TOKEN_LIFETIME'].total_seconds()), RUTA_REFRESH)
        return respuesta
