from rest_framework.viewsets import ModelViewSet
from .models import Direccion, Departamentos
from .serializers import DireccionSerializer, DepartamentosSerializer
from rest_framework.authentication import SessionAuthentication

class DireccionViewSet(ModelViewSet):
    queryset = Direccion.objects.all()
    serializer_class = DireccionSerializer
    authentication_classes = [SessionAuthentication]

class DepartamentosViewSet(ModelViewSet):
    queryset = Departamentos.objects.all()
    serializer_class = DepartamentosSerializer
    authentication_classes = [SessionAuthentication]