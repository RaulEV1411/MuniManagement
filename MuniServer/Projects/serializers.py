from rest_framework.serializers import ModelSerializer
from .models import Estado, Prioridad, Tipos, Proyectos, Proyectos_tipos
from Departments.models import Departamentos
from Users.models import Users
from Departments.serializers import DepartamentosSerializer
from Users.serializers import UsersSerializer

class EstadoSerializer(ModelSerializer):
    class Meta:
        model = Estado
        fields = '__all__'

class PrioridadSerializer(ModelSerializer):
    class Meta:
        model = Prioridad
        fields = '__all__'

class TiposSerializer(ModelSerializer):
    class Meta:
        model = Tipos
        fields = '__all__'

class ProyectosWriteSerializer(ModelSerializer):
    class Meta:
        model = Proyectos
        fields = '__all__'

class ProyectosReadSerializer(ModelSerializer):
    departamento_ID = DepartamentosSerializer(read_only=True)
    estado_ID = EstadoSerializer(read_only=True)
    prioridad_ID = PrioridadSerializer(read_only=True)
    user_ID = UsersSerializer(read_only=True)
    
    class Meta:
        model = Proyectos
        fields = '__all__'


class ProyectosTiposSerializer(ModelSerializer):
    class Meta:
        model = Proyectos_tipos
        fields = '__all__'  