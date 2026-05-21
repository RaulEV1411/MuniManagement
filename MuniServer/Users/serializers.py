from rest_framework.serializers import ModelSerializer
from rest_framework import serializers
from .models import Roles, Users
from django.contrib.auth.hashers import make_password
import random
import string
from django.core.mail import send_mail
from django.contrib.auth.hashers import make_password
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from .models import Users

class RolesSerializer(ModelSerializer):
    class Meta:
        model = Roles
        fields = ['role_ID', 'name', 'is_system', 'puede_delegar', 'puede_recibir_delegacion']
        read_only_fields = ['is_system', 'puede_delegar', 'puede_recibir_delegacion']


class UsersSerializer(ModelSerializer):
    
    def generate_random_password(self, length=8):
        """Genera una contraseña aleatoria de una longitud dada."""
        characters = string.ascii_letters + string.digits + string.punctuation
        return ''.join(random.choice(characters) for _ in range(length))
    
    def create(self, validated_data):
        # Generar contraseña temporal
        random_password = self.generate_random_password()
        email = validated_data.get('email')

        # Hashear y crear el usuario primero (el correo va async, no bloquea creación)
        validated_data['password'] = make_password(random_password)
        instance = super(UsersSerializer, self).create(validated_data)

        # Encolar envío de credenciales vía Celery; si el broker no está disponible,
        # registrar pero no romper la creación.
        try:
            from Task.tasks import enviar_credenciales_async
            enviar_credenciales_async.delay(email, random_password)
        except Exception:
            import logging
            logging.getLogger(__name__).exception('No se pudo encolar enviar_credenciales_async')

        return instance
    
    class Meta:
        model = Users
        fields = ['user_ID','first_name','last_name','cedula','email','phone_number','puesto','role','departamento_ID','birthday','user_photo','onboarding_completado']
        read_only_fields = ['user_ID']