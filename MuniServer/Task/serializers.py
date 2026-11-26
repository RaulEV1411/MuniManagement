from rest_framework.serializers import ModelSerializer
from .models import Tareas, TaskImage
from Users.serializers import UsuarioResumenSerializer
from Projects.serializers import EstadoSerializer, PrioridadSerializer


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
    # El front agrupa y colorea por estado y prioridad: los necesita como objetos, no como ids.
    estado_ID = EstadoSerializer(read_only=True)
    prioridad_ID = PrioridadSerializer(read_only=True)

    class Meta:
        model = Tareas
        fields = '__all__'
