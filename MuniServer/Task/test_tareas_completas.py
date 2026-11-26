"""Tareas más completas: colaboradores, dependencias, lista de verificación, comentarios, recursos y documentos."""
import io
import zipfile

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from MuniServer.pruebas import Escenario, crear_proyecto, crear_tarea
from Notifications.models import Notificacion
from Projects.models import Estado

from .models import Recurso

API = '/api/v1'
PDF = b'%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'


def docx():
    salida = io.BytesIO()
    with zipfile.ZipFile(salida, 'w') as z:
        z.writestr('[Content_Types].xml', '<Types/>')
    return salida.getvalue()


class TareasCompletasTests(Escenario, APITestCase):
    def setUp(self):
        super().setUp()
        self.url = f'{API}/task/tareas/{self.tarea.pk}/'
        self.completado = Estado.objects.get(name='Completado')
        self.cancelado = Estado.objects.get(name='Cancelado')

    def test_los_colaboradores_ven_el_proyecto_y_actualizan_avance_y_horas(self):
        r = self.como(self.dueno).patch(self.url, {'colaboradores': [str(self.companero.pk)], 'horas_estimadas': '12.5', 'costo_ejecutado': 300}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        c = self.como(self.companero)
        self.assertEqual(c.get(f'{API}/projects/proyectosRead/{self.proyecto.pk}/').status_code, 200)
        self.assertEqual(c.patch(self.url, {'avance': 60, 'horas_reales': '4'}, format='json').status_code, 200)
        self.assertEqual(c.patch(self.url, {'name': 'Otra'}, format='json').status_code, 403)
        self.assertEqual(c.patch(self.url, {'avance': 120}, format='json').status_code, 400)
        detalle = self.como(self.admin).get(f'{API}/projects/proyectosRead/{self.proyecto.pk}/').data
        self.assertEqual(detalle['costo_ejecutado'], 300)

    def test_los_colaboradores_tienen_que_estar_en_su_alcance(self):
        # El dueño (Funcionario de A) no ve a alguien de B que no está en el proyecto.
        r = self.como(self.dueno).patch(self.url, {'colaboradores': [str(self.ajeno.pk)]}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('alcance', str(r.data))

    def test_dependencias_sin_circulos_y_terminar_espera_a_las_que_bloquean(self):
        previa = crear_tarea(self.proyecto, name='Excavar')
        self.assertEqual(self.como(self.dueno).patch(self.url, {'bloqueada_por': [str(previa.pk)]}, format='json').status_code, 200)
        r = self.como(self.dueno).patch(f'{API}/task/tareas/{previa.pk}/', {'bloqueada_por': [str(self.tarea.pk)]}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('círculo', str(r.data))
        r = self.como(self.asignado).patch(self.url, {'estado_ID': str(self.completado.pk)}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('Excavar', str(r.data))
        self.assertEqual(self.como(self.asignado).patch(self.url, {'estado_ID': str(self.cancelado.pk)}, format='json').status_code, 200)
        self.assertTrue(self.como(self.dueno).get(self.url).data['bloqueada'])
        otro = crear_tarea(self.proyecto.__class__.objects.create(
            user_ID=self.dueno, departamento_ID=self.depto_a, estado_ID=Estado.objects.get(name='Pendiente'),
            prioridad_ID=self.tarea.prioridad_ID, name='Otro', descripcion='x', fecha_inicio=self.proyecto.fecha_inicio,
            fecha_entrega=self.proyecto.fecha_entrega, costo=1,
        ))
        self.assertEqual(self.como(self.dueno).patch(self.url, {'bloqueada_por': [str(otro.pk)]}, format='json').status_code, 400)

    def test_etiquetas_se_ordenan_sin_repetir(self):
        r = self.como(self.dueno).patch(self.url, {'etiquetas': ['vial', ' urgente ', 'vial']}, format='json')
        self.assertEqual(r.data['etiquetas'], ['urgente', 'vial'])

    def test_lista_de_verificacion(self):
        r = self.como(self.dueno).post(f'{API}/task/checklist/', {'tarea': str(self.tarea.pk), 'texto': 'Pedir permiso'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        item = r.data['item_ID']
        self.assertEqual(self.como(self.asignado).post(f'{API}/task/checklist/', {'tarea': str(self.tarea.pk), 'texto': 'x'}, format='json').status_code, 403)
        r = self.como(self.asignado).patch(f'{API}/task/checklist/{item}/', {'hecho': True}, format='json')
        self.assertEqual((r.status_code, r.data['hecho_por_nombre']), (200, f'{self.asignado.first_name} {self.asignado.last_name}'))
        self.assertEqual(self.como(self.asignado).patch(f'{API}/task/checklist/{item}/', {'texto': 'otro'}, format='json').status_code, 403)
        self.assertEqual(self.como(self.asignado).delete(f'{API}/task/checklist/{item}/').status_code, 403)
        otra = crear_tarea(self.proyecto, name='Otra')
        self.assertEqual(self.como(self.dueno).patch(f'{API}/task/checklist/{item}/', {'tarea': str(otra.pk)}, format='json').status_code, 400)
        self.assertEqual(len(self.como(self.dueno).get(self.url).data['checklist']), 1)

    def test_comentarios_de_la_tarea(self):
        r = self.como(self.dueno).post(f'{API}/task/comentarios/', {'tarea': str(self.tarea.pk), 'texto': '¿Cómo va?'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertTrue(Notificacion.objects.filter(usuario=self.asignado, tipo='comentario').exists())
        self.assertIn(self.como(self.ajeno).post(f'{API}/task/comentarios/', {'tarea': str(self.tarea.pk), 'texto': 'x'}, format='json').status_code, (400, 403))
        self.assertEqual(self.como(self.asignado).delete(f'{API}/task/comentarios/{r.data["comentario_ID"]}/').status_code, 403)
        self.assertEqual(self.como(self.dueno).delete(f'{API}/task/comentarios/{r.data["comentario_ID"]}/').status_code, 204)

    def test_recursos_del_catalogo_y_aviso_de_cruce(self):
        datos = {'nombre': 'Vagoneta', 'tipo': 'vehiculo', 'codigo': 'SM-1234'}
        self.assertEqual(self.como(self.dueno).post(f'{API}/task/recursos/', datos, format='json').status_code, 403)
        vagoneta = self.como(self.admin).post(f'{API}/task/recursos/', datos, format='json').data['recurso_ID']
        cemento = Recurso.objects.create(nombre='Cemento', tipo='material')
        otra = crear_tarea(self.proyecto, name='Bacheo')
        r = self.como(self.dueno).post(f'{API}/task/asignaciones/', {'tarea': str(otra.pk), 'recurso': vagoneta}, format='json')
        self.assertEqual((r.status_code, r.data['cruces']), (201, []))
        r = self.como(self.dueno).post(f'{API}/task/asignaciones/', {'tarea': str(self.tarea.pk), 'recurso': vagoneta}, format='json')
        self.assertEqual(r.data['cruces'], ['«Bacheo» (Proyecto P)'])
        # De un proyecto que no ve, el aviso no dice el nombre.
        ajeno = crear_tarea(crear_proyecto(self.jefe_b, self.depto_b, name='Proyecto B'), name='Secreta')
        self.como(self.jefe_b).post(f'{API}/task/asignaciones/', {'tarea': str(ajeno.pk), 'recurso': vagoneta}, format='json')
        r = self.como(self.dueno).post(f'{API}/task/asignaciones/', {'tarea': str(otra.pk), 'recurso': vagoneta}, format='json')
        self.assertIn('otra tarea de un proyecto que usted no ve', r.data['cruces'])
        self.assertNotIn('Secreta', str(r.data['cruces']))
        self.como(self.dueno).post(f'{API}/task/asignaciones/', {'tarea': str(otra.pk), 'recurso': str(cemento.pk), 'cantidad': 10}, format='json')
        r = self.como(self.dueno).post(f'{API}/task/asignaciones/', {'tarea': str(self.tarea.pk), 'recurso': str(cemento.pk), 'cantidad': 5}, format='json')
        self.assertEqual(r.data['cruces'], [])  # los materiales se consumen: no se cruzan
        self.assertEqual(self.como(self.asignado).post(f'{API}/task/asignaciones/', {'tarea': str(self.tarea.pk), 'recurso': vagoneta}, format='json').status_code, 403)
        Recurso.objects.filter(pk=vagoneta).update(activo=False)
        self.assertEqual(self.como(self.dueno).post(f'{API}/task/asignaciones/', {'tarea': str(otra.pk), 'recurso': vagoneta}, format='json').status_code, 400)

    def test_documentos_con_categoria(self):
        subir = lambda quien, archivo, tipo='plano': self.como(quien).post(f'{API}/projects/documentos/', {
            'tarea': str(self.tarea.pk), 'tipo': tipo, 'archivo': archivo}, format='multipart')
        r = subir(self.asignado, SimpleUploadedFile('plano.pdf', PDF, content_type='application/pdf'))
        self.assertEqual((r.status_code, r.data['tipo_display']), (201, 'Plano'))
        self.assertEqual(subir(self.asignado, SimpleUploadedFile('oferta.docx', docx())).status_code, 201)
        self.assertEqual(subir(self.asignado, SimpleUploadedFile('cosas.zip', docx())).status_code, 400)
        self.assertEqual(subir(self.asignado, SimpleUploadedFile('nota.txt', b'hola')).status_code, 400)
        self.assertEqual(subir(self.ajeno, SimpleUploadedFile('plano.pdf', PDF)).status_code, 400)
        self.assertEqual(subir(self.asignado, SimpleUploadedFile('x.pdf', PDF), tipo='raro').status_code, 400)
        lista = self.como(self.dueno).get(f'{API}/projects/documentos/', {'tarea': str(self.tarea.pk)}).data
        self.assertEqual(len(lista), 2)
        self.assertEqual(self.como(self.dueno).get(self.url).data['documentos'], 2)
        self.assertEqual(self.como(self.companero).delete(f'{API}/projects/documentos/{lista[0]["documento_ID"]}/').status_code, 404)
        self.assertEqual(self.como(self.asignado).delete(f'{API}/projects/documentos/{lista[0]["documento_ID"]}/').status_code, 204)
