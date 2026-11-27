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
        cedula=datos.pop('cedula', str(100000000 + n)),
        phone_number=datos.pop('phone_number', str(80000000 + n)),
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


def crear_tarea(proyecto, asignado_a=None, **datos):
    from Task.models import Tareas
    hoy = date.today()
    return Tareas.objects.create(
        proyecto_ID=proyecto,
        asignado_a=asignado_a,
        estado_ID=datos.pop('estado', None) or Estado.objects.get(name='Pendiente'),
        prioridad_ID=datos.pop('prioridad', None) or Prioridad.objects.get(name='Media'),
        name=datos.pop('name', 'Tarea de prueba'),
        fecha_inicio=datos.pop('fecha_inicio', hoy),
        fecha_entrega=datos.pop('fecha_entrega', hoy + timedelta(days=7)),
        **datos,
    )


class Escenario:
    """Una dirección con dos departamentos (A y B) y un proyecto P en A.

    - admin: Administrador; alcalde: Alcalde.
    - jefe_a: jefe del departamento A; jefe_b: jefe del departamento B.
    - dueno: Funcionario de A, dueño de P.
    - ajeno: Funcionario de B, sin relación con P.
    - asignado: Funcionario de B con la tarea T de P asignada.
    - companero: Coordinador de A, sin relación con P.
    """

    def setUp(self):
        super().setUp()
        from django.core.cache import cache
        cache.clear()
        sembrar()
        self.direccion = Direccion.objects.create(name='Dirección de Obras')
        self.depto_a = crear_departamento('Departamento A', self.direccion)
        self.depto_b = crear_departamento('Departamento B', self.direccion)
        self.admin = crear_usuario('Administrador', self.depto_a)
        self.alcalde = crear_usuario('Alcalde', self.depto_a)
        self.jefe_a = crear_usuario('Jefe de Departamento', self.depto_a)
        self.jefe_b = crear_usuario('Jefe de Departamento', self.depto_b)
        self.depto_a.jefe = self.jefe_a
        self.depto_a.save()
        self.depto_b.jefe = self.jefe_b
        self.depto_b.save()
        self.dueno = crear_usuario('Funcionario', self.depto_a)
        self.ajeno = crear_usuario('Funcionario', self.depto_b)
        self.asignado = crear_usuario('Funcionario', self.depto_b)
        self.companero = crear_usuario('Coordinador', self.depto_a)
        self.proyecto = crear_proyecto(self.dueno, name='Proyecto P')
        self.tarea = crear_tarea(self.proyecto, asignado_a=self.asignado, name='Tarea T')

    def como(self, usuario):
        self.client.force_authenticate(usuario)
        return self.client

    @staticmethod
    def ids(respuesta, campo):
        datos = respuesta.data
        filas = datos['results'] if isinstance(datos, dict) and 'results' in datos else datos
        return {str(f[campo]) for f in filas}
