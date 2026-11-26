from rest_framework.test import APITestCase

from MuniServer.pruebas import Escenario


class DireccionesYDepartamentosTests(Escenario, APITestCase):
    def test_un_funcionario_no_crea_ni_se_nombra_jefe(self):
        c = self.como(self.dueno)
        self.assertEqual(c.post('/departments/direcciones/', {'name': 'Nueva'}, format='json').status_code, 403)
        r = c.patch(f'/departments/departamentos/{self.depto_a.departamentos_ID}/', {'jefe': str(self.dueno.user_ID)}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(c.delete(f'/departments/departamentos/{self.depto_b.departamentos_ID}/').status_code, 403)

    def test_todos_leen(self):
        self.assertEqual(self.como(self.dueno).get('/departments/departamentos/').status_code, 200)

    def test_la_alcaldia_crea_y_nombra_jefes(self):
        c = self.como(self.alcalde)
        self.assertEqual(c.post('/departments/direcciones/', {'name': 'Nueva'}, format='json').status_code, 201)
        r = c.patch(f'/departments/departamentos/{self.depto_a.departamentos_ID}/', {'jefe': str(self.dueno.user_ID)}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_borrar_lo_que_tiene_dependientes_responde_409(self):
        c = self.como(self.alcalde)
        self.assertEqual(c.delete(f'/departments/direcciones/{self.direccion.direccion_ID}/').status_code, 409)
        self.assertEqual(c.delete(f'/departments/departamentos/{self.depto_a.departamentos_ID}/').status_code, 409)
