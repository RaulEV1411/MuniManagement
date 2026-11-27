"""Solicitudes: cadena por umbral, quién decide cada paso, la orden de cambio y el escalamiento."""
from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from MuniServer.pruebas import Escenario, crear_usuario
from Notifications.models import Notificacion
from Projects.models import AjustePresupuesto, Estado, MiembroProyecto, RolProyecto
from Users.models import Roles

from . import servicios
from .models import PasoAprobacion, Solicitud, TipoSolicitud

API = '/api/v1/solicitudes'


class SolicitudesTests(Escenario, APITestCase):
    def setUp(self):
        super().setUp()
        self.jefe_dir = crear_usuario('Jefe de Dirección', self.depto_a)
        self.direccion.jefe = self.jefe_dir
        self.direccion.save()

    def pedir(self, quien=None, efecto='aumento', **datos):
        tipo = TipoSolicitud.objects.filter(efecto=efecto).first()
        return self.como(quien or self.dueno).post(f'{API}/solicitudes/', {
            'proyecto': str(self.proyecto.pk), 'tipo': tipo.pk, 'justificacion': 'Hace falta', **datos,
        }, format='json')

    def decidir(self, quien, numero, aprobar=True, comentario=''):
        return self.como(quien).post(f'{API}/solicitudes/{numero}/decidir/', {'aprobar': aprobar, 'comentario': comentario}, format='json')

    def test_la_cadena_sale_de_los_umbrales(self):
        niveles = lambda r: [p['nivel'] for p in r.data['pasos']]
        self.assertEqual(niveles(self.pedir(monto=1_000_000)), ['departamento'])
        self.assertEqual(niveles(self.pedir(monto=7_000_000)), ['departamento', 'direccion'])
        self.assertEqual(niveles(self.pedir(monto=25_000_000)), ['departamento', 'direccion', 'alcaldia'])
        entrega = self.proyecto.fecha_entrega
        self.assertEqual(niveles(self.pedir(efecto='plazo', nueva_fecha=(entrega + timedelta(days=10)).isoformat())), ['departamento'])
        self.assertEqual(niveles(self.pedir(efecto='plazo', nueva_fecha=(entrega + timedelta(days=45)).isoformat())), ['departamento', 'direccion'])

    def test_quien_pide_y_que_se_valida(self):
        self.assertEqual(self.pedir(monto=10).status_code, 201)
        self.assertIn(self.pedir(self.ajeno, monto=10).status_code, (403, 404))
        self.assertEqual(self.pedir(efecto='plazo', nueva_fecha=self.proyecto.fecha_entrega.isoformat()).status_code, 400)
        self.assertEqual(self.pedir(efecto='personal', persona=str(self.companero.pk)).status_code, 400)  # falta el rol
        self.assertEqual(self.pedir(monto=None).status_code, 400)
        self.proyecto.estado_ID = Estado.objects.get(name='Completado')
        self.proyecto.save()
        self.assertEqual(self.pedir(monto=10).status_code, 400)

    def test_cada_paso_lo_decide_su_nivel_y_se_aplica_al_final(self):
        r = self.pedir(monto=7_000_000)
        n = r.data['numero']
        self.assertEqual(Notificacion.objects.filter(usuario=self.jefe_a, tipo='solicitud').count(), 1)
        self.assertEqual(self.decidir(self.jefe_dir, n).status_code, 403)  # todavía no le toca
        r = self.decidir(self.jefe_a, n)
        self.assertEqual(r.data['estado'], 'en_revision')
        self.assertEqual(self.decidir(self.jefe_a, n).status_code, 403)  # no decide dos pasos
        self.assertEqual(AjustePresupuesto.objects.count(), 0)  # no frena, pero tampoco se aplica antes
        r = self.decidir(self.jefe_dir, n)
        self.assertEqual((r.data['estado'], r.data['aplicada']), ('aprobada', True))
        ajuste = AjustePresupuesto.objects.get()
        self.assertEqual((ajuste.monto, ajuste.aprobado_por_id, ajuste.usuario_id), (7_000_000, self.jefe_dir.pk, self.dueno.pk))
        self.assertTrue(self.proyecto.historial.filter(tipo='orden_cambio').exists())

    def test_nadie_decide_su_propia_solicitud(self):
        n = self.pedir(self.jefe_a, monto=10).data['numero']
        self.assertEqual(self.decidir(self.jefe_a, n).status_code, 403)
        self.assertEqual(self.decidir(self.admin, n).data['estado'], 'aprobada')

    def test_rechazar_pide_motivo_y_retirar_es_de_quien_pidio(self):
        n = self.pedir(monto=10).data['numero']
        self.assertEqual(self.decidir(self.jefe_a, n, aprobar=False).status_code, 400)
        r = self.decidir(self.jefe_a, n, aprobar=False, comentario='No hay contenido presupuestario')
        self.assertEqual(r.data['estado'], 'rechazada')
        otra = self.pedir(monto=10).data['numero']
        self.assertEqual(self.como(self.jefe_a).post(f'{API}/solicitudes/{otra}/retirar/').status_code, 403)
        self.assertEqual(self.como(self.dueno).post(f'{API}/solicitudes/{otra}/retirar/').data['estado'], 'retirada')

    def test_prorroga_personal_y_responsable_se_aplican(self):
        nueva = self.proyecto.fecha_entrega + timedelta(days=10)
        n = self.pedir(efecto='plazo', nueva_fecha=nueva.isoformat()).data['numero']
        self.decidir(self.jefe_a, n)
        self.proyecto.refresh_from_db()
        self.assertEqual(self.proyecto.fecha_entrega, nueva)
        observador = RolProyecto.objects.get(nombre='Observador')
        n = self.pedir(efecto='personal', persona=str(self.companero.pk), rol_proyecto=str(observador.pk)).data['numero']
        self.decidir(self.jefe_a, n)
        self.assertTrue(MiembroProyecto.objects.filter(proyecto=self.proyecto, usuario=self.companero, otorgado_por=self.jefe_a).exists())
        r = self.pedir(efecto='responsable', persona=str(self.companero.pk))
        r = self.decidir(self.jefe_a, r.data['numero'])
        self.assertEqual(r.data['pasos'][-1]['nivel'], 'direccion')
        self.decidir(self.jefe_dir, r.data['numero'])
        self.proyecto.refresh_from_db()
        self.assertEqual(self.proyecto.user_ID_id, self.companero.pk)

    def test_bandeja_y_conteo(self):
        self.pedir(monto=10)
        self.assertEqual(self.como(self.jefe_a).get(f'{API}/solicitudes/conteo/').data['por_aprobar'], 1)
        self.assertEqual(self.como(self.jefe_b).get(f'{API}/solicitudes/conteo/').data['por_aprobar'], 0)
        r = self.como(self.jefe_a).get(f'{API}/solicitudes/', {'bandeja': 'por_aprobar'})
        self.assertEqual(r.data['count'], 1)
        self.assertTrue(r.data['results'][0]['puedo_decidir'])
        self.assertEqual(self.como(self.dueno).get(f'{API}/solicitudes/', {'bandeja': 'mias'}).data['count'], 1)
        self.assertEqual(self.como(self.ajeno).get(f'{API}/solicitudes/').data['count'], 0)

    def test_sin_respuesta_a_tiempo_escala_al_nivel_siguiente(self):
        n = self.pedir(monto=10).data['numero']
        self.assertEqual(self.decidir(self.jefe_dir, n).status_code, 403)
        PasoAprobacion.objects.filter(solicitud_id=n).update(vence=timezone.localdate() - timedelta(days=1))
        self.assertEqual(servicios.escalar_vencidas(), 1)
        self.assertTrue(Notificacion.objects.filter(usuario=self.jefe_dir, tipo='solicitud').exists())
        self.assertEqual(self.decidir(self.jefe_dir, n).data['estado'], 'aprobada')

    def test_la_configuracion_es_del_administrador(self):
        tipo = TipoSolicitud.objects.get(efecto='plazo')
        self.assertEqual(self.como(self.jefe_a).patch(f'{API}/tipos/{tipo.pk}/', {'dias_respuesta': 3}, format='json').status_code, 403)
        self.assertEqual(self.como(self.admin).patch(f'{API}/tipos/{tipo.pk}/', {'nombre': 'Otra'}, format='json').status_code, 400)
        self.assertEqual(self.como(self.admin).patch(f'{API}/tipos/{tipo.pk}/', {'dias_respuesta': 3}, format='json').status_code, 200)
        regla = tipo.reglas.get(nivel='direccion')
        self.assertEqual(self.client.patch(f'{API}/reglas/{regla.pk}/', {'desde': 15}, format='json').status_code, 200)
        self.assertEqual(self.client.delete(f'{API}/tipos/{tipo.pk}/').status_code, 403)

    def test_el_presupuesto_se_pide_y_las_jefaturas_aprueban(self):
        permisos = dict(Roles.objects.values_list('name', 'permisos'))
        self.assertNotIn('presupuesto.ajustar', permisos['Funcionario'])
        self.assertEqual(permisos['Funcionario']['solicitudes.crear'], 'propio')
        self.assertEqual(permisos['Jefe de Departamento']['solicitudes.aprobar'], 'departamento')
        self.assertEqual(permisos['Alcalde']['solicitudes.aprobar'], 'todos')
        self.assertNotIn('presupuesto.ajustar', RolProyecto.objects.get(nombre='Responsable').permisos)
        self.assertEqual(Solicitud.objects.count(), 0)
