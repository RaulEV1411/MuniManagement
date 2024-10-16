from rest_framework.viewsets import ModelViewSet
from .models import Estado, Prioridad, Tipos, Proyectos, Proyectos_tipos
from .serializers import EstadoSerializer, PrioridadSerializer, TiposSerializer, ProyectosSerializer, ProyectosTiposSerializer

class EstadoViewSet(ModelViewSet):
    queryset = Estado.objects.all()
    serializer_class = EstadoSerializer

class PrioridadViewSet(ModelViewSet):
    queryset = Prioridad.objects.all()
    serializer_class = PrioridadSerializer

class TiposViewSet(ModelViewSet):
    queryset = Tipos.objects.all()
    serializer_class = TiposSerializer

class ProyectosViewSet(ModelViewSet):
    queryset = Proyectos.objects.select_related('departamento_ID', 'estado_ID', 'prioridad_ID', 'user_ID').all()
    serializer_class = ProyectosSerializer

class ProyectosTiposViewSet(ModelViewSet):
    queryset = Proyectos_tipos.objects.all()
    serializer_class = ProyectosTiposSerializer
