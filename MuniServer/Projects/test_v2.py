"""Tanda V2: lo que muestra el resumen de un proyecto en el Cronograma y en Reportes."""
from rest_framework.test import APITestCase

from MuniServer.pruebas import Escenario, crear_proyecto
from Solicitudes.models import Solicitud, TipoSolicitud

LISTA = '/api/v1/projects/proyectosRead/'


class SolicitudesAbiertasTests(Escenario, APITestCase):
    def test_cuenta_solo_las_abiertas_de_cada_proyecto(self):
        tipo = TipoSolicitud.objects.first()
        otro = crear_proyecto(self.dueno, name='Otro')
        for estado in ('enviada', 'en_revision', 'aprobada', 'rechazada'):
            Solicitud.objects.create(proyecto=self.proyecto, tipo=tipo, justificacion='x', estado=estado, solicitante=self.dueno)
        r = self.como(self.admin).get(LISTA, {'page_size': 100})
        conteo = {p['name']: p['solicitudes_abiertas'] for p in r.data['results']}
        self.assertEqual(conteo[self.proyecto.name], 2)
        self.assertEqual(conteo[otro.name], 0)
        self.assertEqual(self.como(self.admin).get(f'{LISTA}{self.proyecto.pk}/').data['solicitudes_abiertas'], 2)
