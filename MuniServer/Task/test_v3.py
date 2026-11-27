"""Tanda V3: «Mis tareas», las tareas de uno en todos los proyectos que ve."""
from datetime import date, timedelta

from rest_framework.test import APITestCase

from MuniServer.pruebas import Escenario, crear_proyecto, crear_tarea
from Projects import catalogo_permisos as cat
from Projects.models import Estado, RolProyecto

URL = '/api/v1/task/tareas/'


class MisTareasTests(Escenario, APITestCase):
    def nombres(self, quien, **params):
        r = self.como(quien).get(URL, {'mias': '1', **params})
        self.assertEqual(r.status_code, 200)
        return [t['name'] for t in r.data['results']]

    def test_asignadas_y_en_las_que_colabora_de_todos_los_proyectos(self):
        hoy = date.today()
        otro = crear_proyecto(self.dueno, name='Otro')
        crear_tarea(otro, asignado_a=self.dueno, name='Después', fecha_entrega=hoy + timedelta(days=9))
        crear_tarea(otro, asignado_a=self.dueno, name='Antes', fecha_entrega=hoy + timedelta(days=1))
        colabora = crear_tarea(self.proyecto, asignado_a=self.admin, name='Con ayuda')
        colabora.colaboradores.add(self.dueno)
        crear_tarea(otro, asignado_a=self.admin, name='Ajena')
        crear_tarea(otro, asignado_a=self.dueno, name='Hecha', estado=Estado.objects.get(name='Completado'))
        mias = self.nombres(self.dueno)
        self.assertNotIn('Ajena', mias)
        self.assertIn('Con ayuda', mias)
        self.assertIn('Hecha', mias)
        self.assertLess(mias.index('Antes'), mias.index('Después'))
        self.assertNotIn('Hecha', self.nombres(self.dueno, abiertas='1'))
        r = self.como(self.dueno).get(URL, {'mias': '1'})
        self.assertEqual({t['proyecto_nombre'] for t in r.data['results'] if t['name'] == 'Antes'}, {'Otro'})

    def test_abiertas_no_trae_las_de_proyectos_cerrados_o_archivados(self):
        cerrado = crear_proyecto(self.dueno, name='Cerrado', estado=Estado.objects.get(name='Cancelado'))
        archivado = crear_proyecto(self.dueno, name='Archivado', archivado=True)
        crear_tarea(cerrado, asignado_a=self.dueno, name='Del cerrado')
        crear_tarea(archivado, asignado_a=self.dueno, name='Del archivado')
        crear_tarea(self.proyecto, asignado_a=self.dueno, name='Del abierto')
        abiertas = self.nombres(self.dueno, abiertas='1')
        self.assertIn('Del abierto', abiertas)
        self.assertNotIn('Del cerrado', abiertas)
        self.assertNotIn('Del archivado', abiertas)

    def test_no_trae_tareas_de_proyectos_que_no_ve(self):
        # Si el rol Colaborador no deja ver el proyecto, su tarea no se cuela por «Mis tareas».
        rol = RolProyecto.objects.get(nombre=cat.COLABORADOR)
        rol.permisos = [x for x in rol.permisos if x != 'proyectos.ver']
        rol.save()
        ajeno = crear_proyecto(self.ajeno, departamento=self.depto_b, name='Ajeno')
        crear_tarea(ajeno, asignado_a=self.dueno, name='Escondida')
        self.assertNotIn('Escondida', self.nombres(self.dueno))
