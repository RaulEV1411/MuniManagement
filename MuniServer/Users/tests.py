from django.core.cache import cache
from rest_framework.test import APITestCase

from MuniServer.pruebas import CLAVE, Escenario, crear_usuario, sembrar


class SesionTests(APITestCase):
    def setUp(self):
        cache.clear()
        sembrar()
        self.usuario = crear_usuario()

    def iniciar_sesion(self, clave=CLAVE):
        return self.client.post('/users/login/', {'email': self.usuario.email, 'password': clave}, format='json')

    def test_login_entrega_tokens_que_sirven_para_me(self):
        r = self.iniciar_sesion()
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        me = self.client.get('/users/me/')
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data['email'], self.usuario.email)

    def test_login_con_clave_incorrecta(self):
        self.assertEqual(self.iniciar_sesion('otra-clave').status_code, 400)

    def test_sin_token_no_entra(self):
        self.assertEqual(self.client.get('/users/me/').status_code, 401)

    def test_refresh_rota_y_el_anterior_queda_revocado(self):
        refresh = self.iniciar_sesion().data['refresh']
        r = self.client.post('/users/token/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertNotEqual(r.data['refresh'], refresh)
        repetido = self.client.post('/users/token/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(repetido.status_code, 401)

    def test_logout_revoca_el_refresh(self):
        tokens = self.iniciar_sesion().data
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.assertEqual(self.client.post('/users/logout/', {'refresh': tokens['refresh']}, format='json').status_code, 200)
        r = self.client.post('/users/token/refresh/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(r.status_code, 401)


class BajaDeUsuariosTests(Escenario, APITestCase):
    def test_borrar_un_usuario_lo_da_de_baja_y_no_puede_entrar(self):
        r = self.como(self.admin).delete(f'/users/users/{self.ajeno.user_ID}/')
        self.assertEqual(r.status_code, 204)
        self.ajeno.refresh_from_db()
        self.assertFalse(self.ajeno.is_active)
        self.assertNotIn(str(self.ajeno.user_ID), self.ids(self.client.get('/users/users/'), 'user_ID'))
        self.assertIn(str(self.ajeno.user_ID), self.ids(self.client.get('/users/users/', {'incluir_inactivos': '1'}), 'user_ID'))
        self.client.force_authenticate(None)
        login = self.client.post('/users/login/', {'email': self.ajeno.email, 'password': CLAVE}, format='json')
        self.assertEqual(login.status_code, 400)

    def test_nadie_se_reactiva_a_si_mismo(self):
        r = self.como(self.dueno).patch(f'/users/users/{self.dueno.user_ID}/', {'is_active': False}, format='json')
        self.assertEqual(r.status_code, 403)

    def test_dar_de_baja_revoca_sus_sesiones(self):
        self.client.force_authenticate(None)
        refresh = self.client.post('/users/login/', {'email': self.ajeno.email, 'password': CLAVE}, format='json').data['refresh']
        self.como(self.admin).delete(f'/users/users/{self.ajeno.user_ID}/')
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/users/token/refresh/', {'refresh': refresh}, format='json').status_code, 401)


import re
from unittest import mock

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile


class LimiteDeLoginTests(Escenario, APITestCase):
    def intento(self, email, clave='mala'):
        self.client.force_authenticate(None)
        return self.client.post('/users/login/', {'email': email, 'password': clave}, format='json')

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
        r = self.como(self.admin).post('/users/users/', {
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
        self.assertEqual(self.client.post('/users/definir-clave/', {'uid': uid, 'token': token, 'password': '123'}, format='json').status_code, 400)
        r = self.client.post('/users/definir-clave/', {'uid': uid, 'token': token, 'password': 'Palmeras-Cafe-2026'}, format='json')
        self.assertEqual(r.status_code, 200)
        login = self.client.post('/users/login/', {'email': 'nueva@muni.test', 'password': 'Palmeras-Cafe-2026'}, format='json')
        self.assertEqual(login.status_code, 200)
        repetido = self.client.post('/users/definir-clave/', {'uid': uid, 'token': token, 'password': 'Otra-Clave-Larga-1'}, format='json')
        self.assertEqual(repetido.status_code, 400)

    def test_olvide_clave_responde_igual_exista_o_no(self):
        self.client.force_authenticate(None)
        r1 = self.client.post('/users/olvide-clave/', {'email': 'nadie@muni.test'}, format='json')
        self.assertEqual(len(mail.outbox), 0)
        r2 = self.client.post('/users/olvide-clave/', {'email': self.dueno.email.upper()}, format='json')
        self.assertEqual((r1.status_code, r1.data), (r2.status_code, r2.data))
        self.enlace_del_correo()

    def test_solo_la_alcaldia_reenvia_el_acceso(self):
        url = f'/users/users/{self.dueno.user_ID}/enviar-acceso/'
        self.assertEqual(self.como(self.dueno).post(url).status_code, 403)
        self.assertEqual(self.como(self.alcalde).post(url).status_code, 200)
        self.enlace_del_correo()

    def test_cambiar_la_clave_aplica_los_validadores(self):
        r = self.como(self.dueno).post('/users/change-password/', {'current_password': CLAVE, 'new_password': '12345678'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.post('/users/change-password/', {'current_password': CLAVE, 'new_password': 'Palmeras-Cafe-2026'}, format='json')
        self.assertEqual(r.status_code, 200)


class SubidasTests(Escenario, APITestCase):
    def foto(self, contenido, nombre='foto.jpg'):
        return SimpleUploadedFile(nombre, contenido, content_type='image/jpeg')

    def test_rechaza_lo_que_no_es_imagen_y_lo_que_pesa_mas_de_5_mb(self):
        url = f'/users/upload-photo/{self.dueno.user_ID}/'
        c = self.como(self.dueno)
        self.assertEqual(c.post(url, {'image': self.foto(b'<script>alert(1)</script>')}, format='multipart').status_code, 400)
        grande = self.foto(b'\xff\xd8\xff\xe0' + b'0' * (5 * 1024 * 1024))
        self.assertEqual(c.post(url, {'image': grande}, format='multipart').status_code, 400)

    @mock.patch('Projects.views.subir_imagen', return_value={'secure_url': 'https://img.test/p.jpg', 'public_id': 'p'})
    def test_una_imagen_valida_se_sube(self, subir):
        r = self.como(self.dueno).post('/projects/project-images/', {
            'proyecto_ID': str(self.proyecto.proyect_ID), 'image': self.foto(b'\x89PNG\r\n\x1a\n' + b'0' * 50, 'a.png'),
        }, format='multipart')
        self.assertEqual(r.status_code, 201)
        subir.assert_called_once()


class DatosPersonalesTests(Escenario, APITestCase):
    PERSONALES = {'cedula', 'phone_number', 'birthday'}

    def test_las_respuestas_anidadas_no_traen_datos_personales(self):
        r = self.como(self.dueno).get('/task/tareas/', {'proyecto_ID': self.proyecto.proyect_ID})
        self.assertFalse(self.PERSONALES & set(r.data['results'][0]['asignado_a']))
        r = self.client.get('/projects/proyectosRead/')
        self.assertFalse(self.PERSONALES & set(r.data['results'][0]['user_ID']))

    def test_un_jefe_ve_el_directorio_y_la_alcaldia_la_ficha(self):
        fila = self.como(self.jefe_a).get(f'/users/users/{self.dueno.user_ID}/').data
        self.assertFalse(self.PERSONALES & set(fila))
        self.assertIn('cedula', self.como(self.alcalde).get(f'/users/users/{self.dueno.user_ID}/').data)
        self.assertIn('cedula', self.como(self.dueno).get(f'/users/users/{self.dueno.user_ID}/').data)
