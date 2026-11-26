from rest_framework.serializers import ModelSerializer
from django.contrib.auth.hashers import make_password

from .acceso import encolar_correo_de_acceso
from .models import Roles, Users

class RolesSerializer(ModelSerializer):
    class Meta:
        model = Roles
        fields = ['role_ID', 'name', 'is_system', 'puede_delegar', 'puede_recibir_delegacion']
        read_only_fields = ['is_system', 'puede_delegar', 'puede_recibir_delegacion']


class UsersSerializer(ModelSerializer):

    def create(self, validated_data):
        # La cuenta nace sin contraseña usable: la persona la define con el enlace del correo.
        validated_data['password'] = make_password(None)
        instance = super().create(validated_data)
        encolar_correo_de_acceso(instance, 'bienvenida')
        return instance

    class Meta:
        model = Users
        fields = ['user_ID','first_name','last_name','cedula','email','phone_number','puesto','role','departamento_ID','birthday','user_photo','onboarding_completado','is_active']
        read_only_fields = ['user_ID']

class UsuarioResumenSerializer(ModelSerializer):
    """Lo mínimo para mostrar a una persona dentro de proyectos, tareas, historial y comentarios.
    Sin cédula, teléfono ni fecha de nacimiento (Ley 8968: solo los datos necesarios)."""

    class Meta:
        model = Users
        fields = ['user_ID', 'first_name', 'last_name', 'email', 'puesto', 'user_photo']
        read_only_fields = fields


class UsuarioDirectorioSerializer(ModelSerializer):
    """Lo que un jefe ve de otras personas: el resumen más su rol, departamento y estado."""

    class Meta:
        model = Users
        fields = UsuarioResumenSerializer.Meta.fields + ['role', 'departamento_ID', 'is_active']
        read_only_fields = fields
