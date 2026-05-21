from django.core.management.base import BaseCommand
from django.db import transaction
from Projects.models import Estado, Prioridad
from Users.models import Roles, Users


ADMIN_AUTOMATIC_EMAILS = ['admin@muni.cr', 'admin@muni.local']


ESTADOS_FIJOS = [
    {'name': 'Pendiente',    'color': '#94a3b8', 'orden': 1},
    {'name': 'En progreso',  'color': '#2563eb', 'orden': 2},
    {'name': 'En revisión',  'color': '#a855f7', 'orden': 3},
    {'name': 'Completado',   'color': '#16a34a', 'orden': 4},
    {'name': 'Pausado',      'color': '#f59e0b', 'orden': 5},
    {'name': 'Cancelado',    'color': '#dc2626', 'orden': 6},
]

PRIORIDADES_FIJAS = [
    {'name': 'Baja',     'color': '#16a34a', 'orden': 1},
    {'name': 'Media',    'color': '#f59e0b', 'orden': 2},
    {'name': 'Alta',     'color': '#ea580c', 'orden': 3},
    {'name': 'Urgente',  'color': '#dc2626', 'orden': 4},
]

ROLES_FIJOS = [
    {'name': 'Administrador',       'puede_delegar': True,  'puede_recibir_delegacion': False, 'puede_ver_todo': True},
    {'name': 'Alcalde',             'puede_delegar': True,  'puede_recibir_delegacion': False, 'puede_ver_todo': True},
    {'name': 'Vicealcalde',         'puede_delegar': True,  'puede_recibir_delegacion': False, 'puede_ver_todo': True},
    {'name': 'Jefe de Dirección',   'puede_delegar': True,  'puede_recibir_delegacion': True,  'puede_ver_todo': False},
    {'name': 'Jefe de Departamento','puede_delegar': True,  'puede_recibir_delegacion': True,  'puede_ver_todo': False},
    {'name': 'Coordinador',         'puede_delegar': False, 'puede_recibir_delegacion': True,  'puede_ver_todo': False},
    {'name': 'Funcionario',         'puede_delegar': False, 'puede_recibir_delegacion': True,  'puede_ver_todo': False},
]


class Command(BaseCommand):
    help = 'Crea los Estados, Prioridades y Roles fijos del sistema (idempotente).'

    @transaction.atomic
    def handle(self, *args, **options):
        for est in ESTADOS_FIJOS:
            Estado.objects.update_or_create(
                name=est['name'],
                defaults={'color': est['color'], 'orden': est['orden'], 'is_system': True},
            )
        self.stdout.write(self.style.SUCCESS(f"Estados sembrados: {len(ESTADOS_FIJOS)}"))

        for pri in PRIORIDADES_FIJAS:
            Prioridad.objects.update_or_create(
                name=pri['name'],
                defaults={'color': pri['color'], 'orden': pri['orden'], 'is_system': True},
            )
        self.stdout.write(self.style.SUCCESS(f"Prioridades sembradas: {len(PRIORIDADES_FIJAS)}"))

        for rol in ROLES_FIJOS:
            Roles.objects.update_or_create(
                name=rol['name'],
                defaults={
                    'is_system': True,
                    'puede_delegar': rol['puede_delegar'],
                    'puede_recibir_delegacion': rol['puede_recibir_delegacion'],
                    'puede_ver_todo': rol['puede_ver_todo'],
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Roles sembrados: {len(ROLES_FIJOS)}"))

        try:
            rol_admin = Roles.objects.get(name='Administrador')
        except Roles.DoesNotExist:
            rol_admin = None
        if rol_admin:
            promovidos = Users.objects.filter(email__in=ADMIN_AUTOMATIC_EMAILS).exclude(role=rol_admin)
            count = promovidos.count()
            if count:
                promovidos.update(role=rol_admin)
                self.stdout.write(self.style.SUCCESS(f"Usuarios promovidos a Administrador: {count}"))
