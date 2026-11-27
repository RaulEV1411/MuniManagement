"""Ley 8968: identificación con tipo, aviso de privacidad con versión, «Mis datos», exportación y anonimización."""
from rest_framework.test import APIClient, APITestCase

from Auditoria.models import RegistroAuditoria, SesionUsuario
from Configuracion.models import Configuracion
from MuniServer.pruebas import CLAVE, Escenario
from Users.models import Users

API = '/api/v1/users'


class IdentificacionTests(Escenario, APITestCase):
    def editar(self, **datos):
        return self.como(self.admin).patch(f'{API}/users/{self.dueno.pk}/', datos, format='json')

    def test_se_valida_y_normaliza_segun_el_tipo(self):
        r = self.editar(tipo_identificacion='fisica', cedula='2-0345-0678')
        self.assertEqual((r.status_code, r.data['cedula']), (200, '203450678'))
        self.assertEqual(self.editar(cedula='12345').status_code, 400)
        self.assertEqual(self.editar(tipo_identificacion='dimex', cedula='155812345678').status_code, 200)
        self.assertEqual(self.editar(tipo_identificacion='pasaporte', cedula='ab 1234567').data['cedula'], 'AB1234567')
        self.assertEqual(self.editar(tipo_identificacion='nite', cedula='123').status_code, 400)

    def test_identificacion_repetida_y_telefono(self):
        r = self.editar(tipo_identificacion='fisica', cedula=f'{self.ajeno.cedula[0]}-{self.ajeno.cedula[1:5]}-{self.ajeno.cedula[5:]}')
        self.assertEqual(r.status_code, 400)
        self.assertIn('Ya hay', str(r.data))
        self.assertEqual(self.editar(phone_number='+506 8888-1234').data['phone_number'], '+50688881234')
        self.assertEqual(self.editar(phone_number='123').status_code, 400)

    def test_la_persona_no_cambia_su_propia_identificacion(self):
        r = self.como(self.dueno).patch(f'{API}/users/{self.dueno.pk}/', {'tipo_identificacion': 'dimex'}, format='json')
        self.assertEqual(r.status_code, 403)


class AvisoDePrivacidadTests(Escenario, APITestCase):
    def test_se_acepta_por_version_y_una_nueva_se_vuelve_a_pedir(self):
        c = self.como(self.dueno)
        self.assertTrue(c.get(f'{API}/me/').data['privacidad_pendiente'])
        self.assertEqual(c.post(f'{API}/aceptar-privacidad/', {'version': 99}, format='json').status_code, 409)
        self.assertEqual(c.post(f'{API}/aceptar-privacidad/', {'version': 1}, format='json').status_code, 200)
        self.dueno.refresh_from_db()
        self.assertEqual(self.dueno.privacidad_version, 1)
        self.assertIsNotNone(self.dueno.privacidad_aceptada_en)
        self.assertFalse(c.get(f'{API}/me/').data['privacidad_pendiente'])

        encargados = [{'nombre': 'Proveedor de correo', 'datos': 'Correo y nombre', 'finalidad': 'Enviar avisos', 'pais': 'Estados Unidos'}]
        r = self.como(self.admin).patch('/api/v1/configuracion/', {'encargados': encargados}, format='json')
        self.assertEqual((r.status_code, r.data['privacidad_version']), (200, 2))
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.privacidad_version, 2)  # quien publica ya lo leyó
        self.assertEqual(self.client.patch('/api/v1/configuracion/', {'moneda': 'USD'}, format='json').data['privacidad_version'], 2)
        self.assertTrue(self.como(self.dueno).get(f'{API}/me/').data['privacidad_pendiente'])
        # El aviso es público (lo lee el login y la página /privacidad).
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/v1/configuracion/').data['encargados'][0]['pais'], 'Estados Unidos')

    def test_los_encargados_se_validan(self):
        r = self.como(self.admin).patch('/api/v1/configuracion/', {'encargados': [{'datos': 'x'}]}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Configuracion.actual().privacidad_version, 1)


class MisDatosTests(Escenario, APITestCase):
    def test_la_persona_descarga_todo_lo_suyo_y_queda_anotado(self):
        r = self.como(self.dueno).get(f'{API}/users/{self.dueno.pk}/datos/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['persona']['identificacion'], self.dueno.cedula)
        self.assertEqual([p['nombre'] for p in r.data['proyectos_a_cargo']], ['Proyecto P'])
        for seccion in ('tareas_asignadas', 'equipos', 'comentarios', 'solicitudes', 'sesiones', 'acciones'):
            self.assertIn(seccion, r.data)
        self.assertTrue(RegistroAuditoria.objects.filter(accion='exportar', objeto_id=str(self.dueno.pk)).exists())
        self.assertEqual(self.como(self.jefe_a).get(f'{API}/users/{self.dueno.pk}/datos/').status_code, 403)
        self.assertEqual(self.como(self.admin).get(f'{API}/users/{self.dueno.pk}/datos/').status_code, 200)

    def test_exportar_usuarios_pide_permiso_y_datos_de_todos(self):
        self.assertEqual(self.como(self.jefe_a).get(f'{API}/users/exportar/').status_code, 403)
        r = self.como(self.alcalde).get(f'{API}/users/exportar/')
        self.assertEqual(r.status_code, 200)
        texto = r.content.decode('utf-8')
        self.assertTrue(texto.startswith('﻿Nombre,Apellidos,Tipo de identificación'))
        self.assertIn(self.dueno.email, texto)
        self.assertTrue(RegistroAuditoria.objects.filter(modulo='usuarios', accion='exportar', objeto_repr='Lista de usuarios (CSV)').exists())


class AnonimizarTests(Escenario, APITestCase):
    def url(self, u):
        return f'{API}/users/{u.pk}/anonimizar/'

    def test_solo_el_administrador_y_con_la_cuenta_de_baja(self):
        self.assertEqual(self.como(self.admin).post(self.url(self.ajeno)).status_code, 400)  # sigue activa
        APIClient().post(f'{API}/login/', {'email': self.ajeno.email, 'password': CLAVE}, format='json')
        self.como(self.admin).delete(f'{API}/users/{self.ajeno.pk}/')
        self.assertEqual(self.como(self.alcalde).post(self.url(self.ajeno)).status_code, 403)
        correo = self.ajeno.email
        r = self.como(self.admin).post(self.url(self.ajeno), {'motivo': 'Lo pidió por escrito'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.ajeno.refresh_from_db()
        self.assertEqual((self.ajeno.first_name, self.ajeno.last_name, self.ajeno.phone_number), ('Persona', 'anonimizada', ''))
        self.assertTrue(self.ajeno.email.endswith('@anonimo.invalid'))
        self.assertFalse(SesionUsuario.objects.filter(usuario=self.ajeno).exists())
        reg = RegistroAuditoria.objects.get(accion='anonimizar')
        self.assertEqual(reg.motivo, 'Lo pidió por escrito')
        self.assertNotIn(correo, str(reg.cambios))  # la auditoría no guarda lo que se borró
        self.assertEqual(self.client.post(self.url(self.ajeno)).status_code, 400)  # ya está anonimizada
        self.assertTrue(Users.objects.filter(pk=self.ajeno.pk).exists())
