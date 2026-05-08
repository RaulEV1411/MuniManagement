from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Direccion, Departamentos
from .serializers import DireccionSerializer, DepartamentosSerializer


class DireccionViewSet(ModelViewSet):
    queryset = Direccion.objects.all()
    serializer_class = DireccionSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]


class DepartamentosViewSet(ModelViewSet):
    queryset = Departamentos.objects.all()
    serializer_class = DepartamentosSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
