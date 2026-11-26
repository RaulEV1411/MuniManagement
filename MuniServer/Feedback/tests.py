from rest_framework.test import APITestCase

from Feedback.models import Feedback
from MuniServer.pruebas import Escenario

URL = '/feedback/feedback/'


class ComentariosTests(Escenario, APITestCase):
    def test_el_autor_lo_pone_el_servidor(self):
        r = self.como(self.dueno).post(
            URL, {'proyecto_ID': str(self.proyecto.proyect_ID), 'info': 'Hola', 'user_ID': str(self.jefe_a.user_ID)}, format='json'
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Feedback.objects.get().user_ID, self.dueno)

    def test_quien_no_ve_el_proyecto_no_comenta_ni_lee(self):
        Feedback.objects.create(proyecto_ID=self.proyecto, user_ID=self.dueno, info='Interno')
        c = self.como(self.ajeno)
        self.assertEqual(c.post(URL, {'proyecto_ID': str(self.proyecto.proyect_ID), 'info': 'x'}, format='json').status_code, 403)
        self.assertEqual(self.ids(c.get(URL), 'feed_ID'), set())

    def test_solo_el_autor_edita_y_la_alcaldia_puede_borrar(self):
        comentario = Feedback.objects.create(proyecto_ID=self.proyecto, user_ID=self.dueno, info='Original')
        url = f'{URL}{comentario.feed_ID}/'
        self.assertEqual(self.como(self.jefe_a).patch(url, {'info': 'Cambiado'}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(url).status_code, 403)
        self.assertEqual(self.como(self.dueno).patch(url, {'info': 'Corregido'}, format='json').status_code, 200)
        self.assertEqual(self.como(self.alcalde).delete(url).status_code, 204)
