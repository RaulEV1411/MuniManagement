from datetime import date, datetime, timezone as tz
from unittest import mock

from rest_framework.test import APITestCase

from MuniServer.pruebas import crear_proyecto, crear_usuario, sembrar
from Task import cron

# 26/11 a las 03:00 UTC todavía es 25/11 a las 21:00 en Costa Rica.
NOCHE_EN_COSTA_RICA = datetime(2026, 11, 26, 3, 0, tzinfo=tz.utc)


@mock.patch('django.utils.timezone.now', return_value=NOCHE_EN_COSTA_RICA)
class FechaDeCostaRicaTests(APITestCase):
    def setUp(self):
        sembrar()
        self.usuario = crear_usuario()

    def test_el_cron_usa_la_fecha_de_costa_rica(self, _now):
        self.assertEqual(cron._hoy_cr(), date(2026, 11, 25))

    def test_el_resumen_usa_la_fecha_de_costa_rica(self, _now):
        crear_proyecto(self.usuario, name='Vence hoy', fecha_inicio=date(2026, 11, 1), fecha_entrega=date(2026, 11, 25))
        self.client.force_authenticate(self.usuario)
        r = self.client.get('/api/v1/notifications/notificaciones/resumen/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['hoy'], '2026-11-25')
        self.assertEqual([p['name'] for p in r.data['proyectos_por_vencer']], ['Vence hoy'])
