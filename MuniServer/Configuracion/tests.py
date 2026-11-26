from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from MuniServer.pruebas import Escenario

URL = '/api/v1/configuracion/'
PNG = b'\x89PNG\r\n\x1a\n' + b'0' * 64


class ConfiguracionTests(Escenario, APITestCase):
    def test_se_lee_sin_sesion(self):
        r = self.client.get(URL)
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.data['nombre'], r.data['color_primario'], r.data['moneda']), ('Municipalidad', '#0C3857', 'CRC'))

    def test_una_sesion_invalida_no_rompe_la_lectura(self):
        # Cookie vencida o de otra clave: el login y el portal tienen que seguir mostrando la marca.
        self.client.cookies['muni_access'] = 'token-invalido'
        self.assertEqual(self.client.get(URL).status_code, 200)
        self.assertEqual(self.client.patch(URL, {'nombre': 'X'}, format='json').status_code, 401)

    def test_solo_el_administrador_la_cambia(self):
        self.assertEqual(self.client.patch(URL, {'nombre': 'X'}, format='json').status_code, 401)
        self.assertEqual(self.como(self.alcalde).patch(URL, {'nombre': 'X'}, format='json').status_code, 403)
        r = self.como(self.admin).patch(URL, {'nombre': 'Municipalidad de Esparza', 'color_primario': '#1f6f43'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(URL).data['nombre'], 'Municipalidad de Esparza')

    def test_valida_colores_y_moneda(self):
        c = self.como(self.admin)
        self.assertEqual(c.patch(URL, {'color_acento': 'rojo'}, format='json').status_code, 400)
        self.assertEqual(c.patch(URL, {'moneda': 'colones'}, format='json').status_code, 400)
        self.assertEqual(c.patch(URL, {'moneda': 'USD'}, format='json').status_code, 200)
        # Amarillo claro: el texto blanco encima no se lee.
        r = c.patch(URL, {'color_primario': '#f5d90a'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('contraste', str(r.data['color_primario']))

    def test_el_logo_se_sube_reemplaza_y_borra(self):
        c = self.como(self.admin)
        primero = c.post(f'{URL}logo/', {'image': SimpleUploadedFile('a.png', PNG)}, format='multipart').data['logo']
        self.assertTrue(primero.startswith('/api/v1/media/munimanagement/institucion/'))
        segundo = c.post(f'{URL}logo/', {'image': SimpleUploadedFile('b.png', PNG)}, format='multipart').data['logo']
        en_disco = lambda url: (Path(settings.MEDIA_ROOT) / url.removeprefix(settings.MEDIA_URL)).exists()
        self.assertFalse(en_disco(primero))
        self.assertTrue(en_disco(segundo))
        self.assertEqual(c.delete(f'{URL}logo/').data['logo'], '')
        self.assertFalse(en_disco(segundo))
        self.assertEqual(self.como(self.dueno).post(f'{URL}logo/', {'image': SimpleUploadedFile('c.png', PNG)}, format='multipart').status_code, 403)
