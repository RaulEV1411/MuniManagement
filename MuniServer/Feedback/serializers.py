from rest_framework.serializers import ModelSerializer
from .models import Feedback
from Users.serializers import UsuarioResumenSerializer


class FeedbackWriteSerializer(ModelSerializer):
    class Meta:
        model = Feedback
        fields = '__all__'
        read_only_fields = ['user_ID', 'created_at']


class FeedbackReadSerializer(ModelSerializer):
    user_ID = UsuarioResumenSerializer(read_only=True)

    class Meta:
        model = Feedback
        fields = '__all__'
