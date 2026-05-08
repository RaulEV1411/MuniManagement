from rest_framework.serializers import ModelSerializer
from .models import Estado, Prioridad, Tipos, Proyectos, Proyectos_tipos, ProjectImage
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


class ProjectImageSerializer(ModelSerializer):
    class Meta:
        model = ProjectImage
        fields = ['imagen_ID', 'url', 'public_id', 'created_at']


class ProyectosWriteSerializer(ModelSerializer):
    class Meta:
        model = Proyectos
        fields = '__all__'


class ProyectosReadSerializer(ModelSerializer):
    departamento_ID = DepartamentosSerializer(read_only=True)
    estado_ID = EstadoSerializer(read_only=True)
    prioridad_ID = PrioridadSerializer(read_only=True)
    user_ID = UsersSerializer(read_only=True)
    images = ProjectImageSerializer(many=True, read_only=True)

    class Meta:
        model = Proyectos
        fields = '__all__'


class ProyectosTiposSerializer(ModelSerializer):
    class Meta:
        model = Proyectos_tipos
        fields = '__all__'
