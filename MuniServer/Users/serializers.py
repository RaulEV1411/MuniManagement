from rest_framework.serializers import ModelSerializer
from .models import Roles, Users
from django.contrib.auth.hashers import make_password

class RolesSerializer(ModelSerializer):
    class Meta:
        model = Roles
        fields = '__all__'

class UsersSerializer(ModelSerializer):
    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data['password'])
        return super(UsersSerializer, self).create(validated_data)
    class Meta:
        model = Users
        fields = '__all__'