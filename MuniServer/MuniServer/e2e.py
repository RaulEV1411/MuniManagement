"""Solo para las pruebas e2e: cada prueba pide su propio escenario y nadie depende de lo que otra cambió.

Existe únicamente con `settings_e2e` (`E2E = True`): urls.py no la agrega en ningún otro entorno.
Crea, con un sufijo único:
- un proyecto en Obras, a cargo de Ana, con las mismas cinco tareas de la semilla (asignadas a Fabi);
- si se pide, una persona propia (Funcionario de Obras) con la clave de las pruebas, para las pruebas
  que le cambian la clave o le cierran las sesiones.
"""
import random
import re
import uuid
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from Configuracion.models import Configuracion
from Departments.models import Departamentos
from Projects.management.commands.datos_e2e import CLAVE
from Projects.models import Estado, Prioridad, Proyectos
from Task.models import Tareas
from Users.models import Roles, Users

TAREAS = [('Demarcar', 'Pendiente'), ('Excavar', 'En progreso'), ('Revisar planos', 'En revisión'),
          ('Comprar cemento', 'Completado'), ('Esperar permiso', 'Pausado')]


def _cedula_libre():
    while True:
        cedula = str(random.randint(100_000_000, 999_999_999))
        if not Users.objects.filter(cedula=cedula).exists():
            return cedula


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def escenario(request):
    run = re.sub(r'[^a-z0-9-]', '', str(request.data.get('run', '')).lower())[:24] or uuid.uuid4().hex[:8]
    hoy = timezone.localdate()
    estado = {e.name: e for e in Estado.objects.all()}
    media = Prioridad.objects.get(name='Media')
    obras = Departamentos.objects.get(name='Obras')
    ana = Users.objects.get(email='ana@muni.test')
    fabi = Users.objects.get(email='fabi@muni.test')
    with transaction.atomic():
        # No se publica en el portal: el portal se prueba con la semilla, que nadie cambia.
        proyecto = Proyectos.objects.create(
            name=f'Obra {run}'[:50], descripcion=f'Escenario de prueba {run}', departamento_ID=obras,
            estado_ID=estado['En progreso'], prioridad_ID=Prioridad.objects.get(name='Alta'), user_ID=ana,
            fecha_inicio=hoy - timedelta(days=10), fecha_entrega=hoy + timedelta(days=30), costo=1_500_000, es_publico=False,
        )
        tareas = {
            nombre: str(Tareas.objects.create(
                proyecto_ID=proyecto, name=nombre, estado_ID=estado[est], prioridad_ID=media, asignado_a=fabi,
                fecha_inicio=hoy, fecha_entrega=hoy + timedelta(days=7),
            ).pk)
            for nombre, est in TAREAS
        }
        persona = None
        if request.data.get('persona'):
            u = Users(
                role=Roles.objects.get(name='Funcionario'), departamento_ID=obras, first_name='Persona',
                last_name=run[:25], cedula=_cedula_libre(), phone_number='88880000', email=f'persona-{run}@muni.test',
                puesto='Funcionario', onboarding_completado=True, privacidad_version=Configuracion.actual().privacidad_version,
            )
            u.set_password(CLAVE)
            u.save()
            persona = {'id': str(u.pk), 'email': u.email, 'nombre': f'{u.first_name} {u.last_name}'}
    return Response({
        'run': run, 'proyecto': {'id': str(proyecto.pk), 'nombre': proyecto.name}, 'tareas': tareas, 'persona': persona,
    }, status=201)
