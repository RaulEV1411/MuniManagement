from rest_framework.serializers import ModelSerializer
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
        fields = '__all__'

class UsersSerializer(ModelSerializer):
    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data['password'])
        return super(UsersSerializer, self).create(validated_data)
    class Meta:
        model = Users
        fields = '__all__'

class UsersSerializer(ModelSerializer):
    
    def generate_random_password(self, length=8):
        """Genera una contraseña aleatoria de una longitud dada."""
        characters = string.ascii_letters + string.digits + string.punctuation
        return ''.join(random.choice(characters) for _ in range(length))
    
    def send_password_email(self, email, random_password):
        subject = 'Tu nueva contraseña'
        html_message = render_to_string('Users/email_card.html', {'username': email, 'password': random_password})
        plain_message = strip_tags(html_message)  # Para el caso de que se necesite un texto plano
        from_email = 'tu_email@gmail.com'
        send_mail(subject, plain_message, from_email, [email], html_message=html_message)

    def create(self, validated_data):
        # Generar una contraseña aleatoria
        random_password = self.generate_random_password()
        
        # Enviar la contraseña por correo electrónico al usuario
        email = validated_data.get('email')
        self.send_password_email(email, random_password)
        
        # Hacer el hash de la contraseña antes de guardarla
        validated_data['password'] = make_password(random_password)
        
        # Crear el usuario
        return super(UsersSerializer, self).create(validated_data)
    
    class Meta:
        model = Users
        fields = ['user_ID','first_name','last_name','cedula','email','phone_number','puesto','role','departamento_ID','birthday']