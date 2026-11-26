from rest_framework.serializers import ModelSerializer
from .models import Tareas, TaskImage
from Users.serializers import UsuarioResumenSerializer


class TaskImageSerializer(ModelSerializer):
    class Meta:
        model = TaskImage
        fields = ['imagen_ID', 'url', 'public_id', 'created_at']


class TareasWriteSerializer(ModelSerializer):
    class Meta:
        model = Tareas
        fields = '__all__'


class TareasReadSerializer(ModelSerializer):
    images = TaskImageSerializer(many=True, read_only=True)
    asignado_a = UsuarioResumenSerializer(read_only=True)

    class Meta:
        model = Tareas
        fields = '__all__'
