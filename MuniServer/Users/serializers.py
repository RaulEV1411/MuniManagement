from rest_framework.serializers import ModelSerializer, SerializerMethodField, ValidationError
from django.contrib.auth.hashers import make_password

from Projects import catalogo_permisos as cat
from .acceso import encolar_correo_de_acceso
from .models import Roles, Users

class RolesSerializer(ModelSerializer):
    class Meta:
        model = Roles
        fields = ['role_ID', 'name', 'descripcion', 'is_system', 'permisos']
        read_only_fields = ['is_system']

    def validate_permisos(self, value):
        if not isinstance(value, dict):
            raise ValidationError('Los permisos van como {permiso: alcance}.')
        limpio = {}
        for codigo, alcance in value.items():
            if codigo not in cat.PERMISOS:
                raise ValidationError(f'No existe el permiso «{codigo}».')
            if alcance in (None, ''):
                continue
            if alcance not in cat.ALCANCES:
                raise ValidationError(f'Alcance no válido para «{codigo}».')
            # Los permisos sin alcance (estructura, catálogos, …) son todo o nada.
            limpio[codigo] = alcance if cat.admite_alcance(codigo) else cat.TODOS
        return limpio


class RolYDepartamentoAnidados:
    """Al leer, rol y departamento salen como objetos; al escribir se mandan sus ids."""

    def to_representation(self, instance):
        datos = super().to_representation(instance)
        if 'role' in datos:
            rol = instance.role
            datos['role'] = rol and {
                'role_ID': str(rol.role_ID), 'name': rol.name,
                # Para elegir a quién sumar al equipo de un proyecto.
                'integra_equipos': rol.name == 'Administrador' or 'equipo.integrar' in (rol.permisos or {}),
            }
        if 'departamento_ID' in datos:
            depto = instance.departamento_ID
            datos['departamento_ID'] = depto and {'departamentos_ID': str(depto.departamentos_ID), 'name': depto.name}
        return datos


class UsersSerializer(RolYDepartamentoAnidados, ModelSerializer):
    # La anota UsersViewSet: la última actividad de sus sesiones.
    ultima_conexion = SerializerMethodField()

    def get_ultima_conexion(self, obj):
        valor = getattr(obj, 'ultima_conexion', None)
        return valor.isoformat() if valor else None

    def create(self, validated_data):
        # La cuenta nace sin contraseña usable: la persona la define con el enlace del correo.
        validated_data['password'] = make_password(None)
        instance = super().create(validated_data)
        encolar_correo_de_acceso(instance, 'bienvenida')
        return instance

    class Meta:
        model = Users
        fields = ['user_ID','first_name','last_name','cedula','email','phone_number','puesto','role','departamento_ID','birthday','user_photo','onboarding_completado','is_active','ultima_conexion']
        read_only_fields = ['user_ID']

class UsuarioResumenSerializer(ModelSerializer):
    """Lo mínimo para mostrar a una persona dentro de proyectos, tareas, historial y comentarios.
    Sin cédula, teléfono ni fecha de nacimiento (Ley 8968: solo los datos necesarios)."""

    class Meta:
        model = Users
        fields = ['user_ID', 'first_name', 'last_name', 'email', 'puesto', 'user_photo']
        read_only_fields = fields


class UsuarioDirectorioSerializer(RolYDepartamentoAnidados, ModelSerializer):
    """Lo que un jefe ve de otras personas: el resumen más su rol, departamento y estado."""

    class Meta:
        model = Users
        fields = UsuarioResumenSerializer.Meta.fields + ['role', 'departamento_ID', 'is_active']
        read_only_fields = fields
