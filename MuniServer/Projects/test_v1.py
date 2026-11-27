"""Tanda V1: tablas de proyectos y usuarios (avance y presupuesto calculados, orden por columna)."""
from rest_framework.test import APITestCase

from Auditoria.models import SesionUsuario
from MuniServer.pruebas import Escenario, crear_proyecto, crear_tarea
from Projects.models import AjustePresupuesto, Estado

LISTA = '/api/v1/projects/proyectosRead/'


class TablaDeProyectosTests(Escenario, APITestCase):
    def setUp(self):
        super().setUp()
        e = {n: Estado.objects.get(name=n) for n in ('Completado', 'Cancelado', 'Pendiente')}
        # self.proyecto: una tarea pendiente → 0 %.
        self.mitad = crear_proyecto(self.dueno, name='Mitad', costo=100)
        crear_tarea(self.mitad, estado=e['Completado'])
        crear_tarea(self.mitad, estado=e['Pendiente'])
        crear_tarea(self.mitad, estado=e['Cancelado'])  # no cuenta
        self.hecho = crear_proyecto(self.dueno, name='Hecho', costo=300, estado=e['Completado'])  # sin tareas: 100 %
        AjustePresupuesto.objects.create(proyecto=self.mitad, tipo='aumento', monto=500, motivo='x', usuario=self.admin)
        AjustePresupuesto.objects.create(proyecto=self.hecho, tipo='rebajo', monto=250, motivo='x', usuario=self.admin)
        crear_tarea(self.mitad, estado=e['Pendiente'], costo_ejecutado=70)
        self.tarea.costo_ejecutado = 40
        self.tarea.save()

    def nombres(self, orden):
        r = self.como(self.admin).get(LISTA, {'orden': orden})
        self.assertEqual(r.status_code, 200)
        return [p['name'] for p in r.data['results']]

    def test_avance_como_en_el_portal(self):
        r = self.como(self.admin).get(LISTA, {'orden': 'avance'})
        avances = {p['name']: p['avance'] for p in r.data['results']}
        self.assertEqual(avances, {'Proyecto P': 0, 'Mitad': 33, 'Hecho': 100})

    def test_orden_por_columna_y_al_reves(self):
        self.assertEqual(self.nombres('avance'), ['Proyecto P', 'Mitad', 'Hecho'])
        self.assertEqual(self.nombres('-avance'), ['Hecho', 'Mitad', 'Proyecto P'])
        # Presupuesto aprobado = costo + ajustes: Hecho 300 − 250 = 50, Mitad 100 + 500 = 600.
        presupuesto = self.nombres('presupuesto')
        self.assertLess(presupuesto.index('Hecho'), presupuesto.index('Mitad'))
        r = self.como(self.admin).get(LISTA, {'orden': '-presupuesto'})
        self.assertEqual({p['name']: p['costo_total'] for p in r.data['results']}['Mitad'], 600)
        self.assertEqual(self.nombres('-ejecutado')[:2], ['Mitad', 'Proyecto P'])
        self.assertEqual(self.nombres('nombre'), sorted(self.nombres('nombre')))
        self.assertEqual(self.nombres('-nombre'), sorted(self.nombres('nombre'), reverse=True))
        for clave in ('codigo', 'estado', 'departamento', 'responsable', 'entrega', 'prioridad', 'reciente', '-codigo'):
            self.assertEqual(len(self.nombres(clave)), 3, clave)
        # Una clave desconocida usa el orden por defecto, sin error.
        self.assertEqual(self.nombres('no-existe'), self.nombres('reciente'))

    def test_el_detalle_trae_el_avance(self):
        r = self.como(self.admin).get(f'{LISTA}{self.mitad.pk}/')
        self.assertEqual(r.data['avance'], 33)


class TablaDeUsuariosTests(Escenario, APITestCase):
    def ids(self, quien, orden):
        r = self.como(quien).get('/api/v1/users/users/', {'orden': orden, 'page_size': 100})
        self.assertEqual(r.status_code, 200)
        return [u['user_ID'] for u in r.data['results']]

    def test_orden_por_columna(self):
        r = self.como(self.admin).get('/api/v1/users/users/', {'orden': '-correo', 'page_size': 100})
        correos = [u['email'] for u in r.data['results']]
        self.assertEqual(correos, sorted(correos, reverse=True))
        self.assertEqual(len(self.ids(self.admin, 'rol')), len(self.ids(self.admin, 'nombre')))

    def test_por_conexion_ordena_solo_quien_la_ve(self):
        SesionUsuario.objects.create(usuario=self.ajeno)
        # Lo más reciente primero; quien nunca entró, al final.
        self.assertEqual(self.ids(self.admin, '-conexion')[0], str(self.ajeno.pk))
        self.assertEqual(self.ids(self.admin, 'conexion')[-1], str(self.ajeno.pk))
        # Quien ve el directorio recibe el orden por nombre: el de conexión delataría la actividad.
        self.assertEqual(self.ids(self.dueno, '-conexion'), self.ids(self.dueno, 'nombre'))
