from rest_framework.serializers import ModelSerializer
from .models import Feedback
from Users.serializers import UsersSerializer


class FeedbackWriteSerializer(ModelSerializer):
    class Meta:
        model = Feedback
        fields = '__all__'


class FeedbackReadSerializer(ModelSerializer):
    user_ID = UsersSerializer(read_only=True)

    class Meta:
        model = Feedback
        fields = '__all__'
