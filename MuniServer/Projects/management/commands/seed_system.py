from django.core.management.base import BaseCommand
from django.db import transaction
from Projects.catalogo_permisos import PERMISOS_POR_DEFECTO, ROLES_DE_PROYECTO
from Projects.models import Estado, Prioridad, RolProyecto
from Users.models import Roles, Users


ADMIN_AUTOMATIC_EMAILS = ['admin@muni.cr', 'admin@muni.local']


ESTADOS_FIJOS = [
    {'name': 'Pendiente',    'color': '#94a3b8', 'orden': 1, 'categoria': 'activo'},
    {'name': 'En progreso',  'color': '#2563eb', 'orden': 2, 'categoria': 'activo'},
    {'name': 'En revisión',  'color': '#a855f7', 'orden': 3, 'categoria': 'activo'},
    {'name': 'Completado',   'color': '#16a34a', 'orden': 4, 'categoria': 'finalizado'},
    {'name': 'Pausado',      'color': '#f59e0b', 'orden': 5, 'categoria': 'pausado'},
    {'name': 'Cancelado',    'color': '#dc2626', 'orden': 6, 'categoria': 'finalizado'},
]

PRIORIDADES_FIJAS = [
    {'name': 'Baja',     'color': '#16a34a', 'orden': 1},
    {'name': 'Media',    'color': '#f59e0b', 'orden': 2},
    {'name': 'Alta',     'color': '#ea580c', 'orden': 3},
    {'name': 'Urgente',  'color': '#dc2626', 'orden': 4},
]

# Los permisos por defecto de cada rol están en Projects/catalogo_permisos.py.
ROLES_FIJOS = list(PERMISOS_POR_DEFECTO)


class Command(BaseCommand):
    help = 'Crea los Estados, Prioridades y Roles fijos del sistema (idempotente).'

    @transaction.atomic
    def handle(self, *args, **options):
        for est in ESTADOS_FIJOS:
            Estado.objects.update_or_create(
                name=est['name'],
                defaults={'color': est['color'], 'orden': est['orden'], 'is_system': True, 'categoria': est['categoria']},
            )
        self.stdout.write(self.style.SUCCESS(f"Estados sembrados: {len(ESTADOS_FIJOS)}"))

        for pri in PRIORIDADES_FIJAS:
            Prioridad.objects.update_or_create(
                name=pri['name'],
                defaults={'color': pri['color'], 'orden': pri['orden'], 'is_system': True},
            )
        self.stdout.write(self.style.SUCCESS(f"Prioridades sembradas: {len(PRIORIDADES_FIJAS)}"))

        # Si ya tiene permisos (ajustados desde la matriz), no se pisan.
        for nombre in ROLES_FIJOS:
            rol, _ = Roles.objects.get_or_create(name=nombre, defaults={'is_system': True})
            cambios = []
            if not rol.is_system:
                rol.is_system = True
                cambios.append('is_system')
            if not rol.permisos:
                rol.permisos = dict(PERMISOS_POR_DEFECTO[nombre])
                cambios.append('permisos')
            if cambios:
                rol.save(update_fields=cambios)
        self.stdout.write(self.style.SUCCESS(f"Roles sembrados: {len(ROLES_FIJOS)}"))

        for r in ROLES_DE_PROYECTO:
            RolProyecto.objects.get_or_create(
                nombre=r['nombre'],
                defaults={'descripcion': r['descripcion'], 'permisos': r['permisos'], 'orden': r['orden'], 'is_system': True},
            )
        self.stdout.write(self.style.SUCCESS(f"Roles de proyecto sembrados: {len(ROLES_DE_PROYECTO)}"))

        from Configuracion.models import Configuracion
        Configuracion.actual()

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
