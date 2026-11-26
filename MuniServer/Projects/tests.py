from rest_framework.test import APITestCase

from MuniServer.pruebas import Escenario, crear_proyecto
from Projects.models import AjustePresupuesto, Estado, MiembroProyecto, Proyectos_tipos, RolProyecto, Tipos


class CatalogosTests(Escenario, APITestCase):
    def test_solo_el_administrador_modifica_catalogos(self):
        for url, datos in [('/api/v1/projects/estados/', {'name': 'Nuevo', 'color': '#000000'}),
                           ('/api/v1/projects/prioridades/', {'name': 'Nueva', 'color': '#000000'}),
                           ('/api/v1/projects/tipos/', {'name': 'Vial'})]:
            self.assertEqual(self.como(self.alcalde).post(url, datos, format='json').status_code, 403, url)
            self.assertEqual(self.como(self.admin).post(url, datos, format='json').status_code, 201, url)

    def test_borrar_un_estado_en_uso_responde_409(self):
        propio = Estado.objects.create(name='En licitación')
        self.proyecto.estado_ID = propio
        self.proyecto.save()
        self.assertEqual(self.como(self.admin).delete(f'/api/v1/projects/estados/{propio.pk}/').status_code, 409)


class ProyectosTests(Escenario, APITestCase):
    def test_proyectos_write_solo_lista_lo_visible(self):
        r = self.como(self.ajeno).get('/api/v1/projects/proyectosWrite/')
        self.assertEqual(r.status_code, 200)
        self.assertNotIn(str(self.proyecto.proyect_ID), self.ids(r, 'proyect_ID'))
        self.assertIn(str(self.proyecto.proyect_ID), self.ids(self.como(self.dueno).get('/api/v1/projects/proyectosWrite/'), 'proyect_ID'))

    def test_tipos_de_proyecto_solo_con_permiso_de_edicion(self):
        tipo = Tipos.objects.create(name='Vial')
        datos = {'proyecto': str(self.proyecto.proyect_ID), 'tipo': str(tipo.pk)}
        self.assertEqual(self.como(self.ajeno).post('/api/v1/projects/proyectos-tipos/', datos, format='json').status_code, 403)
        self.assertEqual(self.como(self.dueno).post('/api/v1/projects/proyectos-tipos/', datos, format='json').status_code, 201)
        self.assertEqual(self.como(self.admin).delete(f'/api/v1/projects/tipos/{tipo.pk}/').status_code, 409)
        self.assertEqual(Proyectos_tipos.objects.count(), 1)


class MiembrosTests(Escenario, APITestCase):
    URL = '/api/v1/projects/miembros/'

    def datos(self, usuario, rol='Supervisor', **extra):
        return {'proyecto': str(self.proyecto.proyect_ID), 'usuario': str(usuario.user_ID),
                'rol': str(RolProyecto.objects.get(nombre=rol).pk), **extra}

    def test_el_jefe_del_departamento_delega_en_su_alcance(self):
        self.assertEqual(self.como(self.jefe_a).post(self.URL, self.datos(self.companero), format='json').status_code, 201)

    def test_no_delega_en_alguien_de_otro_departamento(self):
        r = self.como(self.jefe_a).post(self.URL, self.datos(self.ajeno), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('dirección o departamento', str(r.data))

    def test_un_jefe_de_otro_departamento_no_delega(self):
        self.assertEqual(self.como(self.jefe_b).post(self.URL, self.datos(self.jefe_b), format='json').status_code, 403)

    def test_nadie_se_delega_a_si_mismo(self):
        self.assertEqual(self.como(self.jefe_a).post(self.URL, self.datos(self.jefe_a), format='json').status_code, 400)

    def test_un_patch_no_cambia_proyecto_ni_persona_pero_si_rol_y_vigencia(self):
        miembro = MiembroProyecto.objects.create(proyecto=self.proyecto, usuario=self.ajeno, otorgado_por=self.jefe_a,
                                                 rol=RolProyecto.objects.get(nombre='Observador'))
        otro = crear_proyecto(self.dueno, name='Otro')
        c = self.como(self.jefe_a)
        url = f'{self.URL}{miembro.pk}/'
        self.assertEqual(c.patch(url, {'proyecto': str(otro.proyect_ID)}, format='json').status_code, 400)
        self.assertEqual(c.patch(url, {'usuario': str(self.asignado.user_ID)}, format='json').status_code, 400)
        supervisor = str(RolProyecto.objects.get(nombre='Supervisor').pk)
        self.assertEqual(c.patch(url, {'rol': supervisor, 'hasta': '2099-01-01'}, format='json').status_code, 200)

    def test_no_se_repite_ni_vence_en_el_pasado(self):
        c = self.como(self.jefe_a)
        self.assertEqual(c.post(self.URL, self.datos(self.companero), format='json').status_code, 201)
        r = c.post(self.URL, self.datos(self.companero, rol='Observador'), format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('ya está en el equipo', str(r.data))
        MiembroProyecto.objects.all().delete()
        r = c.post(self.URL, self.datos(self.companero, hasta='2000-01-01'), format='json')
        self.assertEqual(r.status_code, 400)

    def test_quitar_a_alguien_lo_revoca_y_deja_constancia(self):
        c = self.como(self.jefe_a)
        mid = c.post(self.URL, self.datos(self.companero), format='json').data['miembro_ID']
        self.assertEqual(self.como(self.companero).get(f'/api/v1/projects/proyectosRead/{self.proyecto.pk}/').status_code, 200)
        self.assertEqual(self.como(self.jefe_a).delete(f'{self.URL}{mid}/').status_code, 204)
        m = MiembroProyecto.objects.get(pk=mid)
        self.assertFalse(m.activo)
        self.assertEqual(m.revocado_por, self.jefe_a)
        self.assertEqual(self.como(self.companero).get(f'/api/v1/projects/proyectosRead/{self.proyecto.pk}/').status_code, 404)


class AjustesTests(Escenario, APITestCase):
    def test_aprobado_por_no_lo_pone_el_usuario(self):
        r = self.como(self.dueno).post('/api/v1/projects/ajustes-presupuesto/', {
            'proyecto': str(self.proyecto.proyect_ID), 'tipo': 'aumento', 'monto': 500,
            'motivo': 'Materiales', 'aprobado_por': str(self.alcalde.user_ID),
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertIsNone(AjustePresupuesto.objects.get().aprobado_por)

    def test_quien_no_ve_el_proyecto_no_ve_sus_ajustes(self):
        AjustePresupuesto.objects.create(proyecto=self.proyecto, tipo='aumento', monto=1, motivo='x', usuario=self.dueno)
        self.assertEqual(self.ids(self.como(self.ajeno).get('/api/v1/projects/ajustes-presupuesto/'), 'ajuste_ID'), set())


class ListadoEnElServidorTests(Escenario, APITestCase):
    URL = '/api/v1/projects/proyectosRead/'

    def setUp(self):
        super().setUp()
        from datetime import timedelta
        from django.utils import timezone
        from Projects.models import AjustePresupuesto, Prioridad
        hoy = timezone.localdate()
        self.vencido = crear_proyecto(self.dueno, name='Bacheo vencido', fecha_inicio=hoy - timedelta(days=30), fecha_entrega=hoy - timedelta(days=2))
        self.urgente = crear_proyecto(self.dueno, name='Puente urgente', prioridad=Prioridad.objects.get(name='Urgente'))
        self.completado = crear_proyecto(self.dueno, name='Parque listo', estado=Estado.objects.get(name='Completado'))
        AjustePresupuesto.objects.create(proyecto=self.urgente, tipo='aumento', monto=500, motivo='x', usuario=self.dueno)
        AjustePresupuesto.objects.create(proyecto=self.urgente, tipo='rebajo', monto=200, motivo='x', usuario=self.dueno)

    def nombres(self, **params):
        r = self.como(self.dueno).get(self.URL, params)
        self.assertEqual(r.status_code, 200)
        return [f['name'] for f in r.data['results']]

    def test_pagina_de_50_con_el_total(self):
        r = self.como(self.dueno).get(self.URL, {'page_size': 2})
        self.assertEqual(r.data['count'], 4)
        self.assertEqual(len(r.data['results']), 2)
        self.assertIsNotNone(r.data['next'])

    def test_filtros_y_orden(self):
        self.assertEqual(self.nombres(estado='Vencido'), ['Bacheo vencido'])
        self.assertNotIn('Bacheo vencido', self.nombres(estado='Pendiente'))
        self.assertEqual(self.nombres(prioridad='Urgente'), ['Puente urgente'])
        self.assertEqual(self.nombres(search='parque'), ['Parque listo'])
        self.assertEqual(self.nombres(orden='prioridad')[0], 'Puente urgente')
        self.assertEqual(self.nombres(orden='reciente')[0], 'Parque listo')

    def test_el_resumen_cuenta_todo_y_respeta_la_visibilidad(self):
        r = self.como(self.dueno).get(f'{self.URL}resumen/').data
        self.assertEqual((r['total'], r['vencidos'], r['completados']), (4, 1, 1))
        self.assertEqual(r['costo_total'], 4 * 1000 + 500 - 200)
        self.assertEqual(sum(e['total'] for e in r['por_estado']), 4)
        self.assertEqual(self.como(self.ajeno).get(f'{self.URL}resumen/').data['total'], 0)
        # El asignado ve solo el proyecto donde tiene tarea, aunque la regla de visibilidad use joins.
        self.assertEqual(self.como(self.asignado).get(f'{self.URL}resumen/').data['total'], 1)

    def test_los_catalogos_no_se_paginan(self):
        r = self.como(self.dueno).get('/api/v1/projects/estados/')
        self.assertIsInstance(r.data, list)
        self.assertIsInstance(self.client.get('/api/v1/departments/departamentos/').data, list)
