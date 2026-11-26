from datetime import date

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from MuniServer.pruebas import Escenario, crear_proyecto
from Projects.models import Estado
from Task.models import TaskImage

URL = '/task/tareas/'


class TareasPermisosTests(Escenario, APITestCase):
    def datos_tarea(self, **extra):
        datos = {
            'proyecto_ID': str(self.proyecto.proyect_ID),
            'estado_ID': str(self.tarea.estado_ID_id),
            'prioridad_ID': str(self.tarea.prioridad_ID_id),
            'name': 'Nueva tarea',
            'fecha_inicio': '2026-12-01',
            'fecha_entrega': '2026-12-10',
        }
        datos.update(extra)
        return datos

    def test_quien_no_ve_el_proyecto_no_ve_sus_tareas(self):
        r = self.como(self.ajeno).get(URL, {'proyecto_ID': self.proyecto.proyect_ID})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.ids(r, 'tareas_ID'), set())
        self.assertEqual(self.client.get(f'{URL}{self.tarea.tareas_ID}/').status_code, 404)

    def test_quien_no_ve_el_proyecto_no_crea_edita_ni_borra_tareas(self):
        c = self.como(self.ajeno)
        self.assertEqual(c.post(URL, self.datos_tarea(), format='json').status_code, 403)
        self.assertEqual(c.patch(f'{URL}{self.tarea.tareas_ID}/', {'name': 'x'}, format='json').status_code, 404)
        self.assertEqual(c.delete(f'{URL}{self.tarea.tareas_ID}/').status_code, 404)

    def test_el_dueno_crea_edita_y_borra(self):
        c = self.como(self.dueno)
        r = c.post(URL, self.datos_tarea(), format='json')
        self.assertEqual(r.status_code, 201)
        nueva = r.data['tareas_ID']
        self.assertEqual(c.patch(f'{URL}{nueva}/', {'name': 'Renombrada'}, format='json').status_code, 200)
        self.assertEqual(c.delete(f'{URL}{nueva}/').status_code, 204)

    def test_el_asignado_ve_el_proyecto_y_solo_cambia_el_estado_de_su_tarea(self):
        c = self.como(self.asignado)
        self.assertEqual(self.ids(c.get(URL, {'proyecto_ID': self.proyecto.proyect_ID}), 'tareas_ID'), {str(self.tarea.tareas_ID)})
        en_progreso = Estado.objects.get(name='En progreso')
        self.assertEqual(c.patch(f'{URL}{self.tarea.tareas_ID}/', {'estado_ID': str(en_progreso.pk)}, format='json').status_code, 200)
        self.assertEqual(c.patch(f'{URL}{self.tarea.tareas_ID}/', {'name': 'Otra'}, format='json').status_code, 403)
        self.assertEqual(c.delete(f'{URL}{self.tarea.tareas_ID}/').status_code, 403)
        self.assertEqual(c.post(URL, self.datos_tarea(), format='json').status_code, 403)

    def test_una_tarea_no_se_mueve_a_otro_proyecto(self):
        otro = crear_proyecto(self.dueno, name='Otro', fecha_inicio=date(2026, 1, 1))
        r = self.como(self.dueno).patch(f'{URL}{self.tarea.tareas_ID}/', {'proyecto_ID': str(otro.proyect_ID)}, format='json')
        self.assertEqual(r.status_code, 400)


class ImagenesDeTareasTests(Escenario, APITestCase):
    URL = '/task/task-images/'

    def setUp(self):
        super().setUp()
        self.imagen = TaskImage.objects.create(tarea=self.tarea, url='https://ejemplo.test/a.jpg', public_id='a')

    def test_filtrar_por_tarea_funciona(self):
        r = self.como(self.dueno).get(self.URL, {'tarea_ID': self.tarea.tareas_ID})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.ids(r, 'imagen_ID'), {str(self.imagen.imagen_ID)})

    def test_quien_no_ve_el_proyecto_no_ve_sube_ni_borra_imagenes(self):
        c = self.como(self.ajeno)
        self.assertEqual(self.ids(c.get(self.URL), 'imagen_ID'), set())
        archivo = SimpleUploadedFile('a.jpg', b'\xff\xd8\xff\xe0' + b'0' * 20, content_type='image/jpeg')
        r = c.post(self.URL, {'tarea_ID': str(self.tarea.tareas_ID), 'image': archivo}, format='multipart')
        self.assertEqual(r.status_code, 404)
        self.assertEqual(c.delete(f'{self.URL}{self.imagen.imagen_ID}/').status_code, 404)

    def test_no_se_puede_cambiar_la_url_de_una_imagen(self):
        r = self.como(self.dueno).patch(f'{self.URL}{self.imagen.imagen_ID}/', {'url': 'https://otro.test/x.jpg'}, format='json')
        self.assertEqual(r.status_code, 405)
