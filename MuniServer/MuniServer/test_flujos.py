"""Flujos completos por la API, como los recorre una municipalidad: cada prueba encadena varios
pasos y revisa lo que deja cada uno (permisos, historial, avisos, portal)."""
from datetime import timedelta
from unittest import mock

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from Historial.models import HistorialCambios
from MuniServer.pruebas import Escenario
from Notifications.models import Notificacion
from Projects.models import Estado, Prioridad, Tipos
from Task import cron

API = '/api/v1'


def avisos(usuario, tipo):
    return Notificacion.objects.filter(usuario=usuario, tipo=tipo).count()


class CicloDeVidaDeUnProyectoTests(Escenario, APITestCase):
    def test_de_la_creacion_a_la_cancelacion(self):
        pendiente = Estado.objects.get(name='Pendiente')
        en_progreso = Estado.objects.get(name='En progreso')
        completado = Estado.objects.get(name='Completado')
        cancelado = Estado.objects.get(name='Cancelado')
        vial = Tipos.objects.create(name='Vial')

        # 1. El jefe crea el proyecto, público y con tipo, a nombre del funcionario.
        jefe = self.como(self.jefe_a)
        r = jefe.post(f'{API}/projects/proyectosWrite/', {
            'name': 'Acera escolar', 'descripcion': 'Acera frente a la escuela', 'tipos_ID': str(vial.pk),
            'fecha_inicio': '2026-12-01', 'fecha_entrega': '2027-02-28', 'costo': 2_000_000,
            'estado_ID': str(pendiente.pk), 'prioridad_ID': str(Prioridad.objects.get(name='Alta').pk),
            'departamento_ID': str(self.depto_a.pk), 'user_ID': str(self.dueno.pk), 'es_publico': True,
        }, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        pid = r.data['proyect_ID']
        self.assertEqual(avisos(self.dueno, 'asignacion'), 1)

        # 2. El dueño crea una tarea y se la asigna a otra persona.
        dueno = self.como(self.dueno)
        r = dueno.post(f'{API}/task/tareas/', {
            'proyecto_ID': pid, 'name': 'Demarcar', 'asignado_a': str(self.asignado.pk),
            'estado_ID': str(pendiente.pk), 'prioridad_ID': str(Prioridad.objects.get(name='Media').pk),
            'fecha_inicio': '2026-12-01', 'fecha_entrega': '2026-12-15',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        tid = r.data['tareas_ID']
        self.assertEqual(avisos(self.asignado, 'asignacion'), 1)

        # 3. El asignado ve el proyecto, avanza su tarea y el dueño se entera.
        asignado = self.como(self.asignado)
        self.assertEqual(asignado.get(f'{API}/projects/proyectosRead/{pid}/').status_code, 200)
        self.assertEqual(asignado.patch(f'{API}/task/tareas/{tid}/', {'estado_ID': str(en_progreso.pk)}, format='json').status_code, 200)
        self.assertEqual(avisos(self.dueno, 'cambio_estado'), 1)

        # 4. Un comentario del jefe le llega al dueño.
        self.como(self.jefe_a).post(f'{API}/feedback/feedback/', {'proyecto_ID': pid, 'info': 'Revisar el plano'}, format='json')
        self.assertEqual(avisos(self.dueno, 'comentario'), 1)

        # 5. El dueño pide un aumento (ya no lo registra directo); la jefatura lo aprueba y suma al costo total.
        from Solicitudes.models import TipoSolicitud
        self.assertEqual(self.como(self.dueno).post(f'{API}/projects/ajustes-presupuesto/', {
            'proyecto': pid, 'tipo': 'aumento', 'monto': 500_000, 'motivo': 'x'}, format='json').status_code, 403)
        r = self.como(self.dueno).post(f'{API}/solicitudes/solicitudes/', {
            'proyecto': pid, 'tipo': TipoSolicitud.objects.get(efecto='aumento').pk, 'monto': 500_000,
            'justificacion': 'Más metros de acera',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        r = self.como(self.jefe_a).post(f'{API}/solicitudes/solicitudes/{r.data["numero"]}/decidir/', {'aprobar': True}, format='json')
        self.assertEqual(r.data['estado'], 'aprobada', r.data)
        self.assertEqual(self.client.get(f'{API}/projects/proyectosRead/{pid}/').data['costo_total'], 2_500_000)

        # 6. El portal lo muestra sin datos de personas; el avance sube al completar la tarea.
        self.client.force_authenticate(None)
        publico = self.client.get(f'{API}/public/projects/{pid}/').data
        self.assertEqual(publico['avance'], 0)
        self.assertFalse({'user_ID', 'costo', 'asignado_a'} & set(publico))
        self.como(self.asignado).patch(f'{API}/task/tareas/{tid}/', {'estado_ID': str(completado.pk)}, format='json')
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f'{API}/public/projects/{pid}/').data['avance'], 100)

        # 7. Cancelar es cerrar el proyecto: no con un PATCH, sí con el cierre y su motivo; queda en
        #    el historial y el proyecto sale del portal.
        jefe = self.como(self.jefe_a)
        self.assertEqual(jefe.patch(f'{API}/projects/proyectosWrite/{pid}/', {'estado_ID': str(cancelado.pk), 'razon': 'x'}, format='json').status_code, 400)
        cierre = {'estado_ID': str(cancelado.pk), 'fecha_fin_real': timezone.localdate().isoformat(), 'costo_real': 0}
        self.assertEqual(jefe.post(f'{API}/projects/proyectosWrite/{pid}/cerrar/', cierre, format='json').status_code, 400)
        r = jefe.post(f'{API}/projects/proyectosWrite/{pid}/cerrar/', {**cierre, 'motivo': 'Sin terreno'}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(HistorialCambios.objects.filter(proyecto_ID=pid, tipo='cierre', razon='Sin terreno').exists())
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f'{API}/public/projects/{pid}/').status_code, 404)

        tipos = set(HistorialCambios.objects.filter(proyecto_ID=pid).values_list('tipo', flat=True))
        self.assertTrue({'creacion', 'cambio_estado_tarea', 'orden_cambio', 'cierre'} <= tipos, tipos)


class EquipoDePrincipioAFinTests(Escenario, APITestCase):
    def test_sumar_al_equipo_dar_edicion_y_revocar(self):
        from Projects.models import RolProyecto
        url_proyecto = f'{API}/projects/proyectosWrite/{self.proyecto.pk}/'
        manana = (timezone.localdate() + timedelta(days=1)).isoformat()
        rol = lambda n: str(RolProyecto.objects.get(nombre=n).pk)

        r = self.como(self.jefe_a).post(f'{API}/projects/miembros/', {
            'proyecto': str(self.proyecto.pk), 'usuario': str(self.companero.pk), 'rol': rol('Observador'),
            'hasta': manana, 'motivo': 'Vacaciones del responsable',
        }, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        miembro = r.data['miembro_ID']
        self.assertEqual(avisos(self.companero, 'delegacion'), 1)

        # Observador: ve, pero no edita; el detalle le dice qué puede hacer.
        companero = self.como(self.companero)
        detalle = companero.get(f'{API}/projects/proyectosRead/{self.proyecto.pk}/')
        self.assertEqual(detalle.status_code, 200)
        self.assertEqual(detalle.data['mis_permisos'], ['proyectos.ver'])
        self.assertEqual(companero.patch(url_proyecto, {'name': 'Otro nombre'}, format='json').status_code, 403)

        # Supervisor: edita.
        self.como(self.jefe_a).patch(f'{API}/projects/miembros/{miembro}/', {'rol': rol('Supervisor')}, format='json')
        self.assertEqual(self.como(self.companero).patch(url_proyecto, {'name': 'Otro nombre'}, format='json').status_code, 200)

        # Revocado: deja de verlo.
        self.assertEqual(self.como(self.jefe_a).delete(f'{API}/projects/miembros/{miembro}/').status_code, 204)
        self.assertEqual(self.como(self.companero).get(url_proyecto).status_code, 404)


@override_settings(EMAIL_HOST_USER='pruebas')
class AvisosDiariosTests(Escenario, APITestCase):
    def test_avisa_a_todos_los_interesados_una_sola_vez_por_dia(self):
        self.proyecto.fecha_entrega = timezone.localdate() + timedelta(days=2)
        self.proyecto.save()
        self.tarea.fecha_entrega = timezone.localdate() + timedelta(days=30)
        self.tarea.save()
        cron.send_due_date_warnings()
        cron.send_due_date_warnings()
        for persona in (self.dueno, self.jefe_a, self.alcalde):
            self.assertEqual(avisos(persona, 'vencimiento_proyecto'), 1, persona.email)
        self.assertEqual(avisos(self.ajeno, 'vencimiento_proyecto'), 0)
        destinatarios = {d for m in mail.outbox for d in m.to}
        self.assertTrue({self.dueno.email, self.jefe_a.email, self.alcalde.email} <= destinatarios)


class PortalPublicoTests(Escenario, APITestCase):
    def test_solo_lo_publico_y_sin_datos_personales(self):
        publico = self.proyecto
        publico.es_publico = True
        publico.save()
        privado = type(publico).objects.create(
            name='Interno', descripcion='x', departamento_ID=self.depto_a, estado_ID=publico.estado_ID,
            prioridad_ID=publico.prioridad_ID, user_ID=self.dueno, fecha_inicio=publico.fecha_inicio,
            fecha_entrega=publico.fecha_entrega, costo=1,
        )
        r = self.client.get(f'{API}/public/projects/')
        self.assertEqual(r.status_code, 200)
        filas = r.data['results'] if isinstance(r.data, dict) else r.data
        self.assertEqual([f['name'] for f in filas], ['Proyecto P'])
        self.assertEqual(self.client.get(f'{API}/public/projects/{privado.pk}/').status_code, 404)
        texto = str(self.client.get(f'{API}/public/projects/{publico.pk}/').data)
        for dato in (self.dueno.email, str(self.dueno.cedula), str(self.asignado.cedula)):
            self.assertNotIn(dato, texto)

    def test_el_avance_considera_el_estado_y_no_cuenta_lo_cancelado(self):
        from Task.models import Tareas
        publico = self.proyecto
        publico.es_publico = True
        publico.save()
        url = f'{API}/public/projects/{publico.pk}/'
        cancelado = Estado.objects.get(name='Cancelado')
        completado = Estado.objects.get(name='Completado')
        # La tarea del escenario sigue abierta: 0 %. Una cancelada no suma al total.
        Tareas.objects.create(proyecto_ID=publico, name='Descartada', estado_ID=cancelado, prioridad_ID=publico.prioridad_ID,
                              fecha_inicio=publico.fecha_inicio, fecha_entrega=publico.fecha_entrega)
        self.assertEqual(self.client.get(url).data['avance'], 0)
        self.tarea.estado_ID = completado
        self.tarea.save()
        self.assertEqual(self.client.get(url).data['avance'], 100)
        # Completado sin tareas abiertas ni hechas: 100 %, no 0 %.
        Tareas.objects.filter(proyecto_ID=publico).delete()
        publico.estado_ID = completado
        publico.save()
        self.assertEqual(self.client.get(url).data['avance'], 100)

    @mock.patch('Projects.views.subir_imagen', return_value={'secure_url': 'https://img.test/obra.jpg', 'public_id': 'obra'})
    def test_las_fotos_del_proyecto_se_ven_en_el_portal(self, _subir):
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.proyecto.es_publico = True
        self.proyecto.save()
        foto = SimpleUploadedFile('obra.jpg', b'\xff\xd8\xff\xe0' + b'0' * 64, content_type='image/jpeg')
        r = self.como(self.dueno).post(f'{API}/projects/project-images/', {'proyecto_ID': str(self.proyecto.pk), 'image': foto}, format='multipart')
        self.assertEqual(r.status_code, 201)
        self.client.force_authenticate(None)
        detalle = self.client.get(f'{API}/public/projects/{self.proyecto.pk}/').data
        self.assertEqual([i['url'] for i in detalle['images']], ['https://img.test/obra.jpg'])
