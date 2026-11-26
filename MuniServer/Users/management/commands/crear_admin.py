"""Primer administrador de una instalación nueva: crea la persona sin contraseña e imprime el
enlace para definirla (también lo manda por correo si hay correo configurado)."""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from Departments.models import Departamentos, Direccion
from Users.acceso import encolar_correo_de_acceso, enlace_de_acceso
from Users.models import Roles, Users


class Command(BaseCommand):
    help = 'Crea un usuario Administrador e imprime el enlace para que defina su contraseña.'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True)
        parser.add_argument('--nombre', required=True)
        parser.add_argument('--apellido', required=True)
        parser.add_argument('--cedula', required=True, type=int)
        parser.add_argument('--telefono', type=int, default=0)
        parser.add_argument('--direccion', default='Alcaldía', help='Se crea si no existe.')
        parser.add_argument('--departamento', default='Despacho de la Alcaldía', help='Se crea si no existe.')

    @transaction.atomic
    def handle(self, *args, **o):
        try:
            rol = Roles.objects.get(name='Administrador')
        except Roles.DoesNotExist:
            raise CommandError('Falta el rol Administrador: corra primero «python manage.py seed_system».')
        if Users.objects.filter(email__iexact=o['email']).exists():
            raise CommandError(f"Ya existe un usuario con el correo {o['email']}; use promover_admin.")
        direccion, _ = Direccion.objects.get_or_create(name=o['direccion'])
        departamento, _ = Departamentos.objects.get_or_create(name=o['departamento'], defaults={'direccion': direccion})
        user = Users(
            role=rol, departamento_ID=departamento, email=o['email'].strip().lower(),
            first_name=o['nombre'], last_name=o['apellido'], cedula=o['cedula'],
            phone_number=o['telefono'], puesto='Administrador',
        )
        user.set_unusable_password()
        user.save()
        transaction.on_commit(lambda: encolar_correo_de_acceso(user, 'bienvenida'))
        self.stdout.write(self.style.SUCCESS(f'Administrador creado: {user.email}'))
        self.stdout.write(f'Enlace para definir la contraseña (vence en unos días):\n{enlace_de_acceso(user)}')
