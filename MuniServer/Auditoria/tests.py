"""Auditoría: cadena inalterable, cambios con antes y después, sesiones y permisos."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from Configuracion.models import Configuracion
from Feedback.models import Feedback
from MuniServer.pruebas import CLAVE, Escenario
from Projects.models import Estado

from . import servicios, sesiones
from .models import RegistroAuditoria, RegistroInmutable, SesionUsuario
from .senales import OCULTO

API = '/api/v1'


class CadenaTests(TestCase):
    def setUp(self):
        for i in range(4):
            servicios.registrar('otros', 'crear', objeto_repr=f'registro {i}')

    def test_los_registros_se_encadenan_y_verifican(self):
        regs = list(RegistroAuditoria.objects.order_by('id'))
        self.assertEqual(regs[1].hash_anterior, regs[0].hash)
        self.assertEqual(servicios.verificar_cadena(), {'ok': True, 'revisados': 4, 'registro': None, 'fecha': None, 'motivo': ''})

    def test_no_se_editan_ni_se_borran_desde_la_aplicacion(self):
        reg = RegistroAuditoria.objects.first()
        reg.motivo = 'otro'
        with self.assertRaises(RegistroInmutable):
            reg.save()
        with self.assertRaises(RegistroInmutable):
            reg.delete()

    def test_detecta_un_registro_alterado_en_la_base(self):
        segundo = RegistroAuditoria.objects.order_by('id')[1]
        RegistroAuditoria.objects.filter(pk=segundo.pk).update(objeto_repr='cambiado a mano')
        resultado = servicios.verificar_cadena()
        self.assertFalse(resultado['ok'])
        self.assertEqual(resultado['registro'], segundo.pk)
        self.assertIn('cambió', resultado['motivo'])

    def test_detecta_registros_borrados_en_medio_o_al_final(self):
        ids = list(RegistroAuditoria.objects.order_by('id').values_list('id', flat=True))
        RegistroAuditoria.objects.filter(pk=ids[1]).delete()
        self.assertIn('Falta', servicios.verificar_cadena()['motivo'])
        RegistroAuditoria.objects.filter(pk=ids[2]).delete()
        RegistroAuditoria.objects.filter(pk=ids[3]).delete()
        self.assertIn('más recientes', servicios.verificar_cadena()['motivo'])

    def test_la_retencion_borra_lo_viejo_sin_romper_la_cadena_y_lo_anota(self):
        Configuracion.actual()  # crearla también queda en la auditoría
        dentro_de_seis_anios = timezone.now() + timedelta(days=6 * 365)
        self.assertEqual(servicios.depurar(dentro_de_seis_anios), 5)
        self.assertTrue(servicios.verificar_cadena()['ok'])
        self.assertEqual(RegistroAuditoria.objects.get().accion, 'depurar')


class CambiosTests(Escenario, APITestCase):
    def ultimo(self, **filtro):
        return RegistroAuditoria.objects.filter(**filtro).order_by('-id').first()

    def test_editar_un_proyecto_guarda_quien_desde_donde_y_el_antes_y_despues(self):
        url = f'{API}/projects/proyectosWrite/{self.proyecto.pk}/'
        en_progreso = Estado.objects.get(name='En progreso')
        r = self.como(self.admin).patch(url, {'name': 'Proyecto renombrado', 'estado_ID': str(en_progreso.pk)}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        reg = self.ultimo(modulo='proyectos', accion='editar')
        self.assertEqual(reg.usuario_id, self.admin.pk)
        self.assertEqual(reg.rol, 'Administrador')
        self.assertEqual(reg.ip, '127.0.0.1')
        self.assertEqual(reg.cambios['name'], ['Proyecto P', 'Proyecto renombrado'])
        # En los campos que apuntan a otro objeto se guarda su nombre, no el id.
        self.assertEqual(reg.cambios['estado_ID'], ['Pendiente', 'En progreso'])
        self.assertEqual(reg.objeto_repr, 'Proyecto renombrado')

    def test_la_contrasena_nunca_se_guarda(self):
        self.dueno.set_password('otra-clave-larga-123')
        self.dueno.save()
        reg = self.ultimo(modulo='usuarios')
        self.assertEqual(reg.accion, 'cambiar_clave')
        self.assertEqual(reg.cambios, {'password': [OCULTO, OCULTO]})

    def test_dar_de_baja_y_borrar_tienen_su_propia_accion(self):
        self.assertEqual(self.como(self.admin).delete(f'{API}/users/users/{self.ajeno.pk}/').status_code, 204)
        self.assertEqual(self.ultimo(modulo='usuarios').accion, 'baja')
        comentario = Feedback.objects.create(proyecto_ID=self.proyecto, user_ID=self.dueno, info='Hola')
        comentario.delete()
        reg = self.ultimo(modulo='comentarios')
        self.assertEqual((reg.accion, reg.objeto_repr), ('eliminar', 'Hola'))

    def test_un_intento_sin_permiso_queda_anotado(self):
        r = self.como(self.ajeno).patch(f'{API}/projects/proyectosWrite/{self.proyecto.pk}/', {'name': 'x'}, format='json')
        self.assertIn(r.status_code, (403, 404))
        r = self.como(self.dueno).get(f'{API}/auditoria/registros/')
        self.assertEqual(r.status_code, 403)
        reg = self.ultimo(resultado='denegado')
        self.assertEqual((reg.usuario_id, reg.modulo, reg.accion), (self.dueno.pk, 'auditoria', 'ver'))
        self.assertIn('auditoría', reg.motivo)


class SesionesTests(Escenario, APITestCase):
    def entrar(self, usuario, cliente=None):
        cliente = cliente or APIClient()
        r = cliente.post(f'{API}/users/login/', {'email': usuario.email, 'password': CLAVE}, format='json',
                         HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36')
        self.assertEqual(r.status_code, 200, r.data)
        return cliente

    def test_el_inicio_abre_una_sesion_y_los_tokens_la_llevan(self):
        cliente = self.entrar(self.dueno)
        sesion = SesionUsuario.objects.get(usuario=self.dueno)
        self.assertEqual(servicios.describir_agente(sesion.agente), 'Chrome en Windows')
        self.assertEqual(AccessToken(cliente.cookies['muni_access'].value)['sid'], str(sesion.pk))
        self.assertEqual(RefreshToken(cliente.cookies['muni_refresh'].value)['sid'], str(sesion.pk))
        reg = RegistroAuditoria.objects.get(accion='iniciar_sesion')
        self.assertEqual((reg.usuario_id, reg.sesion), (self.dueno.pk, sesion.pk))

    def test_los_intentos_fallidos_se_anotan_sin_guardar_lo_que_se_escribio(self):
        APIClient().post(f'{API}/users/login/', {'email': self.dueno.email, 'password': 'mala'}, format='json')
        APIClient().post(f'{API}/users/login/', {'email': 'mi-clave-secreta', 'password': 'mala'}, format='json')
        conocido, desconocido = RegistroAuditoria.objects.filter(accion='fallo_inicio').order_by('id')
        self.assertEqual((conocido.objeto_id, conocido.usuario_email, conocido.resultado), (str(self.dueno.pk), self.dueno.email, 'fallo'))
        self.assertEqual((desconocido.objeto_id, desconocido.usuario_email), ('', ''))
        self.assertIn('no registrado', desconocido.motivo)

    def test_la_actividad_suma_solo_los_huecos_cortos(self):
        cliente = self.entrar(self.dueno)
        sesion = SesionUsuario.objects.get(usuario=self.dueno)
        SesionUsuario.objects.filter(pk=sesion.pk).update(ultima_actividad=timezone.now() - timedelta(minutes=5))
        cliente.get(f'{API}/users/me/')
        sesion.refresh_from_db()
        self.assertAlmostEqual(sesion.segundos_activos, 300, delta=5)
        SesionUsuario.objects.filter(pk=sesion.pk).update(ultima_actividad=timezone.now() - timedelta(hours=2))
        cliente.get(f'{API}/users/me/')
        sesion.refresh_from_db()
        self.assertAlmostEqual(sesion.segundos_activos, 300, delta=5)

    def test_cerrar_a_distancia_corta_el_acceso_y_la_renovacion(self):
        cliente = self.entrar(self.dueno)
        self.assertEqual(cliente.get(f'{API}/users/me/').status_code, 200)
        sesion = SesionUsuario.objects.get(usuario=self.dueno)
        r = self.como(self.admin).post(f'{API}/auditoria/sesiones/{sesion.pk}/cerrar/')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(cliente.get(f'{API}/users/me/').status_code, 401)
        self.assertEqual(cliente.post(f'{API}/users/token/refresh/').status_code, 401)
        sesion.refresh_from_db()
        self.assertEqual((sesion.motivo_cierre, sesion.cerrada_por_id), ('remota', self.admin.pk))
        self.assertTrue(RegistroAuditoria.objects.filter(accion='cerrar_sesion_remota', objeto_id=str(self.dueno.pk)).exists())

    def test_solo_cierra_quien_puede_gestionar_a_esa_persona(self):
        self.entrar(self.admin)
        sesion = SesionUsuario.objects.get(usuario=self.admin)
        self.assertEqual(self.como(self.alcalde).post(f'{API}/auditoria/sesiones/{sesion.pk}/cerrar/').status_code, 403)
        self.assertEqual(self.como(self.admin).post(f'{API}/auditoria/sesiones/{sesion.pk}/cerrar/').status_code, 200)

    def test_cerrar_sesion_y_dar_de_baja_cierran_las_sesiones(self):
        cliente = self.entrar(self.dueno)
        cliente.post(f'{API}/users/logout/')
        self.assertEqual(SesionUsuario.objects.get(usuario=self.dueno).motivo_cierre, 'cierre')
        self.assertTrue(RegistroAuditoria.objects.filter(accion='cerrar_sesion', usuario=self.dueno).exists())
        self.entrar(self.ajeno)
        self.como(self.admin).delete(f'{API}/users/users/{self.ajeno.pk}/')
        self.assertEqual(SesionUsuario.objects.get(usuario=self.ajeno).motivo_cierre, 'baja')

    def test_las_sesiones_sin_actividad_vencen(self):
        self.entrar(self.dueno)
        SesionUsuario.objects.update(ultima_actividad=timezone.now() - timedelta(days=8))
        self.assertEqual(sesiones.vencer(), 1)
        self.assertEqual(SesionUsuario.objects.get().motivo_cierre, 'vencida')


class ConsultaTests(Escenario, APITestCase):
    def test_quien_ve_la_auditoria(self):
        self.assertEqual(self.como(self.dueno).get(f'{API}/auditoria/registros/').status_code, 403)
        self.assertEqual(self.como(self.jefe_a).get(f'{API}/auditoria/resumen/').status_code, 403)
        self.assertEqual(self.como(self.alcalde).get(f'{API}/auditoria/registros/').status_code, 200)
        self.assertEqual(self.como(self.admin).get(f'{API}/auditoria/verificar/').data['ok'], True)

    def test_filtros(self):
        servicios.registrar('proyectos', 'editar', usuario=self.dueno, objeto_repr='Acera')
        servicios.registrar('tareas', 'crear', usuario=self.jefe_a, objeto_repr='Bacheo')
        c = self.como(self.admin)
        r = c.get(f'{API}/auditoria/registros/', {'modulo': 'tareas'})
        nombres = [f['objeto_repr'] for f in r.data['results']]
        self.assertIn('Bacheo', nombres)
        self.assertNotIn('Acera', nombres)
        r = c.get(f'{API}/auditoria/registros/', {'usuario': str(self.dueno.pk), 'q': 'ace'})
        self.assertEqual([f['objeto_repr'] for f in r.data['results']], ['Acera'])
        hoy = timezone.localdate()
        self.assertEqual(c.get(f'{API}/auditoria/registros/', {'hasta': (hoy - timedelta(days=1)).isoformat()}).data['count'], 0)

    def test_la_actividad_es_propia_o_de_quien_audita(self):
        self.assertEqual(self.como(self.dueno).get(f'{API}/auditoria/actividad/{self.dueno.pk}/').status_code, 200)
        self.assertEqual(self.como(self.dueno).get(f'{API}/auditoria/actividad/{self.ajeno.pk}/').status_code, 403)
        r = self.como(self.alcalde).get(f'{API}/auditoria/actividad/{self.dueno.pk}/')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['puede_cerrar'])

    def test_exportar_en_csv_y_json_y_queda_anotado(self):
        servicios.registrar('proyectos', 'editar', objeto_repr='=HYPERLINK("http://x")')
        c = self.como(self.admin)
        r = c.get(f'{API}/auditoria/registros/exportar/', {'formato': 'csv', 'modulo': 'proyectos'})
        self.assertEqual(r.status_code, 200)
        texto = r.content.decode('utf-8')
        self.assertTrue(texto.startswith('﻿id,creado_en'))
        self.assertIn("'=HYPERLINK", texto)  # no se interpreta como fórmula en Excel
        r = c.get(f'{API}/auditoria/registros/exportar/', {'formato': 'json'})
        self.assertEqual(r['Content-Type'], 'application/json; charset=utf-8')
        self.assertEqual(RegistroAuditoria.objects.filter(modulo='auditoria', accion='exportar').count(), 2)

    def test_exportar_un_reporte_queda_anotado(self):
        r = self.como(self.dueno).post(f'{API}/auditoria/exportaciones/', {'formato': 'xlsx', 'cantidad': 3, 'filtros': {'estado': 'Pendiente'}}, format='json')
        self.assertEqual(r.status_code, 201)
        reg = RegistroAuditoria.objects.get(modulo='reportes')
        self.assertEqual(reg.usuario_id, self.dueno.pk)
        self.assertIn('3 proyectos', reg.motivo)

    def test_el_resumen_avisa_de_los_intentos_fallidos(self):
        for _ in range(5):
            APIClient().post(f'{API}/users/login/', {'email': self.dueno.email, 'password': 'mala'}, format='json')
        r = self.como(self.admin).get(f'{API}/auditoria/resumen/')
        self.assertEqual(r.data['fallidos_24h'], 5)
        self.assertEqual([(p['email'], p['intentos']) for p in r.data['con_intentos_fallidos']], [(self.dueno.email, 5)])

    def test_la_lista_de_usuarios_trae_la_ultima_conexion(self):
        SesionUsuario.objects.create(usuario=self.dueno)
        r = self.como(self.admin).get(f'{API}/users/users/{self.dueno.pk}/')
        self.assertIsNotNone(r.data['ultima_conexion'])
        self.assertNotIn('ultima_conexion', self.como(self.ajeno).get(f'{API}/users/users/{self.dueno.pk}/').data)
