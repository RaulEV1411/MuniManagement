from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, BasePermission, SAFE_METHODS
from Projects import authz
from MuniServer.borrado import ProtegidoAlBorrarMixin
from .models import Direccion, Departamentos
from .serializers import DireccionSerializer, DepartamentosSerializer


class EscrituraSoloAlcaldia(BasePermission):
    """Todos leen; crean, editan, borran y nombran jefes quienes tienen estructura.gestionar."""

    message = 'No tiene permisos para modificar direcciones y departamentos.'

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or authz.puede(request.user, 'estructura.gestionar')


class DireccionViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    queryset = Direccion.objects.all()
    serializer_class = DireccionSerializer
    permission_classes = [IsAuthenticated, EscrituraSoloAlcaldia]
    pagination_class = None


class DepartamentosViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    queryset = Departamentos.objects.all()
    serializer_class = DepartamentosSerializer
    permission_classes = [IsAuthenticated, EscrituraSoloAlcaldia]
    pagination_class = None
