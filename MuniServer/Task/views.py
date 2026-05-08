import cloudinary.uploader
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Tareas, TaskImage
from .serializers import TareasReadSerializer, TareasWriteSerializer, TaskImageSerializer
from Historial.models import HistorialCambios


class TareasViewSet(ModelViewSet):
    queryset = Tareas.objects.prefetch_related('images').select_related('asignado_a').all()
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TareasWriteSerializer
        return TareasReadSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        proyecto_ID = self.request.query_params.get('proyecto_ID')
        if proyecto_ID:
            queryset = queryset.filter(proyecto_ID=proyecto_ID)
        return queryset

    def perform_update(self, serializer):
        prev = self.get_object()
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
        if anterior['estado_ID'] != nuevo['estado_ID']:
            tipo = 'cambio_estado_tarea'
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

    def get_queryset(self):
        queryset = super().get_queryset()
        tarea_ID = self.request.query_params.get('tarea_ID')
        if tarea_ID:
            queryset = queryset.filter(tarea_ID=tarea_ID)
        return queryset

    def create(self, request, *args, **kwargs):
        file = request.FILES.get('image')
        tarea_id = request.data.get('tarea_ID')

        if not file:
            return Response({'error': 'No se proporcionó ninguna imagen.'}, status=status.HTTP_400_BAD_REQUEST)
        if not tarea_id:
            return Response({'error': 'tarea_ID es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        result = cloudinary.uploader.upload(file, folder='munimanagement/tareas')
        image = TaskImage.objects.create(
            tarea_id=tarea_id,
            url=result['secure_url'],
            public_id=result['public_id'],
        )
        return Response(TaskImageSerializer(image).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        cloudinary.uploader.destroy(instance.public_id)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
