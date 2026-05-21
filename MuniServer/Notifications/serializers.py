from rest_framework.serializers import ModelSerializer
from .models import Notificacion


class NotificacionSerializer(ModelSerializer):
    class Meta:
        model = Notificacion
        fields = [
            'notificacion_ID', 'usuario', 'tipo', 'titulo', 'mensaje',
            'link', 'leida', 'created_at',
        ]
        read_only_fields = [
            'notificacion_ID', 'usuario', 'tipo', 'titulo', 'mensaje',
            'link', 'created_at',
        ]
