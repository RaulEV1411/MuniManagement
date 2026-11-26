"""Fotos en disco local (lo que usa una instalación por defecto) y en Cloudinary (opcional)."""
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from MuniServer.pruebas import Escenario
from Projects.models import ProjectImage

PNG = b'\x89PNG\r\n\x1a\n' + b'0' * 64
HEIC = b'\x00\x00\x00\x18ftypheic' + b'0' * 64


def archivo(contenido, nombre='foto.png'):
    return SimpleUploadedFile(nombre, contenido, content_type='image/png')


class FotosLocalesTests(Escenario, APITestCase):
    URL = '/api/v1/projects/project-images/'

    def test_se_guarda_en_disco_y_se_borra(self):
        r = self.como(self.dueno).post(self.URL, {'proyecto_ID': str(self.proyecto.pk), 'image': archivo(PNG)}, format='multipart')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(r.data['url'].startswith('/api/v1/media/munimanagement/proyectos/'))
        self.assertTrue(r.data['url'].endswith('.png'))
        en_disco = Path(settings.MEDIA_ROOT) / r.data['public_id']
        self.assertTrue(en_disco.exists())
        self.assertEqual(self.client.delete(f"{self.URL}{r.data['imagen_ID']}/").status_code, 204)
        self.assertFalse(en_disco.exists())
        self.assertFalse(ProjectImage.objects.exists())

    def test_el_nombre_lo_pone_el_servidor(self):
        r = self.como(self.dueno).post(self.URL, {'proyecto_ID': str(self.proyecto.pk), 'image': archivo(PNG, '../../evil.html')}, format='multipart')
        self.assertEqual(r.status_code, 201)
        self.assertNotIn('evil', r.data['url'])
        self.assertNotIn('..', r.data['public_id'])

    def test_heic_no_se_acepta_en_disco_local(self):
        r = self.como(self.dueno).post(self.URL, {'proyecto_ID': str(self.proyecto.pk), 'image': archivo(HEIC, 'a.heic')}, format='multipart')
        self.assertEqual(r.status_code, 400)
        self.assertIn('JPG, PNG o WebP', r.data['error'])

    def test_la_foto_de_usuario_reemplaza_la_anterior(self):
        url = f'/api/v1/users/upload-photo/{self.dueno.pk}/'
        primera = self.como(self.dueno).post(url, {'image': archivo(PNG)}, format='multipart').data['user_photo']
        segunda = self.client.post(url, {'image': archivo(PNG)}, format='multipart').data['user_photo']
        self.assertNotEqual(primera, segunda)
        self.assertFalse((Path(settings.MEDIA_ROOT) / primera.removeprefix(settings.MEDIA_URL)).exists())
        self.assertTrue((Path(settings.MEDIA_ROOT) / segunda.removeprefix(settings.MEDIA_URL)).exists())


@override_settings(ALMACENAMIENTO_FOTOS='cloudinary')
class FotosEnCloudinaryTests(Escenario, APITestCase):
    @mock.patch('cloudinary.uploader.destroy')
    @mock.patch('cloudinary.uploader.upload', return_value={'secure_url': 'https://res.cloudinary.com/x/foto.heic', 'public_id': 'munimanagement/proyectos/foto'})
    def test_sube_y_borra_en_cloudinary_y_acepta_heic(self, subir, borrar):
        c = self.como(self.dueno)
        r = c.post('/api/v1/projects/project-images/', {'proyecto_ID': str(self.proyecto.pk), 'image': archivo(HEIC, 'a.heic')}, format='multipart')
        self.assertEqual(r.status_code, 201, r.data)
        subir.assert_called_once()
        c.delete(f"/api/v1/projects/project-images/{r.data['imagen_ID']}/")
        borrar.assert_called_once_with('munimanagement/proyectos/foto')
