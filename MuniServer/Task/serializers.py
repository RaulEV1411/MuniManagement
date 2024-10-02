from rest_framework.serializers import ModelSerializer
from .models import Tareas

class TareasSerializer(ModelSerializer):
    class Meta:
        model = Tareas
        fields = '__all__'