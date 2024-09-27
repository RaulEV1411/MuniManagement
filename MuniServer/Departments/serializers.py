from rest_framework.serializers import ModelSerializer
from .models import Direccion, Departamentos

class DireccionSerializer(ModelSerializer):
    class Meta:
        model = Direccion
        fields = '__all__'

class DepartamentosSerializer(ModelSerializer):
    class Meta:
        model = Departamentos
        fields = '__all__'