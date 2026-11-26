from datetime import date, timedelta
from unittest import mock

from django.utils import timezone
from rest_framework.test import APITestCase

from Feedback.models import Feedback
from Historial.models import HistorialCambios
from MuniServer.pruebas import Escenario, crear_proyecto, crear_tarea
from Notifications.models import Notificacion
from Projects.models import Estado, MiembroProyecto, RolProyecto, Tipos
from Task import cron


def avisos(usuario, tipo=None):
    qs = Notificacion.objects.filter(usuario=usuario)
    return qs.filter(tipo=tipo) if tipo else qs


class AvisosPorEventoTests(Escenario, APITestCase):
    def test_asignar_una_tarea_avisa_al_asignado(self):
        r = self.como(self.dueno).post('/api/v1/task/tareas/', {
            'proyecto_ID': str(self.proyecto.pk), 'estado_ID': str(self.tarea.estado_ID_id),
            'prioridad_ID': str(self.tarea.prioridad_ID_id), 'name': 'Bacheo', 'asignado_a': str(self.ajeno.pk),
            'fecha_inicio': '2026-12-01', 'fecha_entrega': '2026-12-10',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(avisos(self.ajeno, 'asignacion').count(), 1)
        self.assertEqual(avisos(self.dueno).count(), 0)

    def test_el_asignado_cambia_el_estado_y_se_avisa_al_dueno(self):
        en_progreso = Estado.objects.get(name='En progreso')
        self.como(self.asignado).patch(f'/api/v1/task/tareas/{self.tarea.pk}/', {'estado_ID': str(en_progreso.pk)}, format='json')
        self.assertEqual(avisos(self.dueno, 'cambio_estado').count(), 1)
        self.assertEqual(avisos(self.asignado).count(), 0)

    def test_un_comentario_avisa_al_dueno_y_no_al_autor(self):
        self.como(self.jefe_a).post('/api/v1/feedback/feedback/', {'proyecto_ID': str(self.proyecto.pk), 'info': 'Revisar'}, format='json')
        self.assertEqual(avisos(self.dueno, 'comentario').count(), 1)
        self.assertEqual(avisos(self.jefe_a).count(), 0)

    def test_cambiar_el_estado_del_proyecto_avisa_al_dueno(self):
        en_progreso = Estado.objects.get(name='En progreso')
        r = self.como(self.jefe_a).patch(f'/api/v1/projects/proyectosWrite/{self.proyecto.pk}/', {'estado_ID': str(en_progreso.pk)}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(avisos(self.dueno, 'cambio_estado').count(), 1)


class HistorialDeAltasYBajasTests(Escenario, APITestCase):
    def test_crear_proyecto_queda_en_el_historial_y_guarda_el_tipo(self):
        tipo = Tipos.objects.create(name='Vial')
        # Crea la jefatura (por defecto el Funcionario ya no crea proyectos).
        r = self.como(self.jefe_a).post('/api/v1/projects/proyectosWrite/', {
            'name': 'Nuevo', 'descripcion': 'x', 'fecha_inicio': '2026-12-01', 'fecha_entrega': '2026-12-31',
            'costo': 100, 'estado_ID': str(self.proyecto.estado_ID_id), 'prioridad_ID': str(self.proyecto.prioridad_ID_id),
            'departamento_ID': str(self.depto_a.pk), 'user_ID': str(self.dueno.pk), 'tipos_ID': str(tipo.pk),
        }, format='json')
        self.assertEqual(r.status_code, 201)
        nuevo = r.data['proyect_ID']
        self.assertTrue(HistorialCambios.objects.filter(proyecto_ID=nuevo, tipo='creacion').exists())
        leido = self.client.get(f'/api/v1/projects/proyectosRead/{nuevo}/').data
        self.assertEqual([t['name'] for t in leido['tipos']], ['Vial'])

    def test_borrar_una_tarea_queda_en_el_historial(self):
        self.como(self.dueno).delete(f'/api/v1/task/tareas/{self.tarea.pk}/')
        registro = HistorialCambios.objects.get(tipo='eliminacion')
        self.assertEqual(registro.datos_anteriores['name'], 'Tarea T')


class CronTests(Escenario, APITestCase):
    def setUp(self):
        super().setUp()
        self.hoy = timezone.localdate()

    def test_avisa_lo_vencido_y_no_lo_completado(self):
        self.proyecto.fecha_entrega = self.hoy - timedelta(days=2)
        self.proyecto.save()
        completado = crear_proyecto(self.dueno, name='Listo', fecha_inicio=date(2026, 1, 1),
                                    fecha_entrega=self.hoy - timedelta(days=1), estado=Estado.objects.get(name='Completado'))
        cron.send_due_date_warnings()
        titulos = list(avisos(self.dueno, 'vencimiento_proyecto').values_list('titulo', flat=True))
        self.assertTrue(any('venció hace 2 día(s)' in t for t in titulos), titulos)
        self.assertFalse(any(completado.name in t for t in titulos), titulos)

    def test_los_accesos_vencidos_se_desactivan_y_dejan_de_dar_acceso(self):
        m = MiembroProyecto.objects.create(proyecto=self.proyecto, usuario=self.ajeno, otorgado_por=self.jefe_a,
                                           rol=RolProyecto.objects.get(nombre='Supervisor'),
                                           desde=self.hoy - timedelta(days=10), hasta=self.hoy - timedelta(days=1))
        r = self.como(self.ajeno).get(f'/api/v1/projects/proyectosRead/{self.proyecto.pk}/')
        self.assertEqual(r.status_code, 404)
        cron.send_due_date_warnings()
        m.refresh_from_db()
        self.assertFalse(m.activo)

    def test_avisa_una_vez_antes_de_que_venza_el_acceso(self):
        MiembroProyecto.objects.create(proyecto=self.proyecto, usuario=self.ajeno, otorgado_por=self.jefe_a,
                                       rol=RolProyecto.objects.get(nombre='Observador'), hasta=self.hoy + timedelta(days=2))
        cron.send_due_date_warnings()
        cron.send_due_date_warnings()
        for persona in (self.ajeno, self.jefe_a):
            self.assertEqual(Notificacion.objects.filter(usuario=persona, clave_dedupe__startswith='acceso-vence:').count(), 1, persona.email)


class PerfilPropioTests(Escenario, APITestCase):
    def test_guardar_el_perfil_con_los_mismos_datos_protegidos_funciona(self):
        u = self.dueno
        datos = {'puesto': 'Inspector', 'role': str(u.role_id), 'departamento_ID': str(u.departamento_ID_id),
                 'cedula': u.cedula, 'email': u.email.upper()}
        r = self.como(u).patch(f'/api/v1/users/users/{u.pk}/', datos, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['role']['name'], 'Funcionario')
        self.assertEqual(r.data['departamento_ID']['name'], 'Departamento A')

    def test_cambiarse_el_rol_sigue_prohibido(self):
        r = self.como(self.dueno).patch(f'/api/v1/users/users/{self.dueno.pk}/', {'role': str(self.admin.role_id)}, format='json')
        self.assertEqual(r.status_code, 403)
