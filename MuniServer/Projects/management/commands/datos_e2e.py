"""Datos de ejemplo para las pruebas de punta a punta. Solo corre con settings_e2e."""
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from Departments.models import Departamentos, Direccion
from Notifications.models import Notificacion
from Projects.models import Estado, Prioridad, Proyectos
from Task.models import Tareas
from Users.models import Roles, Users

CLAVE = 'Clave-E2E-2026'


class Command(BaseCommand):
    help = 'Siembra los datos que usan las pruebas e2e (requiere MuniServer.settings_e2e).'

    def handle(self, *args, **options):
        if not getattr(settings, 'E2E', False):
            raise CommandError('Solo se usa con DJANGO_SETTINGS_MODULE=MuniServer.settings_e2e.')
        hoy = timezone.localdate()
        obras = Departamentos.objects.create(name='Obras', direccion=Direccion.objects.create(name='Infraestructura'))

        def persona(rol, nombre, email, cedula):
            u = Users(role=Roles.objects.get(name=rol), departamento_ID=obras, first_name=nombre, last_name='Prueba',
                      cedula=cedula, phone_number=88880000, email=email, puesto=rol, onboarding_completado=True)
            u.set_password(CLAVE)
            u.save()
            return u

        ana = persona('Administrador', 'Ana', 'ana@muni.test', 1)
        persona('Funcionario', 'Beto', 'beto@muni.test', 2)
        jorge = persona('Jefe de Departamento', 'Jorge', 'jorge@muni.test', 3)
        fabi = persona('Funcionario', 'Fabi', 'fabi@muni.test', 4)
        obras.jefe = jorge
        obras.save()

        estado = {e.name: e for e in Estado.objects.all()}
        prioridad = {p.name: p for p in Prioridad.objects.all()}

        def proyecto(nombre, est, pri, entrega, publico=True):
            return Proyectos.objects.create(
                name=nombre, descripcion=f'Descripción de {nombre}', departamento_ID=obras, estado_ID=estado[est],
                prioridad_ID=prioridad[pri], user_ID=ana, fecha_inicio=hoy - timedelta(days=40),
                fecha_entrega=entrega, costo=1_500_000, es_publico=publico,
            )

        acera = proyecto('Acera central', 'En progreso', 'Alta', hoy + timedelta(days=30))
        proyecto('Puente río', 'En revisión', 'Urgente', hoy + timedelta(days=60))
        proyecto('Parque infantil', 'Pausado', 'Baja', hoy + timedelta(days=90))
        proyecto('Bacheo norte', 'Pendiente', 'Media', hoy - timedelta(days=3))
        proyecto('Alumbrado', 'Completado', 'Media', hoy - timedelta(days=10))
        proyecto('Plan interno', 'Pendiente', 'Baja', hoy + timedelta(days=20), publico=False)
        for nombre, est in [('Demarcar', 'Pendiente'), ('Excavar', 'En progreso'), ('Revisar planos', 'En revisión'),
                            ('Comprar cemento', 'Completado'), ('Esperar permiso', 'Pausado')]:
            Tareas.objects.create(proyecto_ID=acera, name=nombre, estado_ID=estado[est], prioridad_ID=prioridad['Media'],
                                  asignado_a=fabi, fecha_inicio=hoy, fecha_entrega=hoy + timedelta(days=7))
        Notificacion.objects.create(usuario=ana, tipo='comentario', titulo='Nuevo comentario en "Acera central"',
                                    mensaje='Jorge: revisar', link=f'/projects/{acera.pk}')
        self.stdout.write(self.style.SUCCESS('Datos e2e listos.'))
