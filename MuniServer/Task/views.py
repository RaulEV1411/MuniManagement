from MuniServer.subidas import borrar_imagen, error_de_imagen, subir_imagen
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Q
from django.utils import timezone
from MuniServer.borrado import ProtegidoAlBorrarMixin
from .models import AsignacionRecurso, ChecklistItem, ComentarioTarea, Recurso, Tareas, TaskImage
from .serializers import (
    AsignacionRecursoSerializer, ChecklistItemSerializer, ComentarioTareaSerializer, RecursoSerializer,
    TareasReadSerializer, TareasWriteSerializer, TaskImageSerializer,
)
from Historial.models import HistorialCambios
from Projects import authz
from Notifications.servicios import nombre, notificar

def _exigir_abierto(proyecto):
    if authz.esta_cerrado(proyecto):
        raise PermissionDenied('El proyecto está cerrado: reábralo para cambiar sus tareas.')


# Quien responde por la tarea o colabora en ella, sin poder editar el proyecto, solo cambia su estado,
# su avance y sus horas reales (y tacha la lista de verificación).
CAMPOS_DEL_ASIGNADO = {'estado_ID', 'avance', 'horas_reales'}


def trabaja_en(user, tarea):
    return tarea.asignado_a_id == user.pk or tarea.colaboradores.filter(pk=user.pk).exists()


def _exigir_colaboradores_visibles(user, colaboradores):
    if colaboradores and authz.usuarios_visibles(user).filter(pk__in=[c.pk for c in colaboradores]).count() != len(set(colaboradores)):
        raise ValidationError({'colaboradores': 'Elija colaboradores de su alcance.'})


def _exigir_desbloqueada(tarea, estado):
    # Terminarla espera a las que la bloquean; cancelarla, no.
    if estado is not None and estado.categoria == 'finalizado' and estado.name != 'Cancelado':
        abiertas = [b.name for b in tarea.bloqueada_por.all() if b.estado_ID.categoria != 'finalizado']
        if abiertas:
            raise ValidationError({'estado_ID': f'Primero hay que terminar: {", ".join(abiertas)}.'})


def _puede_gestionar_imagenes(user, tarea):
    return tarea.asignado_a_id == user.user_ID or authz.puede(user, 'fotos.subir', tarea.proyecto_ID)


class TareasViewSet(ModelViewSet):
    queryset = Tareas.objects.prefetch_related(
        'images', 'colaboradores', 'bloqueada_por__estado_ID', 'checklist__hecho_por', 'recursos__recurso', 'documentos', 'comentarios',
    ).select_related('asignado_a', 'estado_ID', 'prioridad_ID', 'proyecto_ID').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TareasWriteSerializer
        return TareasReadSerializer

    def get_queryset(self):
        queryset = super().get_queryset().filter(
            proyecto_ID__in=authz.proyectos_visibles(self.request.user).values('pk')
        )
        p = self.request.query_params
        proyecto_ID = p.get('proyecto_ID')
        if proyecto_ID:
            queryset = queryset.filter(proyecto_ID=proyecto_ID)
        # «Mis tareas»: las asignadas y aquellas en que colabora, en todos los proyectos que ve.
        if p.get('mias') in ('1', 'true'):
            u = self.request.user
            queryset = queryset.filter(Q(asignado_a=u) | Q(colaboradores=u)).distinct()
            if p.get('abiertas') in ('1', 'true'):
                # Tampoco las de proyectos cerrados o archivados: no se pueden tocar hasta reabrirlos.
                queryset = queryset.exclude(estado_ID__categoria='finalizado').exclude(
                    proyecto_ID__estado_ID__categoria='finalizado').exclude(proyecto_ID__archivado=True)
            queryset = queryset.order_by('fecha_entrega', 'name', 'pk')
        return queryset

    def perform_create(self, serializer):
        _exigir_abierto(serializer.validated_data['proyecto_ID'])
        if not authz.puede(self.request.user, 'tareas.gestionar', serializer.validated_data['proyecto_ID']):
            raise PermissionDenied('No tiene permisos para crear tareas en este proyecto.')
        _exigir_colaboradores_visibles(self.request.user, serializer.validated_data.get('colaboradores'))
        tarea = serializer.save()
        HistorialCambios.objects.create(
            tipo='creacion', proyecto_ID_id=tarea.proyecto_ID_id, tarea_ID=str(tarea.tareas_ID),
            usuario=self.request.user, datos_nuevos={'name': tarea.name, 'fecha_entrega': str(tarea.fecha_entrega)},
        )
        self._avisar_asignacion(tarea)

    def perform_destroy(self, instance):
        _exigir_abierto(instance.proyecto_ID)
        if not authz.puede(self.request.user, 'tareas.gestionar', instance.proyecto_ID):
            raise PermissionDenied('No tiene permisos para borrar tareas de este proyecto.')
        datos = {'name': instance.name, 'tareas_ID': str(instance.tareas_ID)}
        proyecto_id = instance.proyecto_ID_id
        instance.delete()
        HistorialCambios.objects.create(
            tipo='eliminacion', proyecto_ID_id=proyecto_id, tarea_ID=datos['tareas_ID'],
            usuario=self.request.user, datos_anteriores=datos,
        )

    def _avisar_asignacion(self, tarea):
        if tarea.asignado_a_id:
            notificar(
                [tarea.asignado_a], self.request.user, 'asignacion',
                f'Le asignaron la tarea "{nombre(tarea.name)}"',
                f'En el proyecto "{nombre(tarea.proyecto_ID.name)}".',
                f'/projects/{tarea.proyecto_ID_id}',
            )

    def perform_update(self, serializer):
        prev = serializer.instance
        user = self.request.user
        nuevo_proyecto = serializer.validated_data.get('proyecto_ID', prev.proyecto_ID)
        if nuevo_proyecto.pk != prev.proyecto_ID_id:
            raise ValidationError({'proyecto_ID': 'Una tarea no se puede mover a otro proyecto.'})
        _exigir_abierto(prev.proyecto_ID)
        if not authz.puede(user, 'tareas.gestionar', prev.proyecto_ID):
            cambios = {
                campo for campo, valor in serializer.validated_data.items()
                if getattr(prev, campo) != valor
            }
            if not trabaja_en(user, prev) or not cambios <= CAMPOS_DEL_ASIGNADO:
                raise PermissionDenied('Solo puede cambiar el estado, el avance y las horas de las tareas en que trabaja.')
        _exigir_colaboradores_visibles(user, serializer.validated_data.get('colaboradores'))
        _exigir_desbloqueada(prev, serializer.validated_data.get('estado_ID'))
        anterior = {
            'estado_ID': str(prev.estado_ID_id),
            'fecha_entrega': str(prev.fecha_entrega),
            'fecha_inicio': str(prev.fecha_inicio),
            'name': prev.name,
            'descripcion': prev.descripcion,
            'asignado_a': str(prev.asignado_a_id) if prev.asignado_a_id else '',
            'prioridad_ID': str(prev.prioridad_ID_id),
        }
        instance = serializer.save()
        nuevo = {
            'estado_ID': str(instance.estado_ID_id),
            'fecha_entrega': str(instance.fecha_entrega),
            'fecha_inicio': str(instance.fecha_inicio),
            'name': instance.name,
            'descripcion': instance.descripcion,
            'asignado_a': str(instance.asignado_a_id) if instance.asignado_a_id else '',
            'prioridad_ID': str(instance.prioridad_ID_id),
        }
        if anterior['asignado_a'] != nuevo['asignado_a']:
            self._avisar_asignacion(instance)
        if anterior['estado_ID'] != nuevo['estado_ID']:
            tipo = 'cambio_estado_tarea'
            notificar(
                [instance.proyecto_ID.user_ID], self.request.user, 'cambio_estado',
                f'La tarea "{nombre(instance.name)}" pasó a {instance.estado_ID.name}',
                f'En el proyecto "{nombre(instance.proyecto_ID.name)}".',
                f'/projects/{instance.proyecto_ID_id}',
            )
        elif anterior['asignado_a'] != nuevo['asignado_a']:
            tipo = 'asignacion'
        elif anterior['fecha_entrega'] != nuevo['fecha_entrega']:
            tipo = 'ampliacion_plazo' if nuevo['fecha_entrega'] > anterior['fecha_entrega'] else 'reprogramacion'
        else:
            tipo = 'edicion_tarea'
        HistorialCambios.objects.create(
            tipo=tipo,
            proyecto_ID_id=instance.proyecto_ID_id,
            tarea_ID=str(instance.tareas_ID),
            usuario=self.request.user,
            razon=self.request.data.get('razon', ''),
            datos_anteriores=anterior,
            datos_nuevos=nuevo,
        )


class TaskImageViewSet(ModelViewSet):
    queryset = TaskImage.objects.all()
    serializer_class = TaskImageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        queryset = super().get_queryset().filter(
            tarea__proyecto_ID__in=authz.proyectos_visibles(self.request.user).values('pk')
        )
        tarea_ID = self.request.query_params.get('tarea_ID')
        if tarea_ID:
            queryset = queryset.filter(tarea=tarea_ID)
        return queryset

    def create(self, request, *args, **kwargs):
        file = request.FILES.get('image')
        tarea_id = request.data.get('tarea_ID')

        if not file:
            return Response({'error': 'No se proporcionó ninguna imagen.'}, status=status.HTTP_400_BAD_REQUEST)
        if not tarea_id:
            return Response({'error': 'tarea_ID es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        tarea = Tareas.objects.filter(pk=tarea_id).select_related('proyecto_ID').first()
        if tarea is None or not authz.puede_ver(request.user, tarea.proyecto_ID):
            return Response({'error': 'Tarea no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if not _puede_gestionar_imagenes(request.user, tarea):
            raise PermissionDenied('No tiene permisos para subir imágenes a esta tarea.')
        error = error_de_imagen(file)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        result = subir_imagen(file, 'munimanagement/tareas')
        image = TaskImage.objects.create(
            tarea=tarea,
            url=result['secure_url'],
            public_id=result['public_id'],
        )
        return Response(TaskImageSerializer(image).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not _puede_gestionar_imagenes(request.user, instance.tarea):
            raise PermissionDenied('No tiene permisos para borrar esta imagen.')
        borrar_imagen(instance.public_id)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _tarea_visible(user, tarea_id):
    tarea = Tareas.objects.filter(pk=tarea_id).select_related('proyecto_ID__estado_ID').first() if tarea_id else None
    if tarea is None or not authz.puede_ver(user, tarea.proyecto_ID):
        raise ValidationError({'tarea': 'Tarea no encontrada.'})
    return tarea


class ChecklistViewSet(ModelViewSet):
    """Lista de verificación: la arma quien gestiona las tareas; la tacha también quien trabaja en la tarea."""

    serializer_class = ChecklistItemSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = ChecklistItem.objects.filter(
            tarea__proyecto_ID__in=authz.proyectos_visibles(self.request.user).values('pk')
        ).select_related('hecho_por', 'tarea__proyecto_ID__estado_ID')
        if self.request.query_params.get('tarea'):
            qs = qs.filter(tarea=self.request.query_params['tarea'])
        return qs

    def _gestiona(self, tarea):
        _exigir_abierto(tarea.proyecto_ID)
        return authz.puede(self.request.user, 'tareas.gestionar', tarea.proyecto_ID)

    def perform_create(self, serializer):
        tarea = _tarea_visible(self.request.user, getattr(serializer.validated_data.get('tarea'), 'pk', None))
        if not self._gestiona(tarea):
            raise PermissionDenied('No tiene permisos para cambiar la lista de esta tarea.')
        serializer.save()

    def perform_update(self, serializer):
        item = serializer.instance
        # Un paso no cambia de tarea: si no, se movería a una tarea donde no se tiene permiso.
        if 'tarea' in serializer.validated_data and serializer.validated_data['tarea'] != item.tarea:
            raise ValidationError({'tarea': 'Un paso no se mueve a otra tarea.'})
        solo_tacha = set(serializer.validated_data) <= {'hecho'}
        if not self._gestiona(item.tarea) and not (solo_tacha and trabaja_en(self.request.user, item.tarea)):
            raise PermissionDenied('Solo puede tachar los pasos de las tareas en que trabaja.')
        hecho = serializer.validated_data.get('hecho', item.hecho)
        extra = {}
        if hecho != item.hecho:
            extra = {'hecho_por': self.request.user if hecho else None, 'hecho_en': timezone.now() if hecho else None}
        serializer.save(**extra)

    def perform_destroy(self, instance):
        if not self._gestiona(instance.tarea):
            raise PermissionDenied('No tiene permisos para cambiar la lista de esta tarea.')
        instance.delete()


class ComentarioTareaViewSet(ModelViewSet):
    """Comentarios de la tarea: los escribe quien ve el proyecto; los borra su autor o quien modera."""

    serializer_class = ComentarioTareaSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    pagination_class = None

    def get_queryset(self):
        qs = ComentarioTarea.objects.filter(
            tarea__proyecto_ID__in=authz.proyectos_visibles(self.request.user).values('pk')
        ).select_related('autor', 'tarea__proyecto_ID')
        if self.request.query_params.get('tarea'):
            qs = qs.filter(tarea=self.request.query_params['tarea'])
        return qs

    def perform_create(self, serializer):
        tarea = _tarea_visible(self.request.user, getattr(serializer.validated_data.get('tarea'), 'pk', None))
        comentario = serializer.save(autor=self.request.user)
        destinatarios = [tarea.asignado_a, *tarea.colaboradores.all(), tarea.proyecto_ID.user_ID]
        notificar(
            destinatarios, self.request.user, 'comentario', f'Comentario en la tarea "{nombre(tarea.name)}"',
            comentario.texto[:200], f'/projects/{tarea.proyecto_ID_id}',
        )

    def perform_destroy(self, instance):
        if instance.autor_id != self.request.user.pk and not authz.puede(self.request.user, 'comentarios.moderar', instance.tarea.proyecto_ID):
            raise PermissionDenied('Solo puede borrar sus propios comentarios.')
        instance.delete()


class RecursoViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    """Catálogo de recursos: lo leen todos; lo edita quien gestiona los catálogos."""

    queryset = Recurso.objects.all()
    serializer_class = RecursoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method not in ('GET', 'HEAD', 'OPTIONS') and not authz.puede(request.user, 'catalogos.gestionar'):
            raise PermissionDenied('Su rol no permite editar el catálogo de recursos.')


class AsignacionRecursoViewSet(ModelViewSet):
    """Recursos de una tarea. Avisa (sin impedir) si un vehículo, máquina o equipo ya está en otra tarea en esas fechas."""

    serializer_class = AsignacionRecursoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    pagination_class = None

    def get_queryset(self):
        qs = AsignacionRecurso.objects.filter(
            tarea__proyecto_ID__in=authz.proyectos_visibles(self.request.user).values('pk')
        ).select_related('recurso', 'tarea__proyecto_ID__estado_ID')
        if self.request.query_params.get('tarea'):
            qs = qs.filter(tarea=self.request.query_params['tarea'])
        if self.request.query_params.get('recurso'):
            qs = qs.filter(recurso=self.request.query_params['recurso'])
        return qs

    def _exigir(self, tarea):
        _exigir_abierto(tarea.proyecto_ID)
        if not authz.puede(self.request.user, 'tareas.gestionar', tarea.proyecto_ID):
            raise PermissionDenied('No tiene permisos para asignar recursos en este proyecto.')

    @staticmethod
    def cruces(asignacion, user):
        """Dónde más está el recurso en esas fechas. De los proyectos que la persona no ve, no se dice el nombre."""
        if asignacion.recurso.tipo in Recurso.TIPOS_SIN_CRUCE:
            return []
        tarea = asignacion.tarea
        desde = asignacion.desde or tarea.fecha_inicio
        hasta = asignacion.hasta or tarea.fecha_entrega
        otras = AsignacionRecurso.objects.filter(recurso=asignacion.recurso).exclude(pk=asignacion.pk).select_related('tarea__proyecto_ID')
        visibles = set(authz.proyectos_visibles(user).values_list('pk', flat=True))
        return [
            f'«{o.tarea.name}» ({o.tarea.proyecto_ID.name})' if o.tarea.proyecto_ID_id in visibles else 'otra tarea de un proyecto que usted no ve'
            for o in otras
            if (o.desde or o.tarea.fecha_inicio) <= hasta and desde <= (o.hasta or o.tarea.fecha_entrega)
        ]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tarea = _tarea_visible(request.user, serializer.validated_data['tarea'].pk)
        self._exigir(tarea)
        asignacion = serializer.save()
        return Response({**self.get_serializer(asignacion).data, 'cruces': self.cruces(asignacion, request.user)}, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        self._exigir(serializer.instance.tarea)
        if 'tarea' in serializer.validated_data and serializer.validated_data['tarea'] != serializer.instance.tarea:
            raise ValidationError({'tarea': 'Una asignación no se mueve a otra tarea.'})
        serializer.save()

    def perform_destroy(self, instance):
        self._exigir(instance.tarea)
        instance.delete()

