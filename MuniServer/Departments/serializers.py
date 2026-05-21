from rest_framework.serializers import ModelSerializer
from .models import Direccion, Departamentos


class DireccionSerializer(ModelSerializer):
    class Meta:
        model = Direccion
        fields = ['direccion_ID', 'name', 'jefe']


class DepartamentosSerializer(ModelSerializer):
    class Meta:
        model = Departamentos
        fields = ['departamentos_ID', 'name', 'direccion', 'jefe']
