from rest_framework.test import APITestCase

from Historial.models import HistorialCambios
from MuniServer.pruebas import Escenario

URL = '/api/v1/historial/cambios/'


class HistorialTests(Escenario, APITestCase):
    def setUp(self):
        super().setUp()
        self.registro = HistorialCambios.objects.create(tipo='edicion_proyecto', proyecto_ID=self.proyecto, usuario=self.dueno)

    def test_no_se_escribe_por_api(self):
        r = self.como(self.dueno).post(URL, {'tipo': 'creacion', 'proyecto_ID': str(self.proyecto.proyect_ID)}, format='json')
        self.assertEqual(r.status_code, 405)

    def test_solo_se_ve_el_de_proyectos_visibles(self):
        self.assertEqual(self.ids(self.como(self.ajeno).get(URL), 'historial_ID'), set())
        self.assertEqual(self.ids(self.como(self.dueno).get(URL), 'historial_ID'), {str(self.registro.historial_ID)})

    def test_borrar_el_proyecto_conserva_el_historial(self):
        self.proyecto.delete()
        self.assertTrue(HistorialCambios.objects.filter(pk=self.registro.pk).exists())
