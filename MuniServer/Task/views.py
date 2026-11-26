from MuniServer.subidas import borrar_imagen, error_de_imagen, subir_imagen
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import Tareas, TaskImage
from .serializers import TareasReadSerializer, TareasWriteSerializer, TaskImageSerializer
from Historial.models import HistorialCambios
from Projects import authz
from Notifications.servicios import nombre, notificar

# Quien tiene la tarea asignada pero no puede editar el proyecto solo puede cambiarle el estado.
CAMPOS_DEL_ASIGNADO = {'estado_ID'}


def _puede_gestionar_imagenes(user, tarea):
    return tarea.asignado_a_id == user.user_ID or authz.puede(user, 'fotos.subir', tarea.proyecto_ID)


class TareasViewSet(ModelViewSet):
    queryset = Tareas.objects.prefetch_related('images').select_related('asignado_a', 'estado_ID', 'prioridad_ID').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TareasWriteSerializer
        return TareasReadSerializer

    def get_queryset(self):
        queryset = super().get_queryset().filter(
            proyecto_ID__in=authz.proyectos_visibles(self.request.user).values('pk')
        )
        proyecto_ID = self.request.query_params.get('proyecto_ID')
        if proyecto_ID:
            queryset = queryset.filter(proyecto_ID=proyecto_ID)
        return queryset

    def perform_create(self, serializer):
        if not authz.puede(self.request.user, 'tareas.gestionar', serializer.validated_data['proyecto_ID']):
            raise PermissionDenied('No tiene permisos para crear tareas en este proyecto.')
        tarea = serializer.save()
        HistorialCambios.objects.create(
            tipo='creacion', proyecto_ID_id=tarea.proyecto_ID_id, tarea_ID=str(tarea.tareas_ID),
            usuario=self.request.user, datos_nuevos={'name': tarea.name, 'fecha_entrega': str(tarea.fecha_entrega)},
        )
        self._avisar_asignacion(tarea)

    def perform_destroy(self, instance):
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
        if not authz.puede(user, 'tareas.gestionar', prev.proyecto_ID):
            cambios = {
                campo for campo, valor in serializer.validated_data.items()
                if getattr(prev, campo) != valor
            }
            if prev.asignado_a_id != user.user_ID or not cambios <= CAMPOS_DEL_ASIGNADO:
                raise PermissionDenied('Solo puede cambiar el estado de las tareas que tiene asignadas.')
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
