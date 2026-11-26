"""Datos mínimos para las pruebas: usuarios con rol y departamento, y proyectos."""
import io
import itertools
from datetime import date, timedelta

from django.core.management import call_command

from Departments.models import Departamentos, Direccion
from Projects.models import Estado, Prioridad, Proyectos
from Users.models import Roles, Users

CLAVE = 'clave-de-prueba-123'
_secuencia = itertools.count(1)


def sembrar():
    call_command('seed_system', stdout=io.StringIO())


def crear_departamento(nombre=None, direccion=None):
    n = next(_secuencia)
    direccion = direccion or Direccion.objects.create(name=f'Dirección {n}')
    return Departamentos.objects.create(name=nombre or f'Departamento {n}', direccion=direccion)


def crear_usuario(rol='Funcionario', departamento=None, **datos):
    n = next(_secuencia)
    usuario = Users(
        role=Roles.objects.get(name=rol),
        departamento_ID=departamento or crear_departamento(),
        first_name=datos.pop('first_name', 'Persona'),
        last_name=datos.pop('last_name', f'Prueba {n}'),
        cedula=datos.pop('cedula', 100000000 + n),
        phone_number=datos.pop('phone_number', 80000000 + n),
        email=datos.pop('email', f'persona{n}@muni.test'),
        birthday=datos.pop('birthday', date(1990, 1, 1)),
        puesto=datos.pop('puesto', 'Puesto'),
        **datos,
    )
    usuario.set_password(CLAVE)
    usuario.save()
    return usuario


def crear_proyecto(dueno, departamento=None, **datos):
    hoy = date.today()
    return Proyectos.objects.create(
        user_ID=dueno,
        departamento_ID=departamento or dueno.departamento_ID,
        estado_ID=datos.pop('estado', None) or Estado.objects.get(name='Pendiente'),
        prioridad_ID=datos.pop('prioridad', None) or Prioridad.objects.get(name='Media'),
        name=datos.pop('name', 'Proyecto de prueba'),
        descripcion=datos.pop('descripcion', 'Descripción'),
        fecha_inicio=datos.pop('fecha_inicio', hoy),
        fecha_entrega=datos.pop('fecha_entrega', hoy + timedelta(days=30)),
        costo=datos.pop('costo', 1000),
        **datos,
    )
