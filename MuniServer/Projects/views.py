import cloudinary.uploader
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Estado, Prioridad, Tipos, Proyectos, Proyectos_tipos, ProjectImage
from .serializers import (
    EstadoSerializer, PrioridadSerializer, TiposSerializer,
    ProyectosTiposSerializer, ProyectosReadSerializer, ProyectosWriteSerializer,
    ProjectImageSerializer,
)
from Historial.models import HistorialCambios


class EstadoViewSet(ModelViewSet):
    queryset = Estado.objects.all()
    serializer_class = EstadoSerializer
    permission_classes = [IsAuthenticated]


class PrioridadViewSet(ModelViewSet):
    queryset = Prioridad.objects.all()
    serializer_class = PrioridadSerializer
    permission_classes = [IsAuthenticated]


class TiposViewSet(ModelViewSet):
    queryset = Tipos.objects.all()
    serializer_class = TiposSerializer
    permission_classes = [IsAuthenticated]


class ProyectosReadViewSet(ModelViewSet):
    queryset = Proyectos.objects.select_related('departamento_ID', 'estado_ID', 'prioridad_ID', 'user_ID').prefetch_related('images').all()
    serializer_class = ProyectosReadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user_ID = self.request.query_params.get('user_ID')
        if user_ID:
            queryset = queryset.filter(user_ID=user_ID)
        return queryset


class ProyectosWriteViewSet(ModelViewSet):
    queryset = Proyectos.objects.all()
    serializer_class = ProyectosWriteSerializer
    permission_classes = [IsAuthenticated]

    def perform_update(self, serializer):
        prev = self.get_object()
        prev_estado_id   = str(prev.estado_ID_id)
        prev_fecha       = str(prev.fecha_entrega)
        prev_costo       = prev.costo
        anterior = {
            'estado_ID': prev_estado_id,
            'fecha_entrega': prev_fecha,
            'costo': str(prev_costo),
            'name': prev.name,
            'descripcion': prev.descripcion,
        }
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
            try:
                estado_name = Estado.objects.get(pk=instance.estado_ID_id).name
            except Estado.DoesNotExist:
                estado_name = ''
            tipo = 'cancelacion' if 'Cancelad' in estado_name else 'cambio_estado_proyecto'
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
            razon=self.request.data.get('razon', ''),
            datos_anteriores=anterior,
            datos_nuevos=nuevo,
        )


class ProyectosTiposViewSet(ModelViewSet):
    queryset = Proyectos_tipos.objects.all()
    serializer_class = ProyectosTiposSerializer
    permission_classes = [IsAuthenticated]


class ProjectImageViewSet(ModelViewSet):
    queryset = ProjectImage.objects.all()
    serializer_class = ProjectImageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        proyecto_ID = self.request.query_params.get('proyecto_ID')
        if proyecto_ID:
            queryset = queryset.filter(proyecto_ID=proyecto_ID)
        return queryset

    def create(self, request, *args, **kwargs):
        file = request.FILES.get('image')
        proyecto_id = request.data.get('proyecto_ID')

        if not file:
            return Response({'error': 'No se proporcionó ninguna imagen.'}, status=status.HTTP_400_BAD_REQUEST)
        if not proyecto_id:
            return Response({'error': 'proyecto_ID es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        result = cloudinary.uploader.upload(file, folder='munimanagement/proyectos')
        image = ProjectImage.objects.create(
            proyecto_id=proyecto_id,
            url=result['secure_url'],
            public_id=result['public_id'],
        )
        return Response(ProjectImageSerializer(image).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        cloudinary.uploader.destroy(instance.public_id)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
