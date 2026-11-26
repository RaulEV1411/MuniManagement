"""El endpoint de siembra de las e2e no existe fuera de settings_e2e."""
from django.test import TestCase


class SiembraE2ETests(TestCase):
    def test_no_existe_fuera_de_las_e2e(self):
        self.assertEqual(self.client.post('/api/v1/e2e/escenario/', {'run': 'x'}).status_code, 404)
