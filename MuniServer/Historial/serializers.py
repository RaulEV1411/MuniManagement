from rest_framework.serializers import ModelSerializer
from rest_framework import serializers
from .models import HistorialCambios
from Users.serializers import UsuarioResumenSerializer


class HistorialCambiosSerializer(ModelSerializer):
    usuario = UsuarioResumenSerializer(read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = HistorialCambios
        fields = [
            'historial_ID', 'tipo', 'tipo_display', 'proyecto_ID', 'tarea_ID',
            'usuario', 'razon', 'datos_anteriores', 'datos_nuevos', 'created_at',
        ]
