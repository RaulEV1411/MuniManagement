from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, BasePermission, SAFE_METHODS
from Projects import authz
from MuniServer.borrado import ProtegidoAlBorrarMixin
from .models import Direccion, Departamentos
from .serializers import DireccionSerializer, DepartamentosSerializer


class EscrituraSoloAlcaldia(BasePermission):
    """Todos leen; solo Administrador y alcaldía crean, editan o borran, y nombran jefes."""

    message = 'Solo la alcaldía o un administrador pueden modificar direcciones y departamentos.'

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or authz.tiene_vision_global(request.user)


class DireccionViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    queryset = Direccion.objects.all()
    serializer_class = DireccionSerializer
    permission_classes = [IsAuthenticated, EscrituraSoloAlcaldia]


class DepartamentosViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    queryset = Departamentos.objects.all()
    serializer_class = DepartamentosSerializer
    permission_classes = [IsAuthenticated, EscrituraSoloAlcaldia]
