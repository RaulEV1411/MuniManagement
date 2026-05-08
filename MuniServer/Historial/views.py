from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import HistorialCambios
from .serializers import HistorialCambiosSerializer


class HistorialCambiosViewSet(ModelViewSet):
    queryset = HistorialCambios.objects.select_related('usuario').all()
    serializer_class = HistorialCambiosSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        queryset = super().get_queryset()
        proyecto_ID = self.request.query_params.get('proyecto_ID')
        if proyecto_ID:
            queryset = queryset.filter(proyecto_ID=proyecto_ID)
        return queryset

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)
