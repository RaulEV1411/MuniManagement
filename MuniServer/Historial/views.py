from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.permissions import IsAuthenticated
from Projects import authz
from .models import HistorialCambios
from .serializers import HistorialCambiosSerializer


class HistorialCambiosViewSet(ReadOnlyModelViewSet):
    """Solo lectura: el historial lo escribe el servidor al editar proyectos, tareas y presupuesto."""

    queryset = HistorialCambios.objects.select_related('usuario').all()
    serializer_class = HistorialCambiosSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset().filter(
            proyecto_ID__in=authz.proyectos_visibles(self.request.user).values('pk')
        )
        proyecto_ID = self.request.query_params.get('proyecto_ID')
        if proyecto_ID:
            queryset = queryset.filter(proyecto_ID=proyecto_ID)
        return queryset
