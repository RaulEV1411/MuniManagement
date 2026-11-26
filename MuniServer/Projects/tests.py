from rest_framework.test import APITestCase

from MuniServer.pruebas import Escenario, crear_proyecto
from Projects.models import AjustePresupuesto, DelegacionSupervision, Estado, Proyectos_tipos, Tipos


class CatalogosTests(Escenario, APITestCase):
    def test_solo_el_administrador_modifica_catalogos(self):
        for url, datos in [('/projects/estados/', {'name': 'Nuevo', 'color': '#000000'}),
                           ('/projects/prioridades/', {'name': 'Nueva', 'color': '#000000'}),
                           ('/projects/tipos/', {'name': 'Vial'})]:
            self.assertEqual(self.como(self.alcalde).post(url, datos, format='json').status_code, 403, url)
            self.assertEqual(self.como(self.admin).post(url, datos, format='json').status_code, 201, url)

    def test_borrar_un_estado_en_uso_responde_409(self):
        propio = Estado.objects.create(name='En licitación')
        self.proyecto.estado_ID = propio
        self.proyecto.save()
        self.assertEqual(self.como(self.admin).delete(f'/projects/estados/{propio.pk}/').status_code, 409)


class ProyectosTests(Escenario, APITestCase):
    def test_proyectos_write_solo_lista_lo_visible(self):
        r = self.como(self.ajeno).get('/projects/proyectosWrite/')
        self.assertEqual(r.status_code, 200)
        self.assertNotIn(str(self.proyecto.proyect_ID), self.ids(r, 'proyect_ID'))
        self.assertIn(str(self.proyecto.proyect_ID), self.ids(self.como(self.dueno).get('/projects/proyectosWrite/'), 'proyect_ID'))

    def test_tipos_de_proyecto_solo_con_permiso_de_edicion(self):
        tipo = Tipos.objects.create(name='Vial')
        datos = {'proyecto': str(self.proyecto.proyect_ID), 'tipo': str(tipo.pk)}
        self.assertEqual(self.como(self.ajeno).post('/projects/proyectos-tipos/', datos, format='json').status_code, 403)
        self.assertEqual(self.como(self.dueno).post('/projects/proyectos-tipos/', datos, format='json').status_code, 201)
        self.assertEqual(self.como(self.admin).delete(f'/projects/tipos/{tipo.pk}/').status_code, 409)
        self.assertEqual(Proyectos_tipos.objects.count(), 1)


class DelegacionTests(Escenario, APITestCase):
    URL = '/projects/delegaciones/'

    def datos(self, supervisor):
        return {'proyecto': str(self.proyecto.proyect_ID), 'supervisor': str(supervisor.user_ID)}

    def test_el_jefe_del_departamento_delega_en_su_alcance(self):
        self.assertEqual(self.como(self.jefe_a).post(self.URL, self.datos(self.ajeno), format='json').status_code, 201)

    def test_un_jefe_de_otro_departamento_no_delega(self):
        self.assertEqual(self.como(self.jefe_b).post(self.URL, self.datos(self.jefe_b), format='json').status_code, 403)

    def test_nadie_se_delega_a_si_mismo(self):
        self.assertEqual(self.como(self.jefe_a).post(self.URL, self.datos(self.jefe_a), format='json').status_code, 400)

    def test_un_patch_no_cambia_proyecto_ni_supervisor(self):
        delegacion = DelegacionSupervision.objects.create(proyecto=self.proyecto, supervisor=self.ajeno, otorgado_por=self.jefe_a)
        otro = crear_proyecto(self.dueno, name='Otro')
        c = self.como(self.jefe_a)
        url = f'{self.URL}{delegacion.pk}/'
        self.assertEqual(c.patch(url, {'proyecto': str(otro.proyect_ID)}, format='json').status_code, 400)
        self.assertEqual(c.patch(url, {'supervisor': str(self.asignado.user_ID)}, format='json').status_code, 400)
        self.assertEqual(c.patch(url, {'puede_editar': True}, format='json').status_code, 200)


class AjustesTests(Escenario, APITestCase):
    def test_aprobado_por_no_lo_pone_el_usuario(self):
        r = self.como(self.dueno).post('/projects/ajustes-presupuesto/', {
            'proyecto': str(self.proyecto.proyect_ID), 'tipo': 'aumento', 'monto': 500,
            'motivo': 'Materiales', 'aprobado_por': str(self.alcalde.user_ID),
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertIsNone(AjustePresupuesto.objects.get().aprobado_por)

    def test_quien_no_ve_el_proyecto_no_ve_sus_ajustes(self):
        AjustePresupuesto.objects.create(proyecto=self.proyecto, tipo='aumento', monto=1, motivo='x', usuario=self.dueno)
        self.assertEqual(self.ids(self.como(self.ajeno).get('/projects/ajustes-presupuesto/'), 'ajuste_ID'), set())
