from MuniServer.subidas import borrar_imagen, error_de_imagen, subir_imagen
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework import status
from django.db.models import Prefetch, Q

from .models import (
    Estado, Prioridad, Tipos, Proyectos, Proyectos_tipos, ProjectImage,
    DelegacionSupervision, AjustePresupuesto,
)
from .serializers import (
    EstadoSerializer, PrioridadSerializer, TiposSerializer,
    ProyectosTiposSerializer, ProyectosReadSerializer, ProyectosWriteSerializer,
    ProjectImageSerializer, DelegacionSupervisionSerializer, AjustePresupuestoSerializer,
)
from .permissions import SystemRecordReadOnly, CatalogoSoloAdministrador
from . import authz, consultas
from MuniServer.borrado import ProtegidoAlBorrarMixin
from Historial.models import HistorialCambios
from Notifications.models import Notificacion
from Notifications.servicios import interesados_del_proyecto, nombre, notificar


ESTADOS_REQUIEREN_MOTIVO = {'Cancelado', 'Pausado'}


def _proyectos_visibles_qs(user):
    """Proyectos que el usuario puede ver (queryset filtrado, no list)."""
    return authz.proyectos_visibles(user).select_related(
        'departamento_ID__direccion', 'estado_ID', 'prioridad_ID', 'user_ID'
    ).prefetch_related('images', 'ajustes_presupuesto', 'proyectos_tipos_set__tipo')


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
    queryset = Tipos.objects.all()
    serializer_class = TiposSerializer
    pagination_class = None
    permission_classes = [IsAuthenticated, CatalogoSoloAdministrador]
    mensaje_protegido = 'No se puede borrar: hay proyectos de este tipo.'


class ProyectosReadViewSet(ModelViewSet):
    serializer_class = ProyectosReadSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'head', 'options']

    def get_queryset(self):
        p = self.request.query_params
        qs = consultas.filtrar(_proyectos_visibles_qs(self.request.user), p, self.request.user)
        return consultas.ordenar(qs, p)

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Totales para el dashboard, el menú y los reportes, con los mismos filtros que la lista."""
        qs = consultas.filtrar(authz.proyectos_visibles(request.user), request.query_params, request.user)
        return Response(consultas.resumen(qs))


class ProyectosWriteViewSet(ModelViewSet):
    serializer_class = ProyectosWriteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return authz.proyectos_visibles(self.request.user)

    def get_object(self):
        obj = super().get_object()
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            if not authz.puede_ver(self.request.user, obj):
                raise PermissionDenied('No tiene acceso a este proyecto.')
        else:
            if not authz.puede_editar(self.request.user, obj):
                raise PermissionDenied('No tiene permisos para modificar este proyecto.')
        return obj

    def perform_create(self, serializer):
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
            if nuevo_estado and nuevo_estado.name in ESTADOS_REQUIEREN_MOTIVO:
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

    def perform_destroy(self, instance):
        if not authz.puede_editar(self.request.user, instance):
            raise PermissionDenied('No tiene permisos para eliminar este proyecto.')
        datos = {'proyect_ID': str(instance.proyect_ID), 'name': instance.name}
        instance.delete()
        # Queda sin proyecto (ya no existe), pero conserva quién y qué se borró.
        HistorialCambios.objects.create(tipo='eliminacion', usuario=self.request.user, datos_anteriores=datos)


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
        if not authz.puede_editar(request.user, proyecto):
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
        if not authz.puede_editar(request.user, instance.proyecto):
            raise PermissionDenied('No tiene permisos para borrar esta imagen.')
        borrar_imagen(instance.public_id)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DelegacionSupervisionViewSet(ModelViewSet):
    serializer_class = DelegacionSupervisionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = DelegacionSupervision.objects.select_related(
            'supervisor', 'otorgado_por', 'proyecto__departamento_ID__direccion'
        )
        proyecto_ID = self.request.query_params.get('proyecto_ID')
        if proyecto_ID:
            qs = qs.filter(proyecto_id=proyecto_ID)
        if authz.tiene_vision_global(user):
            return qs
        return qs.filter(
            Q(proyecto__user_ID=user)
            | Q(proyecto__departamento_ID__jefe=user)
            | Q(proyecto__departamento_ID__direccion__jefe=user)
            | Q(supervisor=user)
            | Q(otorgado_por=user)
        ).distinct()

    def _check_can_manage(self, proyecto):
        if not authz.puede_delegar(self.request.user, proyecto):
            raise PermissionDenied('No tiene permisos para gestionar la supervisión de este proyecto.')

    def perform_create(self, serializer):
        proyecto = serializer.validated_data['proyecto']
        supervisor = serializer.validated_data['supervisor']
        self._check_can_manage(proyecto)
        if supervisor.user_ID == self.request.user.user_ID:
            raise ValidationError({'supervisor': 'No puede delegar la supervisión en su propia cuenta.'})
        if not authz.usuarios_visibles(self.request.user).filter(pk=supervisor.pk).exists():
            raise ValidationError({'supervisor': 'Solo puede delegar en personas de su dirección o departamento.'})
        rol = getattr(getattr(supervisor, 'role', None), 'name', '')
        flag_ok = getattr(getattr(supervisor, 'role', None), 'puede_recibir_delegacion', False)
        if not flag_ok and rol not in {'Coordinador', 'Funcionario', 'Jefe de Departamento', 'Jefe de Dirección'}:
            raise ValidationError({'supervisor': 'Este usuario no puede recibir delegaciones.'})
        instance = serializer.save(otorgado_por=self.request.user)
        Notificacion.objects.create(
            usuario=instance.supervisor,
            tipo='delegacion',
            titulo=f'Se le delegó la supervisión del proyecto "{proyecto.name}"',
            mensaje=f'{self.request.user.first_name} {self.request.user.last_name} le asignó la supervisión.',
            link=f'/projects/{proyecto.proyect_ID}',
            clave_dedupe=f'delegacion-{instance.delegacion_ID}',
        )

    def perform_update(self, serializer):
        delegacion = serializer.instance
        self._check_can_manage(delegacion.proyecto)
        for campo in ('proyecto', 'supervisor'):
            if campo in serializer.validated_data and serializer.validated_data[campo] != getattr(delegacion, campo):
                raise ValidationError({campo: 'No se puede cambiar; revoca la delegación y crea otra.'})
        serializer.save()

    def perform_destroy(self, instance):
        self._check_can_manage(instance.proyecto)
        instance.delete()


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
        if not authz.puede_editar(self.request.user, proyecto):
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
                mensaje=f'{self.request.user.first_name} registró un {instance.get_tipo_display().lower()} de ₡{instance.monto:,}.',
                link=f'/projects/{proyecto.proyect_ID}',
                clave_dedupe=f'ajuste-{instance.ajuste_ID}',
            )

    def perform_destroy(self, instance):
        proyecto = self._proyecto_objetivo(instance)
        if proyecto and not authz.puede_editar(self.request.user, proyecto):
            raise PermissionDenied('No puede borrar ajustes de un proyecto que no gestiona.')
        instance.delete()
