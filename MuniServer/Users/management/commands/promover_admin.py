from django.core.management.base import BaseCommand
from Users.models import Users, Roles


class Command(BaseCommand):
    help = 'Asigna el rol Administrador al usuario con el email indicado.'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email del usuario a promover.')

    def handle(self, *args, **options):
        email = options['email']
        try:
            user = Users.objects.get(email=email)
        except Users.DoesNotExist:
            self.stderr.write(self.style.ERROR(f'Usuario no encontrado: {email}'))
            return
        try:
            rol = Roles.objects.get(name='Administrador')
        except Roles.DoesNotExist:
            self.stderr.write(self.style.ERROR('Rol Administrador no existe. Ejecuta seed_system primero.'))
            return
        user.role = rol
        user.save(update_fields=['role'])
        self.stdout.write(self.style.SUCCESS(f'{email} ahora es Administrador.'))
