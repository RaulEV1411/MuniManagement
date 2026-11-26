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
