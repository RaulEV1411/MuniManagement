"""Otro Administrador (el primero lo crea `instalar`): la persona nace sin contraseña y se imprime el enlace
para definirla (también se manda por correo si hay correo configurado)."""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from rest_framework.exceptions import ValidationError

from Departments.models import Departamentos, Direccion
from Users.acceso import enlace_de_acceso
from Users.alta import crear_persona, errores_en_texto, validar_persona
from Users.models import Roles, Users


class Command(BaseCommand):
    help = 'Crea un usuario Administrador e imprime el enlace para que defina su contraseña.'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True)
        parser.add_argument('--nombre', required=True)
        parser.add_argument('--apellido', required=True)
        parser.add_argument('--cedula', required=True, help='Cédula física de 9 dígitos')
        parser.add_argument('--telefono', required=True)
        parser.add_argument('--puesto', default='Administración')
        parser.add_argument('--direccion', default='Alcaldía', help='Se crea si no existe.')
        parser.add_argument('--departamento', default='Despacho de la Alcaldía', help='Se crea si no existe.')

    @transaction.atomic
    def handle(self, *args, **o):
        try:
            rol = Roles.objects.get(name='Administrador')
        except Roles.DoesNotExist:
            raise CommandError('Falta el rol Administrador: corra primero «python manage.py seed_system».')
        if Users.objects.filter(email__iexact=o['email'].strip()).exists():
            raise CommandError(f"Ya existe un usuario con el correo {o['email']}; use promover_admin.")
        direccion, _ = Direccion.objects.get_or_create(name=o['direccion'])
        departamento, _ = Departamentos.objects.get_or_create(name=o['departamento'], defaults={'direccion': direccion})
        try:
            user = crear_persona(validar_persona({
                'first_name': o['nombre'], 'last_name': o['apellido'], 'cedula': o['cedula'], 'email': o['email'],
                'phone_number': o['telefono'], 'puesto': o['puesto'], 'role': rol.pk, 'departamento_ID': departamento.pk,
            }))
        except ValidationError as e:
            raise CommandError(errores_en_texto(e))
        self.stdout.write(self.style.SUCCESS(f'Administrador creado: {user.email}'))
        self.stdout.write(f'Enlace para definir la contraseña (vence en unos días):\n{enlace_de_acceso(user)}')
