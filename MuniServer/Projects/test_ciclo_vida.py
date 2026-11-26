"""Ciclo de vida: los proyectos se cierran (con su formulario), se reabren y se archivan; no se borran."""
from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APITestCase

from MuniServer.pruebas import Escenario, crear_proyecto
from Projects.models import CierreProyecto, DocumentoProyecto, Estado
from Users.models import Roles

API = '/api/v1'
PDF = b'%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'


class CicloDeVidaTests(Escenario, APITestCase):
    def setUp(self):
        super().setUp()
        self.completado = Estado.objects.get(name='Completado')
        self.cancelado = Estado.objects.get(name='Cancelado')
        self.en_progreso = Estado.objects.get(name='En progreso')
        self.url = f'{API}/projects/proyectosWrite/{self.proyecto.pk}/'

    def cierre(self, **extra):
        return {'estado_ID': str(self.completado.pk), 'fecha_fin_real': timezone.localdate().isoformat(),
                'costo_real': 950, 'motivo': 'Obra entregada', 'lecciones': 'Pedir el permiso antes', **extra}

    def cerrar(self, quien=None, **extra):
        return self.como(quien or self.dueno).post(f'{self.url}cerrar/', self.cierre(**extra), format='multipart')

    def test_cada_estado_tiene_su_categoria_y_hay_contadores_por_pestana(self):
        self.assertEqual(
            dict(Estado.objects.values_list('name', 'categoria')),
            {'Pendiente': 'activo', 'En progreso': 'activo', 'En revisión': 'activo',
             'Pausado': 'pausado', 'Completado': 'finalizado', 'Cancelado': 'finalizado'},
        )
        crear_proyecto(self.dueno, name='Pausado', estado=Estado.objects.get(name='Pausado'))
        r = self.como(self.admin).get(f'{API}/projects/proyectosRead/resumen/', {'categoria': 'pausado'})
        self.assertEqual(r.data['por_categoria'], {'activo': 1, 'pausado': 1, 'finalizado': 0})
        self.assertEqual(r.data['total'], 1)
        nombres = [p['name'] for p in self.client.get(f'{API}/projects/proyectosRead/', {'categoria': 'activo'}).data['results']]
        self.assertEqual(nombres, ['Proyecto P'])

    def test_a_un_estado_final_solo_se_llega_cerrando_y_no_se_borra(self):
        r = self.como(self.dueno).patch(self.url, {'estado_ID': str(self.cancelado.pk), 'razon': 'x'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('Cerrar proyecto', str(r.data))
        self.assertEqual(self.como(self.admin).delete(self.url).status_code, 405)

    def test_cerrar_valida_y_guarda_el_acta(self):
        manana = (timezone.localdate() + timedelta(days=1)).isoformat()
        self.assertEqual(self.cerrar(fecha_fin_real=manana).status_code, 400)
        self.assertEqual(self.cerrar(estado_ID=str(self.en_progreso.pk)).status_code, 400)
        self.assertEqual(self.cerrar(acta=SimpleUploadedFile('acta.txt', b'hola')).status_code, 400)
        self.assertIn(self.cerrar(self.ajeno).status_code, (403, 404))
        r = self.cerrar(acta=SimpleUploadedFile('acta.pdf', PDF, content_type='application/pdf'))
        self.assertEqual(r.status_code, 201, r.data)
        cierre = CierreProyecto.objects.get()
        self.assertEqual((cierre.costo_real, cierre.cerrado_por_id), (950, self.dueno.pk))
        acta = DocumentoProyecto.objects.get()
        self.assertEqual((acta.tipo, acta.cierre_id, acta.nombre), ('acta', cierre.pk, 'acta.pdf'))
        detalle = self.client.get(f'{API}/projects/proyectosRead/{self.proyecto.pk}/').data
        self.assertTrue(detalle['cerrado'])
        self.assertEqual(detalle['cierre']['lecciones'], 'Pedir el permiso antes')
        self.assertEqual(len(detalle['cierre']['documentos']), 1)
        self.assertEqual(self.cerrar().status_code, 400)  # ya está cerrado

    def test_cerrado_no_se_edita_pero_admite_fotos_y_comentarios(self):
        self.assertEqual(self.cerrar().status_code, 201)
        r = self.como(self.dueno).patch(self.url, {'name': 'Otro'}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertIn('cerrado', str(r.data))
        r = self.como(self.asignado).patch(f'{API}/task/tareas/{self.tarea.pk}/', {'estado_ID': str(self.en_progreso.pk)}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(self.como(self.admin).delete(f'{API}/task/tareas/{self.tarea.pk}/').status_code, 403)
        detalle = self.como(self.dueno).get(f'{API}/projects/proyectosRead/{self.proyecto.pk}/').data
        self.assertNotIn('proyectos.editar', detalle['mis_permisos'])
        self.assertNotIn('tareas.gestionar', detalle['mis_permisos'])
        self.assertIn('fotos.subir', detalle['mis_permisos'])
        r = self.como(self.dueno).post(f'{API}/feedback/feedback/', {'proyecto_ID': str(self.proyecto.pk), 'info': 'Inaugurado'}, format='json')
        self.assertEqual(r.status_code, 201)

    def test_reabrir_pide_permiso_y_motivo(self):
        self.assertEqual(self.cerrar().status_code, 201)
        datos = {'estado_ID': str(self.en_progreso.pk), 'motivo': 'Faltó la rampa'}
        self.assertEqual(self.como(self.dueno).post(f'{self.url}reabrir/', datos, format='json').status_code, 403)
        jefe = self.como(self.jefe_a)
        self.assertIn('proyectos.reabrir', jefe.get(f'{API}/projects/proyectosRead/{self.proyecto.pk}/').data['mis_permisos'])
        self.assertEqual(jefe.post(f'{self.url}reabrir/', {**datos, 'estado_ID': str(self.cancelado.pk)}, format='json').status_code, 400)
        self.assertEqual(jefe.post(f'{self.url}reabrir/', {'estado_ID': str(self.en_progreso.pk)}, format='json').status_code, 400)
        self.assertEqual(jefe.post(f'{self.url}reabrir/', datos, format='json').status_code, 200)
        cierre = CierreProyecto.objects.get()
        self.assertEqual((cierre.reabierto_por_id, cierre.motivo_reapertura), (self.jefe_a.pk, 'Faltó la rampa'))
        self.assertEqual(self.como(self.dueno).patch(self.url, {'name': 'Acera con rampa'}, format='json').status_code, 200)

    def test_solo_el_administrador_archiva_lo_cerrado(self):
        self.assertEqual(self.como(self.admin).post(f'{self.url}archivar/').status_code, 400)  # sigue abierto
        self.cerrar()
        self.assertEqual(self.como(self.jefe_a).post(f'{self.url}archivar/').status_code, 403)
        self.assertEqual(self.como(self.admin).post(f'{self.url}archivar/').status_code, 200)
        lista = self.client.get(f'{API}/projects/proyectosRead/').data['results']
        self.assertNotIn(str(self.proyecto.pk), [p['proyect_ID'] for p in lista])
        archivados = self.client.get(f'{API}/projects/proyectosRead/', {'archivados': '1'}).data['results']
        self.assertEqual([p['name'] for p in archivados], ['Proyecto P'])
        self.assertEqual(self.client.get(f'{API}/projects/proyectosRead/resumen/').data['archivados'], 1)
        detalle = self.client.get(f'{API}/projects/proyectosRead/{self.proyecto.pk}/')
        self.assertEqual((detalle.status_code, detalle.data['archivado']), (200, True))
        datos = {'estado_ID': str(self.en_progreso.pk), 'motivo': 'x'}
        self.assertEqual(self.client.post(f'{self.url}reabrir/', datos, format='json').status_code, 400)
        self.assertEqual(self.client.post(f'{self.url}desarchivar/').status_code, 200)

    def test_archivar_no_se_cuela_por_la_edicion(self):
        r = self.como(self.dueno).patch(self.url, {'archivado': True}, format='json')
        self.assertEqual(r.status_code, 200)
        self.proyecto.refresh_from_db()
        self.assertFalse(self.proyecto.archivado)

    def test_un_proyecto_nuevo_no_nace_cerrado(self):
        datos = {
            'name': 'Nuevo', 'descripcion': 'x', 'costo': 1, 'fecha_inicio': timezone.localdate().isoformat(),
            'fecha_entrega': (timezone.localdate() + timedelta(days=5)).isoformat(),
            'estado_ID': str(self.completado.pk), 'prioridad_ID': str(self.proyecto.prioridad_ID_id),
            'departamento_ID': str(self.depto_a.pk), 'user_ID': str(self.dueno.pk),
        }
        self.assertEqual(self.como(self.jefe_a).post(f'{API}/projects/proyectosWrite/', datos, format='json').status_code, 400)

    def test_reabrir_reemplaza_a_eliminar_en_los_roles(self):
        permisos = dict(Roles.objects.values_list('name', 'permisos'))
        self.assertTrue(all('proyectos.eliminar' not in p for p in permisos.values()))
        self.assertEqual(permisos['Jefe de Departamento'].get('proyectos.reabrir'), 'departamento')
        self.assertNotIn('proyectos.reabrir', permisos['Funcionario'])

    def test_un_proyecto_cerrado_no_cuenta_como_vencido(self):
        hace_un_mes = timezone.localdate() - timedelta(days=30)
        viejo = crear_proyecto(self.dueno, name='Viejo', fecha_inicio=hace_un_mes - timedelta(days=30), fecha_entrega=hace_un_mes)
        r = self.como(self.admin).get(f'{API}/projects/proyectosRead/resumen/')
        self.assertEqual(r.data['vencidos'], 1)
        self.como(self.dueno).post(f'{API}/projects/proyectosWrite/{viejo.pk}/cerrar/', self.cierre(), format='multipart')
        self.assertEqual(self.como(self.admin).get(f'{API}/projects/proyectosRead/resumen/').data['vencidos'], 0)
