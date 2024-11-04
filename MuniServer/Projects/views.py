from rest_framework.viewsets import ModelViewSet
from .models import Estado, Prioridad, Tipos, Proyectos, Proyectos_tipos
from .serializers import EstadoSerializer, PrioridadSerializer, TiposSerializer, ProyectosTiposSerializer, ProyectosReadSerializer,ProyectosWriteSerializer
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.authentication import JWTAuthentication

class EstadoViewSet(ModelViewSet):
    queryset = Estado.objects.all()
    serializer_class = EstadoSerializer

class PrioridadViewSet(ModelViewSet):
    queryset = Prioridad.objects.all()
    serializer_class = PrioridadSerializer

class TiposViewSet(ModelViewSet):
    queryset = Tipos.objects.all()
    serializer_class = TiposSerializer

class ProyectosReadViewSet(ModelViewSet):
    queryset = Proyectos.objects.select_related('departamento_ID', 'estado_ID', 'prioridad_ID', 'user_ID').all()
    serializer_class = ProyectosReadSerializer
    authentication_classes = [JWTAuthentication]  # Añadir autenticación
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user_ID = self.request.query_params.get('user_ID')  # Obtiene el parámetro user_ID de los query params

        if user_ID:
            queryset = queryset.filter(user_ID=user_ID)

        return queryset

class ProyectosWriteViewSet(ModelViewSet):
    queryset = Proyectos.objects.select_related('departamento_ID', 'estado_ID', 'prioridad_ID', 'user_ID').all()
    serializer_class = ProyectosWriteSerializer
    authentication_classes = [JWTAuthentication]  # Añadir autenticación
    permission_classes = [IsAuthenticated]

class ProyectosTiposViewSet(ModelViewSet):
    queryset = Proyectos_tipos.objects.all()
    serializer_class = ProyectosTiposSerializer