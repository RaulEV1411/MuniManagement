from rest_framework.serializers import ModelSerializer
from .models import Roles, Users

class RolesSerializer(ModelSerializer):
    class Meta:
        model = Roles
        fields = '__all__'

class UsersSerializer(ModelSerializer):
    class Meta:
        model = Users
        fields = '__all__'