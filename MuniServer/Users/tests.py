from datetime import timedelta

from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import AccessToken

from MuniServer.pruebas import CLAVE, Escenario, crear_usuario, sembrar
from .views import GRACIA_DE_ROTACION


class SesionTests(APITestCase):
    def setUp(self):
        cache.clear()
        sembrar()
        self.usuario = crear_usuario()

    def iniciar_sesion(self, clave=CLAVE):
        return self.client.post('/api/v1/users/login/', {'email': self.usuario.email, 'password': clave}, format='json')

    def test_login_fija_cookies_httponly_y_no_devuelve_tokens(self):
        r = self.iniciar_sesion()
        self.assertEqual(r.status_code, 200)
        self.assertFalse({'access', 'refresh'} & set(r.data))
        self.assertTrue(r.data['csrf_token'])
        self.assertTrue(r.cookies['muni_access']['httponly'])
        self.assertTrue(r.cookies['muni_refresh']['httponly'])
        self.assertEqual(r.cookies['muni_refresh']['path'], '/api/v1/users/')
        me = self.client.get('/api/v1/users/me/')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data['email'], self.usuario.email)

    def test_login_con_clave_incorrecta(self):
        self.assertEqual(self.iniciar_sesion('otra-clave').status_code, 400)

    def test_sin_sesion_no_entra(self):
        self.assertEqual(self.client.get('/api/v1/users/me/').status_code, 401)

    def test_refresh_rota_y_el_anterior_queda_revocado_tras_la_gracia(self):
        self.iniciar_sesion()
        anterior = self.client.cookies['muni_refresh'].value
        r = self.client.post('/api/v1/users/token/refresh/')
        self.assertEqual(r.status_code, 200)
        self.assertNotEqual(r.cookies['muni_refresh'].value, anterior)
        self.client.cookies.clear()
        # Si la respuesta de la rotación no llegó (recarga en medio, dos pestañas), el anterior vale unos segundos.
        en_gracia = self.client.post('/api/v1/users/token/refresh/', {'refresh': anterior}, format='json')
        self.assertEqual(en_gracia.status_code, 200)
        self.assertNotIn(en_gracia.cookies['muni_refresh'].value, ('', anterior))
        self.client.cookies.clear()
        BlacklistedToken.objects.update(blacklisted_at=timezone.now() - GRACIA_DE_ROTACION - timedelta(seconds=1))
        repetido = self.client.post('/api/v1/users/token/refresh/', {'refresh': anterior}, format='json')
        self.assertEqual(repetido.status_code, 401)

    def test_access_vencido_da_401_y_el_refresh_lo_renueva(self):
        self.iniciar_sesion()
        vencido = AccessToken(self.client.cookies['muni_access'].value)
        vencido.set_exp(lifetime=-timedelta(seconds=1))
        self.client.cookies['muni_access'] = str(vencido)
        self.assertEqual(self.client.get('/api/v1/users/me/').status_code, 401)
        self.assertEqual(self.client.post('/api/v1/users/token/refresh/').status_code, 200)
        self.assertEqual(self.client.get('/api/v1/users/me/').status_code, 200)

    def test_la_gracia_no_revive_una_sesion_cerrada(self):
        self.iniciar_sesion()
        anterior = self.client.cookies['muni_refresh'].value
        self.client.post('/api/v1/users/token/refresh/')
        self.assertEqual(self.client.post('/api/v1/users/logout/').status_code, 200)
        self.client.cookies.clear()
        self.assertEqual(self.client.post('/api/v1/users/token/refresh/', {'refresh': anterior}, format='json').status_code, 401)

    def test_logout_revoca_el_refresh_y_borra_las_cookies(self):
        self.iniciar_sesion()
        refresh = self.client.cookies['muni_refresh'].value
        r = self.client.post('/api/v1/users/logout/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.cookies['muni_access'].value, '')
        self.client.cookies.clear()
        self.assertEqual(self.client.post('/api/v1/users/token/refresh/', {'refresh': refresh}, format='json').status_code, 401)

    def test_con_cookie_las_escrituras_exigen_el_token_csrf(self):
        cliente = APIClient(enforce_csrf_checks=True)
        csrf = cliente.post('/api/v1/users/login/', {'email': self.usuario.email, 'password': CLAVE}, format='json').data['csrf_token']
        datos = {'current_password': CLAVE, 'new_password': 'Palmeras-Cafe-2026'}
        self.assertEqual(cliente.get('/api/v1/users/me/').status_code, 200)
        self.assertEqual(cliente.post('/api/v1/users/change-password/', datos, format='json').status_code, 403)
        self.assertEqual(cliente.post('/api/v1/users/change-password/', datos, format='json', HTTP_X_CSRFTOKEN=csrf).status_code, 200)


class BajaDeUsuariosTests(Escenario, APITestCase):
    def test_borrar_un_usuario_lo_da_de_baja_y_no_puede_entrar(self):
        r = self.como(self.admin).delete(f'/api/v1/users/users/{self.ajeno.user_ID}/')
        self.assertEqual(r.status_code, 204)
        self.ajeno.refresh_from_db()
        self.assertFalse(self.ajeno.is_active)
        self.assertNotIn(str(self.ajeno.user_ID), self.ids(self.client.get('/api/v1/users/users/'), 'user_ID'))
        self.assertIn(str(self.ajeno.user_ID), self.ids(self.client.get('/api/v1/users/users/', {'incluir_inactivos': '1'}), 'user_ID'))
        self.client.force_authenticate(None)
        login = self.client.post('/api/v1/users/login/', {'email': self.ajeno.email, 'password': CLAVE}, format='json')
        self.assertEqual(login.status_code, 400)

    def test_nadie_se_reactiva_a_si_mismo(self):
        r = self.como(self.dueno).patch(f'/api/v1/users/users/{self.dueno.user_ID}/', {'is_active': False}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_dar_de_baja_revoca_sus_sesiones(self):
        self.client.force_authenticate(None)
        self.client.post('/api/v1/users/login/', {'email': self.ajeno.email, 'password': CLAVE}, format='json')
        refresh = self.client.cookies['muni_refresh'].value
        self.como(self.admin).delete(f'/api/v1/users/users/{self.ajeno.user_ID}/')
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/api/v1/users/token/refresh/', {'refresh': refresh}, format='json').status_code, 401)


import re
from unittest import mock

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile


class LimiteDeLoginTests(Escenario, APITestCase):
    def intento(self, email, clave='mala'):
        self.client.force_authenticate(None)
        return self.client.post('/api/v1/users/login/', {'email': email, 'password': clave}, format='json')

    def test_cinco_intentos_por_correo_y_despues_429(self):
        for _ in range(5):
            self.assertEqual(self.intento(self.dueno.email).status_code, 400)
        r = self.intento(self.dueno.email, CLAVE)
        self.assertEqual(r.status_code, 429)
        self.assertIn('Demasiados intentos', r.data['error'])

    def test_otra_cuenta_desde_la_misma_ip_sigue_entrando(self):
        for _ in range(5):
            self.intento(self.dueno.email)
        self.assertEqual(self.intento(self.ajeno.email, CLAVE).status_code, 200)


class EnlaceDeAccesoTests(Escenario, APITestCase):
    def enlace_del_correo(self):
        self.assertEqual(len(mail.outbox), 1)
        cuerpo = mail.outbox[0].alternatives[0][0]
        uid, token = re.search(r'https://muni\.test/definir-clave/([^/"]+)/([^/"\s<]+)', cuerpo).groups()
        return uid, token

    def crear_por_api(self):
        r = self.como(self.admin).post('/api/v1/users/users/', {
            'first_name': 'Nueva', 'last_name': 'Persona', 'cedula': 555555555, 'email': 'nueva@muni.test',
            'phone_number': 88887777, 'puesto': 'Inspectora', 'role': str(self.dueno.role_id),
            'departamento_ID': str(self.depto_a.pk), 'birthday': '1995-05-05', 'password': 'ignorada',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        return r.data['user_ID']

    def test_la_cuenta_nueva_recibe_un_enlace_y_no_una_contrasena(self):
        from Users.models import Users
        self.crear_por_api()
        nueva = Users.objects.get(email='nueva@muni.test')
        self.assertFalse(nueva.has_usable_password())
        uid, token = self.enlace_del_correo()
        self.assertNotIn('ignorada', mail.outbox[0].body)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/api/v1/users/definir-clave/', {'uid': uid, 'token': token, 'password': '123'}, format='json').status_code, 400)
        r = self.client.post('/api/v1/users/definir-clave/', {'uid': uid, 'token': token, 'password': 'Palmeras-Cafe-2026'}, format='json')
        self.assertEqual(r.status_code, 200)
        login = self.client.post('/api/v1/users/login/', {'email': 'nueva@muni.test', 'password': 'Palmeras-Cafe-2026'}, format='json')
        self.assertEqual(login.status_code, 200)
        repetido = self.client.post('/api/v1/users/definir-clave/', {'uid': uid, 'token': token, 'password': 'Otra-Clave-Larga-1'}, format='json')
        self.assertEqual(repetido.status_code, 400)

    def test_olvide_clave_responde_igual_exista_o_no(self):
        self.client.force_authenticate(None)
        r1 = self.client.post('/api/v1/users/olvide-clave/', {'email': 'nadie@muni.test'}, format='json')
        self.assertEqual(len(mail.outbox), 0)
        r2 = self.client.post('/api/v1/users/olvide-clave/', {'email': self.dueno.email.upper()}, format='json')
        self.assertEqual((r1.status_code, r1.data), (r2.status_code, r2.data))
        self.enlace_del_correo()

    def test_solo_la_alcaldia_reenvia_el_acceso(self):
        url = f'/api/v1/users/users/{self.dueno.user_ID}/enviar-acceso/'
        self.assertEqual(self.como(self.dueno).post(url).status_code, 403)
        self.assertEqual(self.como(self.alcalde).post(url).status_code, 200)
        self.enlace_del_correo()

    def test_cambiar_la_clave_aplica_los_validadores(self):
        r = self.como(self.dueno).post('/api/v1/users/change-password/', {'current_password': CLAVE, 'new_password': '12345678'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post('/api/v1/users/change-password/', {'current_password': CLAVE, 'new_password': 'Palmeras-Cafe-2026'}, format='json')
        self.assertEqual(r.status_code, 200)


class SubidasTests(Escenario, APITestCase):
    def foto(self, contenido, nombre='foto.jpg'):
        return SimpleUploadedFile(nombre, contenido, content_type='image/jpeg')

    def test_rechaza_lo_que_no_es_imagen_y_lo_que_pesa_mas_de_5_mb(self):
        url = f'/api/v1/users/upload-photo/{self.dueno.user_ID}/'
        c = self.como(self.dueno)
        self.assertEqual(c.post(url, {'image': self.foto(b'<script>alert(1)</script>')}, format='multipart').status_code, 400)
        grande = self.foto(b'\xff\xd8\xff\xe0' + b'0' * (5 * 1024 * 1024))
        self.assertEqual(c.post(url, {'image': grande}, format='multipart').status_code, 400)

    @mock.patch('Projects.views.subir_imagen', return_value={'secure_url': 'https://img.test/p.jpg', 'public_id': 'p'})
    def test_una_imagen_valida_se_sube(self, subir):
        r = self.como(self.dueno).post('/api/v1/projects/project-images/', {
            'proyecto_ID': str(self.proyecto.proyect_ID), 'image': self.foto(b'\x89PNG\r\n\x1a\n' + b'0' * 50, 'a.png'),
        }, format='multipart')
        self.assertEqual(r.status_code, 201)
        subir.assert_called_once()


class DatosPersonalesTests(Escenario, APITestCase):
    PERSONALES = {'cedula', 'phone_number', 'birthday'}

    def test_las_respuestas_anidadas_no_traen_datos_personales(self):
        r = self.como(self.dueno).get('/api/v1/task/tareas/', {'proyecto_ID': self.proyecto.proyect_ID})
        self.assertFalse(self.PERSONALES & set(r.data['results'][0]['asignado_a']))
        r = self.client.get('/api/v1/projects/proyectosRead/')
        self.assertFalse(self.PERSONALES & set(r.data['results'][0]['user_ID']))

    def test_un_jefe_ve_el_directorio_y_la_alcaldia_la_ficha(self):
        fila = self.como(self.jefe_a).get(f'/api/v1/users/users/{self.dueno.user_ID}/').data
        self.assertFalse(self.PERSONALES & set(fila))
        self.assertIn('cedula', self.como(self.alcalde).get(f'/api/v1/users/users/{self.dueno.user_ID}/').data)
        self.assertIn('cedula', self.como(self.dueno).get(f'/api/v1/users/users/{self.dueno.user_ID}/').data)


class SaludTests(APITestCase):
    def test_health_responde_sin_sesion(self):
        r = self.client.get('/api/v1/health/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {'estado': 'ok', 'db': 'ok', 'cache': 'ok'})


class CrearAdminTests(APITestCase):
    def test_crea_el_primer_admin_con_su_departamento_y_enlace(self):
        import io
        from django.core.management import call_command
        sembrar()
        salida = io.StringIO()
        call_command('crear_admin', email='Jefa@Muni.test', nombre='Ana', apellido='Mora', cedula=111, stdout=salida)
        from Users.models import Users
        u = Users.objects.get(email='jefa@muni.test')
        self.assertEqual(u.role.name, 'Administrador')
        self.assertEqual(u.departamento_ID.direccion.name, 'Alcaldía')
        self.assertFalse(u.has_usable_password())
        self.assertIn('https://muni.test/definir-clave/', salida.getvalue())


class JerarquiaDeUsuariosTests(Escenario, APITestCase):
    """Cada quien ve a los usuarios que su lugar en la jerarquía le permite, sin datos personales."""
    PERSONALES = {'cedula', 'phone_number', 'birthday'}

    def visibles(self, usuario):
        r = self.como(usuario).get('/api/v1/users/users/', {'page_size': 100})
        self.assertEqual(r.status_code, 200)
        return {f['user_ID'] for f in r.data['results']}

    def ids(self, *usuarios):
        return {str(u.user_ID) for u in usuarios}

    def test_un_funcionario_ve_a_su_departamento_y_a_su_equipo_sin_datos_personales(self):
        # asignado es de otro departamento, pero tiene una tarea en el proyecto de dueno.
        self.assertEqual(self.visibles(self.dueno), self.ids(self.admin, self.alcalde, self.jefe_a, self.dueno, self.companero, self.asignado))
        ficha = self.client.get(f'/api/v1/users/users/{self.companero.user_ID}/')
        self.assertFalse(self.PERSONALES & set(ficha.data))
        self.assertEqual(self.client.get(f'/api/v1/users/users/{self.ajeno.user_ID}/').status_code, 404)

    def test_el_jefe_de_departamento_ve_su_departamento(self):
        self.assertEqual(self.visibles(self.jefe_b), self.ids(self.jefe_b, self.ajeno, self.asignado))

    def test_el_equipo_de_un_proyecto_se_ve_sin_importar_la_jerarquia(self):
        # asignado (depto B) ve al dueño y a los compañeros del proyecto, no a todo el depto A.
        vistos = self.visibles(self.asignado)
        self.assertIn(str(self.dueno.user_ID), vistos)
        self.assertNotIn(str(self.companero.user_ID), vistos)
        # Y alguien de B que no está en el proyecto no ve al dueño.
        self.assertNotIn(str(self.dueno.user_ID), self.visibles(self.ajeno))

    def test_la_membresia_vigente_suma_al_equipo_y_la_vencida_no(self):
        from datetime import timedelta
        from django.utils import timezone
        from Projects.models import MiembroProyecto, RolProyecto
        m = MiembroProyecto.objects.create(proyecto=self.proyecto, usuario=self.jefe_b, otorgado_por=self.alcalde,
                                           rol=RolProyecto.objects.get(nombre='Observador'))
        self.assertIn(str(self.dueno.user_ID), self.visibles(self.jefe_b))
        self.assertIn(str(self.jefe_b.user_ID), self.visibles(self.dueno))
        m.hasta = timezone.localdate() - timedelta(days=1)
        m.desde = m.hasta - timedelta(days=5)
        m.save()
        self.assertNotIn(str(self.dueno.user_ID), self.visibles(self.jefe_b))

    def test_el_jefe_de_direccion_ve_todos_sus_departamentos(self):
        self.direccion.jefe = self.jefe_b
        self.direccion.save()
        self.assertIn(str(self.dueno.user_ID), self.visibles(self.jefe_b))

    def test_la_alcaldia_ve_a_todos(self):
        self.assertTrue(self.ids(self.dueno, self.ajeno, self.asignado, self.jefe_b) <= self.visibles(self.alcalde))

    def test_no_ve_a_los_dados_de_baja_ni_aunque_los_pida(self):
        self.companero.is_active = False
        self.companero.save()
        r = self.como(self.dueno).get('/api/v1/users/users/', {'incluir_inactivos': '1'})
        self.assertNotIn(str(self.companero.user_ID), {f['user_ID'] for f in r.data['results']})

    def test_sigue_sin_poder_editar_a_otros(self):
        r = self.como(self.dueno).patch(f'/api/v1/users/users/{self.companero.user_ID}/', {'puesto': 'x'}, format='json')
        self.assertEqual(r.status_code, 403)
