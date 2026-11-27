from MuniServer.subidas import borrar_imagen, error_de_documento, error_de_imagen, subir_documento, subir_imagen
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework import status
from django.db import transaction
from django.db.models import OuterRef, Prefetch, ProtectedError, Q, Subquery, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import (
    Estado, Prioridad, Tipos, Proyectos, Proyectos_tipos, ProjectImage,
    AjustePresupuesto, MiembroProyecto, RolProyecto, CierreProyecto, DocumentoProyecto,
    TareaPlantilla, FuenteFinanciamiento, HitoProyecto, RiesgoProyecto, CampoPersonalizado,
)
from .serializers import (
    CerrarProyectoSerializer, ReabrirProyectoSerializer, DocumentoProyectoSerializer,
    EstadoSerializer, PrioridadSerializer, TiposSerializer,
    ProyectosTiposSerializer, ProyectosReadSerializer, ProyectosWriteSerializer,
    ProjectImageSerializer, MiembroProyectoSerializer, RolProyectoSerializer, AjustePresupuestoSerializer,
    TareaPlantillaSerializer, FuenteFinanciamientoSerializer, HitoProyectoSerializer, RiesgoProyectoSerializer,
    CampoPersonalizadoSerializer,
)
from .permissions import SystemRecordReadOnly, CatalogoSoloAdministrador
from . import authz, consultas
from . import campos as campos_personalizados
from MuniServer.borrado import ProtegidoAlBorrarMixin
from Historial.models import HistorialCambios
from Notifications.models import Notificacion
from Notifications.servicios import interesados_del_proyecto, nombre, notificar
from Configuracion.models import Configuracion


def _proyectos_visibles_qs(user):
    """Proyectos que el usuario puede ver (queryset filtrado, no list), con lo ejecutado de sus tareas."""
    from Task.models import Tareas
    ejecutado = Tareas.objects.filter(proyecto_ID=OuterRef('pk')).values('proyecto_ID').annotate(s=Sum('costo_ejecutado')).values('s')
    return authz.proyectos_visibles(user).select_related(
        'departamento_ID__direccion', 'estado_ID', 'prioridad_ID', 'user_ID', 'fuente_financiamiento'
    ).prefetch_related('images', 'ajustes_presupuesto', 'proyectos_tipos_set__tipo').annotate(
        costo_ejecutado_total=Subquery(ejecutado),
    )


class EstadoViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    queryset = Estado.objects.all()
    serializer_class = EstadoSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated, CatalogoSoloAdministrador, SystemRecordReadOnly]
    mensaje_protegido = 'No se puede borrar: hay proyectos o tareas con este estado.'


class PrioridadViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    queryset = Prioridad.objects.all()
    serializer_class = PrioridadSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated, CatalogoSoloAdministrador, SystemRecordReadOnly]
    mensaje_protegido = 'No se puede borrar: hay proyectos o tareas con esta prioridad.'


class TiposViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    queryset = Tipos.objects.prefetch_related('plantillas')
    serializer_class = TiposSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated, CatalogoSoloAdministrador]
    mensaje_protegido = 'No se puede borrar: hay proyectos de este tipo.'


class TareaPlantillaViewSet(ModelViewSet):
    """Las tareas que trae cada tipo de proyecto (Configuración › Tipos)."""
    serializer_class = TareaPlantillaSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated, CatalogoSoloAdministrador]

    def get_queryset(self):
        qs = TareaPlantilla.objects.all()
        if self.request.query_params.get('tipo'):
            qs = qs.filter(tipo=self.request.query_params['tipo'])
        return qs


class FuenteFinanciamientoViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    queryset = FuenteFinanciamiento.objects.all()
    serializer_class = FuenteFinanciamientoSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated, CatalogoSoloAdministrador]
    mensaje_protegido = 'No se puede borrar: hay proyectos financiados con esta fuente.'


class CampoPersonalizadoViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    queryset = CampoPersonalizado.objects.prefetch_related('tipos')
    serializer_class = CampoPersonalizadoSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated, CatalogoSoloAdministrador]
    mensaje_protegido = 'Ya tiene datos cargados: desactívelo para que no se pida más.'

    def perform_destroy(self, instance):
        # Los valores viven en el JSON de cada proyecto o tarea: la base no los protege sola.
        if campos_personalizados.en_uso(instance):
            raise ProtectedError(self.mensaje_protegido, set())
        instance.delete()


class _DelProyectoViewSet(ModelViewSet):
    """Hitos y riesgos: los ve quien ve el proyecto; los cambia quien puede editarlo, mientras esté abierto."""
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = self.serializer_class.Meta.model.objects.filter(
            proyecto__in=authz.proyectos_visibles(self.request.user).values('pk')
        )
        if self.request.query_params.get('proyecto'):
            qs = qs.filter(proyecto=self.request.query_params['proyecto'])
        return qs

    def _exigir_edicion(self, proyecto):
        if not authz.puede_ver(self.request.user, proyecto):
            raise ValidationError({'proyecto': 'Proyecto no encontrado.'})
        if authz.esta_cerrado(proyecto):
            raise PermissionDenied('El proyecto está cerrado: reábralo para modificarlo.')
        if not authz.puede_editar(self.request.user, proyecto):
            raise PermissionDenied('No tiene permisos para modificar este proyecto.')

    def perform_create(self, serializer):
        self._exigir_edicion(serializer.validated_data['proyecto'])
        serializer.save()

    def perform_update(self, serializer):
        self._exigir_edicion(serializer.instance.proyecto)
        serializer.save()

    def perform_destroy(self, instance):
        self._exigir_edicion(instance.proyecto)
        instance.delete()


class HitoProyectoViewSet(_DelProyectoViewSet):
    serializer_class = HitoProyectoSerializer


class RiesgoProyectoViewSet(_DelProyectoViewSet):
    serializer_class = RiesgoProyectoSerializer

    def get_queryset(self):
        return super().get_queryset().select_related('responsable')

    def perform_create(self, serializer):
        self._exigir_edicion(serializer.validated_data['proyecto'])
        serializer.save(creado_por=self.request.user)


class ProyectosReadViewSet(ModelViewSet):
    serializer_class = ProyectosReadSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'head', 'options']

    def get_serializer_context(self):
        # En el detalle, qué puede hacer quien lo mira (el front muestra solo esos botones).
        return {**super().get_serializer_context(), 'incluir_mis_permisos': self.action == 'retrieve'}

    def get_queryset(self):
        qs = _proyectos_visibles_qs(self.request.user)
        if self.action != 'list':
            # El detalle se abre aunque esté archivado (los filtros de lista no aplican).
            return qs
        p = self.request.query_params
        return consultas.ordenar(consultas.filtrar(qs, p, self.request.user), p)

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Totales para el dashboard, el menú y los reportes, con los mismos filtros que la lista."""
        visibles = authz.proyectos_visibles(request.user)
        datos = consultas.resumen(consultas.filtrar(visibles, request.query_params, request.user))
        # Los contadores de las pestañas, sobre los mismos filtros pero sin la pestaña elegida.
        sin_pestana = request.query_params.copy()
        sin_pestana.pop('categoria', None)
        sin_pestana.pop('archivados', None)
        datos['por_categoria'] = consultas.por_categoria(consultas.filtrar(visibles, sin_pestana, request.user))
        sin_pestana['archivados'] = '1'
        datos['archivados'] = consultas.filtrar(visibles, sin_pestana, request.user).count()
        return Response(datos)


class ProyectosWriteViewSet(ModelViewSet):
    serializer_class = ProyectosWriteSerializer
    permission_classes = [IsAuthenticated]
    # Los proyectos no se borran: se cierran (completado, cancelado u otro), y el Administrador archiva.
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_queryset(self):
        return authz.proyectos_visibles(self.request.user)

    def get_object(self):
        obj = super().get_object()
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            if not authz.puede_ver(self.request.user, obj):
                raise PermissionDenied('No tiene acceso a este proyecto.')
        else:
            if authz.esta_cerrado(obj):
                raise PermissionDenied('El proyecto está cerrado: reábralo para modificarlo.')
            if not authz.puede_editar(self.request.user, obj):
                raise PermissionDenied('No tiene permisos para modificar este proyecto.')
        return obj

    def _visible(self, pk):
        """Para cerrar, reabrir y archivar: cada acción revisa su propio permiso."""
        return get_object_or_404(authz.proyectos_visibles(self.request.user).select_related('estado_ID'), pk=pk)

    def _anotar(self, proyecto, tipo, razon, antes, despues, aviso):
        HistorialCambios.objects.create(
            tipo=tipo, proyecto_ID=proyecto, usuario=self.request.user, razon=razon,
            datos_anteriores=antes, datos_nuevos=despues,
        )
        u = self.request.user
        notificar(
            interesados_del_proyecto(proyecto), u, 'cambio_estado', f'"{nombre(proyecto.name)}" {aviso}',
            f'{u.first_name} {u.last_name}: {razon[:200]}', f'/projects/{proyecto.proyect_ID}',
        )

    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        """Terminar o cancelar: estado final, fecha y costo reales, motivo, lecciones y el acta (opcional)."""
        proyecto = self._visible(pk)
        if authz.esta_cerrado(proyecto):
            raise ValidationError({'estado_ID': 'El proyecto ya está cerrado.'})
        if not authz.puede_editar(request.user, proyecto):
            raise PermissionDenied('No tiene permisos para cerrar este proyecto.')
        datos = CerrarProyectoSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        acta = request.FILES.get('acta')
        if acta is not None:
            error = error_de_documento(acta)
            if error:
                raise ValidationError({'acta': error})
        v = datos.validated_data
        anterior = proyecto.estado_ID.name
        with transaction.atomic():
            cierre = CierreProyecto.objects.create(
                proyecto=proyecto, estado=v['estado_ID'], fecha_fin_real=v['fecha_fin_real'], costo_real=v['costo_real'],
                motivo=v['motivo'].strip(), lecciones=v['lecciones'].strip(), cerrado_por=request.user,
            )
            proyecto.estado_ID = v['estado_ID']
            proyecto.save(update_fields=['estado_ID'])
            if acta is not None:
                subido = subir_documento(acta, f'munimanagement/proyectos/{proyecto.pk}')
                DocumentoProyecto.objects.create(
                    proyecto=proyecto, cierre=cierre, tipo='acta', nombre=(acta.name or 'Acta de cierre')[:120],
                    url=subido['secure_url'], public_id=subido['public_id'], subido_por=request.user,
                )
        self._anotar(
            proyecto, 'cierre', cierre.motivo, {'estado': anterior},
            {'estado': v['estado_ID'].name, 'fecha_fin_real': str(cierre.fecha_fin_real), 'costo_real': str(cierre.costo_real)},
            f'se cerró como {v["estado_ID"].name}',
        )
        return Response({'ok': True, 'estado': v['estado_ID'].name}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def reabrir(self, request, pk=None):
        proyecto = self._visible(pk)
        if proyecto.archivado:
            raise ValidationError({'estado_ID': 'Primero hay que devolverlo a las listas (está archivado).'})
        if not authz.esta_cerrado(proyecto):
            raise ValidationError({'estado_ID': 'El proyecto no está cerrado.'})
        if not authz.puede(request.user, 'proyectos.reabrir', proyecto):
            raise PermissionDenied('Su rol no permite reabrir este proyecto.')
        datos = ReabrirProyectoSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        v = datos.validated_data
        anterior = proyecto.estado_ID.name
        with transaction.atomic():
            proyecto.cierres.filter(reabierto_en__isnull=True).update(
                reabierto_en=timezone.now(), reabierto_por=request.user, motivo_reapertura=v['motivo'].strip(),
            )
            proyecto.estado_ID = v['estado_ID']
            proyecto.save(update_fields=['estado_ID'])
        self._anotar(proyecto, 'reapertura', v['motivo'].strip(), {'estado': anterior}, {'estado': v['estado_ID'].name},
                     f'se reabrió ({v["estado_ID"].name})')
        return Response({'ok': True, 'estado': v['estado_ID'].name})

    @action(detail=True, methods=['post'])
    def archivar(self, request, pk=None):
        """Solo el Administrador, y solo proyectos cerrados: sale de las listas y conserva todo."""
        proyecto = self._visible(pk)
        if not authz.es_administrador(request.user):
            raise PermissionDenied('Solo el Administrador archiva proyectos.')
        if proyecto.archivado:
            raise ValidationError({'archivado': 'Ya está archivado.'})
        if proyecto.estado_ID.categoria != 'finalizado':
            raise ValidationError({'archivado': 'Solo se archivan proyectos cerrados.'})
        proyecto.archivado, proyecto.archivado_en, proyecto.archivado_por = True, timezone.now(), request.user
        proyecto.save(update_fields=['archivado', 'archivado_en', 'archivado_por'])
        HistorialCambios.objects.create(tipo='archivo', proyecto_ID=proyecto, usuario=request.user,
                                        razon=str(request.data.get('motivo', '')).strip()[:500])
        return Response({'ok': True})

    @action(detail=True, methods=['post'])
    def desarchivar(self, request, pk=None):
        proyecto = self._visible(pk)
        if not authz.es_administrador(request.user):
            raise PermissionDenied('Solo el Administrador devuelve proyectos a las listas.')
        if not proyecto.archivado:
            raise ValidationError({'archivado': 'No está archivado.'})
        proyecto.archivado, proyecto.archivado_en, proyecto.archivado_por = False, None, None
        proyecto.save(update_fields=['archivado', 'archivado_en', 'archivado_por'])
        HistorialCambios.objects.create(tipo='desarchivo', proyecto_ID=proyecto, usuario=request.user)
        return Response({'ok': True})

    def _validar_lugar_y_responsable(self, departamento, responsable, al_crear=False):
        user = self.request.user
        # Al crear se exige siempre (sin departamento, puede_crear_proyecto_en niega); al editar, solo si cambia.
        if (al_crear or departamento is not None) and not authz.puede_crear_proyecto_en(user, departamento):
            raise PermissionDenied('No tiene permisos para crear proyectos en ese departamento.')
        if responsable is not None and not authz.usuarios_visibles(user).filter(pk=responsable.pk).exists():
            raise ValidationError({'user_ID': 'El responsable tiene que ser una persona de su alcance.'})

    def perform_create(self, serializer):
        datos = serializer.validated_data
        self._validar_lugar_y_responsable(datos.get('departamento_ID'), datos.get('user_ID'), al_crear=True)
        proyecto = serializer.save()
        HistorialCambios.objects.create(
            tipo='creacion', proyecto_ID=proyecto, usuario=self.request.user,
            datos_nuevos={'name': proyecto.name, 'costo': str(proyecto.costo), 'fecha_entrega': str(proyecto.fecha_entrega)},
        )
        notificar(
            [proyecto.user_ID], self.request.user, 'asignacion',
            f'Le asignaron el proyecto "{nombre(proyecto.name)}"',
            f'{self.request.user.first_name} {self.request.user.last_name} lo nombró responsable del proyecto.',
            f'/projects/{proyecto.proyect_ID}',
        )

    def perform_update(self, serializer):
        prev = serializer.instance
        datos = serializer.validated_data
        # Moverlo de departamento es como crearlo allá; cambiar el responsable, igual que al crear.
        nuevo_depto = datos.get('departamento_ID')
        nuevo_resp = datos.get('user_ID')
        self._validar_lugar_y_responsable(
            nuevo_depto if nuevo_depto and nuevo_depto.pk != prev.departamento_ID_id else None,
            nuevo_resp if nuevo_resp and nuevo_resp.pk != prev.user_ID_id else None,
        )
        anterior = {
            'estado_ID': str(prev.estado_ID_id),
            'fecha_entrega': str(prev.fecha_entrega),
            'costo': str(prev.costo),
            'name': prev.name,
            'descripcion': prev.descripcion,
        }
        nuevo_estado_id = self.request.data.get('estado_ID') or anterior['estado_ID']
        if nuevo_estado_id != anterior['estado_ID']:
            try:
                nuevo_estado = Estado.objects.get(pk=nuevo_estado_id)
            except Estado.DoesNotExist:
                nuevo_estado = None
            if nuevo_estado and nuevo_estado.categoria == 'finalizado':
                raise ValidationError({'estado_ID': 'Para terminar o cancelar el proyecto use «Cerrar proyecto».'})
            if nuevo_estado and nuevo_estado.categoria == 'pausado':
                if not str(self.request.data.get('razon', '')).strip():
                    raise ValidationError({'razon': f'Se requiere un motivo para pasar a "{nuevo_estado.name}".'})

        instance = serializer.save()
        nuevo = {
            'estado_ID': str(instance.estado_ID_id),
            'fecha_entrega': str(instance.fecha_entrega),
            'costo': str(instance.costo),
            'name': instance.name,
            'descripcion': instance.descripcion,
        }
        if anterior['estado_ID'] != nuevo['estado_ID']:
            estado_name = instance.estado_ID.name if hasattr(instance, 'estado_ID') else ''
            tipo = 'cancelacion' if 'Cancelad' in estado_name else 'cambio_estado_proyecto'
            notificar(
                interesados_del_proyecto(instance), self.request.user, 'cambio_estado',
                f'"{nombre(instance.name)}" pasó a {estado_name}',
                f'{self.request.user.first_name} {self.request.user.last_name} cambió el estado del proyecto.',
                f'/projects/{instance.proyect_ID}',
            )
        elif anterior['fecha_entrega'] != nuevo['fecha_entrega']:
            tipo = 'ampliacion_plazo' if nuevo['fecha_entrega'] > anterior['fecha_entrega'] else 'reprogramacion'
        elif anterior['costo'] != nuevo['costo']:
            tipo = 'solicitud_presupuesto'
        else:
            tipo = 'edicion_proyecto'
        HistorialCambios.objects.create(
            tipo=tipo,
            proyecto_ID=instance,
            usuario=self.request.user,
            razon=str(self.request.data.get('razon', '')).strip(),
            datos_anteriores=anterior,
            datos_nuevos=nuevo,
        )


class ProyectosTiposViewSet(ModelViewSet):
    serializer_class = ProyectosTiposSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        return Proyectos_tipos.objects.filter(
            proyecto__in=authz.proyectos_visibles(self.request.user).values('pk')
        )

    def perform_create(self, serializer):
        if not authz.puede_editar(self.request.user, serializer.validated_data['proyecto']):
            raise PermissionDenied('No tiene permisos para modificar este proyecto.')
        serializer.save()

    def perform_destroy(self, instance):
        if not authz.puede_editar(self.request.user, instance.proyecto):
            raise PermissionDenied('No tiene permisos para modificar este proyecto.')
        instance.delete()


class ProjectImageViewSet(ModelViewSet):
    queryset = ProjectImage.objects.all()
    serializer_class = ProjectImageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        queryset = super().get_queryset().filter(
            proyecto__in=authz.proyectos_visibles(self.request.user).values('pk')
        )
        proyecto_ID = self.request.query_params.get('proyecto_ID')
        if proyecto_ID:
            queryset = queryset.filter(proyecto_id=proyecto_ID)
        return queryset

    def create(self, request, *args, **kwargs):
        file = request.FILES.get('image')
        proyecto_id = request.data.get('proyecto_ID')

        if not file:
            return Response({'error': 'No se proporcionó ninguna imagen.'}, status=status.HTTP_400_BAD_REQUEST)
        if not proyecto_id:
            return Response({'error': 'proyecto_ID es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        proyecto = authz.proyectos_visibles(request.user).filter(pk=proyecto_id).first()
        if proyecto is None:
            return Response({'error': 'Proyecto no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not authz.puede(request.user, 'fotos.subir', proyecto):
            raise PermissionDenied('No tiene permisos para subir imágenes a este proyecto.')
        error = error_de_imagen(file)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        result = subir_imagen(file, 'munimanagement/proyectos')
        image = ProjectImage.objects.create(
            proyecto_id=proyecto_id,
            url=result['secure_url'],
            public_id=result['public_id'],
        )
        return Response(ProjectImageSerializer(image).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not authz.puede(request.user, 'fotos.subir', instance.proyecto):
            raise PermissionDenied('No tiene permisos para borrar esta imagen.')
        borrar_imagen(instance.public_id)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RolProyectoViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    """Roles de proyecto: los lee cualquiera con sesión; los edita quien gestiona roles y permisos."""
    queryset = RolProyecto.objects.all()
    serializer_class = RolProyectoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    mensaje_protegido = 'No se puede borrar: hay personas con este rol en algún proyecto.'

    def _exigir_gestion(self):
        if not authz.puede(self.request.user, 'roles.gestionar'):
            raise PermissionDenied('Solo quien gestiona roles y permisos puede cambiar los roles de proyecto.')

    def perform_create(self, serializer):
        self._exigir_gestion()
        serializer.save(is_system=False)

    def perform_update(self, serializer):
        self._exigir_gestion()
        if serializer.instance.is_system and 'nombre' in serializer.validated_data and serializer.validated_data['nombre'] != serializer.instance.nombre:
            raise ValidationError({'nombre': 'Los roles del sistema no se renombran.'})
        serializer.save()

    def perform_destroy(self, instance):
        self._exigir_gestion()
        if instance.is_system:
            raise ValidationError('Los roles del sistema no se borran.')
        super().perform_destroy(instance)


class MiembroProyectoViewSet(ModelViewSet):
    """El equipo de un proyecto: quién, con qué rol y hasta cuándo. Reemplaza a las delegaciones."""
    serializer_class = MiembroProyectoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = MiembroProyecto.objects.select_related('usuario__role', 'rol', 'otorgado_por', 'proyecto').filter(
            proyecto__in=authz.proyectos_visibles(self.request.user).values('pk')
        )
        p = self.request.query_params
        if p.get('proyecto_ID'):
            qs = qs.filter(proyecto_id=p['proyecto_ID'])
        if p.get('vigentes') in ('1', 'true'):
            qs = qs.filter(authz.membresia_vigente())
        return qs

    def _exigir_gestion(self, proyecto):
        if not authz.puede_delegar(self.request.user, proyecto):
            raise PermissionDenied('No tiene permisos para gestionar el equipo de este proyecto.')

    def perform_create(self, serializer):
        datos = serializer.validated_data
        proyecto, persona = datos['proyecto'], datos['usuario']
        self._exigir_gestion(proyecto)
        if persona.pk == self.request.user.pk:
            raise ValidationError({'usuario': 'No puede agregarse a sí mismo al equipo.'})
        if not authz.usuarios_visibles(self.request.user).filter(pk=persona.pk).exists():
            raise ValidationError({'usuario': 'Solo puede agregar personas de su dirección o departamento.'})
        if not authz.puede(persona, 'equipo.integrar'):
            raise ValidationError({'usuario': 'El rol de esta persona no le permite integrar equipos de otros.'})
        if MiembroProyecto.objects.filter(authz.membresia_vigente(), proyecto=proyecto, usuario=persona).exists():
            raise ValidationError({'usuario': 'Esta persona ya está en el equipo. Cambie su rol o su vigencia.'})
        instance = serializer.save(otorgado_por=self.request.user)
        hasta = f' hasta el {instance.hasta:%d/%m/%Y}' if instance.hasta else ''
        notificar(
            [persona], self.request.user, 'delegacion',
            f'Lo agregaron al equipo de "{nombre(proyecto.name)}"',
            f'{self.request.user.first_name} {self.request.user.last_name} le dio el rol {instance.rol.nombre}{hasta}.',
            f'/projects/{proyecto.proyect_ID}',
        )

    def perform_update(self, serializer):
        miembro = serializer.instance
        self._exigir_gestion(miembro.proyecto)
        for campo in ('proyecto', 'usuario'):
            if campo in serializer.validated_data and serializer.validated_data[campo] != getattr(miembro, campo):
                raise ValidationError({campo: 'No se puede cambiar: quite a la persona y agréguela de nuevo.'})
        serializer.save()

    def perform_destroy(self, instance):
        # No se borra: queda revocada, con quién y cuándo, para la auditoría.
        from django.utils import timezone
        self._exigir_gestion(instance.proyecto)
        instance.activo = False
        instance.revocado_en = timezone.now()
        instance.revocado_por = self.request.user
        instance.save(update_fields=['activo', 'revocado_en', 'revocado_por'])


class AjustePresupuestoViewSet(ModelViewSet):
    serializer_class = AjustePresupuestoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        qs = AjustePresupuesto.objects.select_related(
            'usuario', 'proyecto__departamento_ID__direccion', 'tarea__proyecto_ID__departamento_ID__direccion'
        )
        proyecto_ID = self.request.query_params.get('proyecto_ID')
        tarea_ID = self.request.query_params.get('tarea_ID')
        if proyecto_ID:
            qs = qs.filter(proyecto_id=proyecto_ID)
        if tarea_ID:
            qs = qs.filter(tarea_id=tarea_ID)
        if authz.tiene_vision_global(user):
            return qs
        visibles = authz.proyectos_visibles(user).values('pk')
        return qs.filter(Q(proyecto__in=visibles) | Q(tarea__proyecto_ID__in=visibles))

    def _proyecto_objetivo(self, ajuste):
        return ajuste.proyecto or (ajuste.tarea.proyecto_ID if ajuste.tarea else None)

    def perform_create(self, serializer):
        proyecto = serializer.validated_data.get('proyecto')
        tarea = serializer.validated_data.get('tarea')
        if not proyecto and tarea:
            proyecto = tarea.proyecto_ID
        if not proyecto:
            raise ValidationError('Debe indicar un proyecto o una tarea.')
        if not authz.puede(self.request.user, 'presupuesto.ajustar', proyecto):
            raise PermissionDenied('No tiene permisos para registrar ajustes en este proyecto.')

        instance = serializer.save(usuario=self.request.user)
        HistorialCambios.objects.create(
            tipo='solicitud_presupuesto',
            proyecto_ID=proyecto,
            tarea_ID=str(instance.tarea.tareas_ID) if instance.tarea else '',
            usuario=self.request.user,
            razon=instance.motivo,
            datos_anteriores={'monto': 0},
            datos_nuevos={'tipo': instance.tipo, 'monto': instance.monto},
        )
        if proyecto.user_ID_id and proyecto.user_ID_id != self.request.user.user_ID:
            Notificacion.objects.create(
                usuario=proyecto.user_ID,
                tipo='ajuste_presupuesto',
                titulo=f'Ajuste de presupuesto en "{proyecto.name}"',
                mensaje=f'{self.request.user.first_name} registró un {instance.get_tipo_display().lower()} de {Configuracion.actual().monto(instance.monto)}.',
                link=f'/projects/{proyecto.proyect_ID}',
                clave_dedupe=f'ajuste-{instance.ajuste_ID}',
            )

    def perform_destroy(self, instance):
        proyecto = self._proyecto_objetivo(instance)
        if proyecto and not authz.puede(self.request.user, 'presupuesto.ajustar', proyecto):
            raise PermissionDenied('No puede borrar ajustes de un proyecto que no gestiona.')
        instance.delete()


class DocumentoProyectoViewSet(ModelViewSet):
    """Documentos del proyecto o de una tarea (PDF, Office o imagen, hasta 10 MB), con su categoría.
    Los sube y borra quien puede subir fotos, o quien trabaja en la tarea; su autor también los borra."""

    serializer_class = DocumentoProyectoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    pagination_class = None

    def get_queryset(self):
        qs = DocumentoProyecto.objects.filter(
            proyecto__in=authz.proyectos_visibles(self.request.user).values('pk')
        ).select_related('subido_por', 'tarea')
        p = self.request.query_params
        if p.get('proyecto'):
            qs = qs.filter(proyecto=p['proyecto'])
        if p.get('tarea'):
            qs = qs.filter(tarea=p['tarea'])
        elif p.get('solo_proyecto') in ('1', 'true'):
            qs = qs.filter(tarea__isnull=True)
        return qs

    def _puede(self, proyecto, tarea):
        from Task.views import trabaja_en
        user = self.request.user
        return authz.puede(user, 'fotos.subir', proyecto) or (tarea is not None and trabaja_en(user, tarea))

    def create(self, request, *args, **kwargs):
        from Task.models import Tareas
        archivo = request.FILES.get('archivo')
        if not archivo:
            raise ValidationError({'archivo': 'Elija el archivo.'})
        tarea = Tareas.objects.filter(pk=request.data.get('tarea')).select_related('proyecto_ID').first() if request.data.get('tarea') else None
        proyecto = tarea.proyecto_ID if tarea else Proyectos.objects.filter(pk=request.data.get('proyecto')).first()
        if proyecto is None or not authz.puede_ver(request.user, proyecto):
            raise ValidationError({'proyecto': 'Proyecto no encontrado.'})
        if not self._puede(proyecto, tarea):
            raise PermissionDenied('No tiene permisos para subir documentos aquí.')
        tipo = request.data.get('tipo', 'otro')
        if tipo not in dict(DocumentoProyecto.TIPOS):
            raise ValidationError({'tipo': 'Elija una categoría.'})
        error = error_de_documento(archivo)
        if error:
            raise ValidationError({'archivo': error})
        subido = subir_documento(archivo, f'munimanagement/proyectos/{proyecto.pk}')
        nombre_doc = (str(request.data.get('nombre', '')).strip() or archivo.name or 'Documento')[:120]
        documento = DocumentoProyecto.objects.create(
            proyecto=proyecto, tarea=tarea, tipo=tipo, nombre=nombre_doc,
            url=subido['secure_url'], public_id=subido['public_id'], subido_por=request.user,
        )
        return Response(DocumentoProyectoSerializer(documento).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        if instance.subido_por_id != self.request.user.pk and not self._puede(instance.proyecto, instance.tarea):
            raise PermissionDenied('No tiene permisos para borrar este documento.')
        if instance.tipo == 'acta' and instance.cierre_id and instance.cierre.reabierto_en is None:
            raise PermissionDenied('El acta de cierre no se borra mientras el cierre esté vigente.')
        borrar_imagen(instance.public_id)
        instance.delete()

