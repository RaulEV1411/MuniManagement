"""Tanda T: portal completo, datos abiertos, vista previa al compartir y el mapa en Configuración."""
import csv
import io
import json
from datetime import date, timedelta
from decimal import Decimal

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from Configuracion.models import Configuracion
from Historial.models import HistorialCambios
from MuniServer.pruebas import Escenario, crear_proyecto, crear_tarea
from Projects.models import AjustePresupuesto, CierreProyecto, Estado

LISTA = '/api/v1/public/projects/'


@override_settings(FRONTEND_URL='https://proyectos.muni.test')
class PortalTests(Escenario, APITestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(None)
        self.publico = crear_proyecto(
            self.dueno, name='Acera pública', es_publico=True, costo=1000, numero_sicop='2026LE-000123',
            distrito='Carmen', latitud=Decimal('9.932500'), longitud=Decimal('-84.079600'),
        )
        crear_tarea(self.publico, costo_ejecutado=300)
        crear_tarea(self.publico, costo_ejecutado=150)
        AjustePresupuesto.objects.create(proyecto=self.publico, tipo='aumento', monto=500, motivo='Más metros', usuario=self.dueno)
        AjustePresupuesto.objects.create(proyecto=self.publico, tipo='rebajo', monto=200, motivo='Ahorro', usuario=self.dueno)
        self.cancelado = crear_proyecto(self.dueno, name='Puente cancelado', es_publico=True,
                                        estado=Estado.objects.get(name='Cancelado'))
        CierreProyecto.objects.create(
            proyecto=self.cancelado, estado=Estado.objects.get(name='Cancelado'), fecha_fin_real=date(2026, 11, 20),
            costo_real=80, motivo='El terreno no se pudo expropiar.', lecciones='Interno: revisar el avalúo antes.',
            cerrado_por=self.dueno,
        )

    def fila(self, nombre, respuesta):
        filas = respuesta.data['results'] if isinstance(respuesta.data, dict) else respuesta.data
        return next(p for p in filas if p['name'] == nombre)

    def test_publica_presupuesto_ejecucion_sicop_y_ubicacion(self):
        r = self.client.get(LISTA)
        self.assertEqual(r.status_code, 200)
        p = self.fila('Acera pública', r)
        self.assertEqual(p['presupuesto'], 1300)
        self.assertEqual(p['ejecutado'], 450)
        self.assertEqual(p['numero_sicop'], '2026LE-000123')
        self.assertEqual(p['distrito'], 'Carmen')
        self.assertEqual(Decimal(p['latitud']), Decimal('9.932500'))
        self.assertIsNone(p['cierre'])
        self.assertNotIn('user_ID', p)
        self.assertNotIn('Proyecto P', {f['name'] for f in r.data['results']})

    def test_los_cancelados_salen_con_su_cierre_sin_las_lecciones(self):
        p = self.fila('Puente cancelado', self.client.get(LISTA))
        self.assertEqual(p['estado']['categoria'], 'finalizado')
        self.assertEqual(p['cierre'], {'estado': 'Cancelado', 'fecha': date(2026, 11, 20), 'costo_final': 80,
                                       'motivo': 'El terreno no se pudo expropiar.'})
        self.assertNotIn('Interno', json.dumps(self.client.get(f'{LISTA}{self.cancelado.pk}/').json()))

    def test_un_proyecto_reabierto_no_muestra_el_cierre_anterior(self):
        CierreProyecto.objects.filter(proyecto=self.cancelado).update(reabierto_en=timezone.now())
        # Aunque el proyecto siga en un estado finalizado, un cierre reabierto ya no es el vigente.
        self.assertIsNone(self.fila('Puente cancelado', self.client.get(LISTA))['cierre'])
        self.cancelado.estado_ID = Estado.objects.get(name='En progreso')
        self.cancelado.save()
        self.assertIsNone(self.fila('Puente cancelado', self.client.get(LISTA))['cierre'])

    def test_la_fecha_de_actualizacion_es_el_ultimo_cambio_del_historial(self):
        p = self.fila('Acera pública', self.client.get(LISTA))
        self.assertEqual(p['actualizado'], self.publico.created_at.astimezone(timezone.get_current_timezone()).isoformat())
        luego = timezone.now() + timedelta(hours=2)
        HistorialCambios.objects.create(tipo='edicion_proyecto', proyecto_ID=self.publico, created_at=luego)
        p = self.fila('Acera pública', self.client.get(LISTA))
        self.assertEqual(p['actualizado'], luego.astimezone(timezone.get_current_timezone()).isoformat())

    def test_datos_abiertos_en_csv(self):
        self.publico.descripcion = '=HYPERLINK("http://x")'
        self.publico.save()
        r = self.client.get('/api/v1/public/datos/proyectos.csv')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r['Content-Type'], 'text/csv; charset=utf-8')
        self.assertIn('attachment; filename="proyectos.csv"', r['Content-Disposition'])
        self.assertIn('creativecommons.org/licenses/by/4.0', r['Link'])
        texto = r.content.decode('utf-8')
        self.assertTrue(texto.startswith('﻿'))
        filas = list(csv.DictReader(io.StringIO(texto.lstrip('﻿'))))
        acera = next(f for f in filas if f['nombre'] == 'Acera pública')
        self.assertEqual(acera['presupuesto_aprobado'], '1300')
        self.assertEqual(acera['moneda'], 'CRC')
        self.assertEqual(acera['latitud'], '9.9325')
        self.assertEqual(acera['enlace'], f'https://proyectos.muni.test/publico/proyectos/{self.publico.pk}')
        # Lo que empieza con = no se abre como fórmula en Excel.
        self.assertEqual(acera['descripcion'], '\'=HYPERLINK("http://x")')
        self.publico.descripcion = 'Obra;=HYPERLINK("http://x")'
        self.publico.distrito = '\t=1+1'
        self.publico.save()
        AjustePresupuesto.objects.filter(proyecto=self.publico).delete()
        self.publico.costo = -5
        self.publico.save()
        filas = list(csv.DictReader(io.StringIO(self.client.get('/api/v1/public/datos/proyectos.csv').content.decode().lstrip('\ufeff'))))
        acera = next(f for f in filas if f['nombre'] == 'Acera pública')
        # Un Excel con ; como separador parte la celda ahí: la segunda parte tampoco puede empezar con =.
        self.assertEqual(acera['descripcion'], 'Obra;\'=HYPERLINK("http://x")')
        self.assertTrue(acera['distrito'].startswith("'\t"))
        self.assertNotIn("\t=", acera['distrito'])
        self.assertEqual(acera['presupuesto_aprobado'], '-5')
        cancelado = next(f for f in filas if f['nombre'] == 'Puente cancelado')
        self.assertEqual(cancelado['motivo_cierre'], 'El terreno no se pudo expropiar.')
        self.assertEqual(cancelado['fecha_cierre'], '2026-11-20')

    def test_datos_abiertos_en_json_con_la_licencia_elegida(self):
        config = Configuracion.actual()
        config.licencia_datos = 'CC0-1.0'
        config.save()
        r = self.client.get('/api/v1/public/datos/proyectos.json')
        self.assertEqual(r.status_code, 200)
        datos = r.json()
        self.assertEqual(datos['licencia'], 'CC0 1.0')
        self.assertIn('publicdomain/zero', datos['url_licencia'])
        self.assertEqual({p['nombre'] for p in datos['proyectos']}, {'Acera pública', 'Puente cancelado'})
        acera = next(p for p in datos['proyectos'] if p['nombre'] == 'Acera pública')
        self.assertEqual(acera['longitud'], -84.0796)
        self.assertEqual(self.client.get('/api/v1/public/datos/proyectos.xml').status_code, 404)

    def test_vista_previa_de_un_proyecto_publico(self):
        self.publico.name = 'Acera <script>'
        self.publico.save()
        r = self.client.get(f'/api/v1/public/vista-previa/publico/proyectos/{self.publico.pk}')
        self.assertEqual(r.status_code, 200)
        html = r.content.decode()
        self.assertIn('<meta property="og:title" content="Acera &lt;script&gt; · Municipalidad">', html)
        self.assertIn(f'<meta property="og:url" content="https://proyectos.muni.test/publico/proyectos/{self.publico.pk}">', html)
        self.assertIn('Avance 0 %', html)
        self.assertNotIn('<script>', html)
        self.assertIn('User-Agent', r['Vary'])

    def test_vista_previa_de_un_proyecto_no_publico_es_la_del_portal(self):
        r = self.client.get(f'/api/v1/public/vista-previa/publico/proyectos/{self.proyecto.pk}')
        self.assertEqual(r.status_code, 404)
        self.assertIn('Portal de proyectos · Municipalidad', r.content.decode())
        self.assertNotIn('Proyecto P', r.content.decode())
        self.assertEqual(self.client.get('/api/v1/public/vista-previa/publico').status_code, 200)


class DespublicarTests(Escenario, APITestCase):
    """Un proyecto cerrado no se edita, pero quien lo edita lo puede quitar del portal sin reabrirlo."""

    def setUp(self):
        super().setUp()
        self.cancelado = crear_proyecto(self.dueno, name='Puente cancelado', es_publico=True,
                                        estado=Estado.objects.get(name='Cancelado'))
        self.url = f'/api/v1/projects/proyectosWrite/{self.cancelado.pk}/despublicar/'

    def test_quien_edita_lo_quita_del_portal_sin_reabrirlo(self):
        detalle = self.como(self.dueno).get(f'/api/v1/projects/proyectosRead/{self.cancelado.pk}/').data
        self.assertTrue(detalle['puede_despublicar'])
        self.assertNotIn('proyectos.editar', detalle['mis_permisos'])
        # El PATCH sigue bloqueado: solo se puede bajar del portal.
        patch = self.como(self.dueno).patch(f'/api/v1/projects/proyectosWrite/{self.cancelado.pk}/', {'es_publico': False}, format='json')
        self.assertEqual(patch.status_code, 403)
        self.assertEqual(self.como(self.dueno).post(self.url).status_code, 200)
        self.cancelado.refresh_from_db()
        self.assertFalse(self.cancelado.es_publico)
        self.assertEqual(self.cancelado.estado_ID.name, 'Cancelado')
        self.assertTrue(HistorialCambios.objects.filter(proyecto_ID=self.cancelado, tipo='edicion_proyecto',
                                                        datos_nuevos={'es_publico': False}).exists())
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f'{LISTA}{self.cancelado.pk}/').status_code, 404)
        self.assertEqual(self.como(self.dueno).post(self.url).status_code, 400)

    def test_quien_no_lo_edita_no_lo_quita(self):
        self.assertFalse(self.como(self.ajeno).get(f'/api/v1/projects/proyectosRead/{self.cancelado.pk}/').data.get('puede_despublicar') or False)
        self.assertIn(self.como(self.ajeno).post(self.url).status_code, (403, 404))
        self.cancelado.refresh_from_db()
        self.assertTrue(self.cancelado.es_publico)


class MapaYLicenciaEnConfiguracionTests(Escenario, APITestCase):
    URL = '/api/v1/configuracion/'

    def test_el_administrador_marca_el_centro_y_elige_la_licencia(self):
        r = self.como(self.admin).patch(self.URL, {'mapa_latitud': '9.9325', 'mapa_longitud': '-84.0796', 'mapa_zoom': 14,
                                                    'licencia_datos': 'ODbL-1.0'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['licencia']['nombre'], 'ODbL 1.0')
        self.client.force_authenticate(None)
        publica = self.client.get(self.URL)
        self.assertEqual(publica.data['mapa_zoom'], 14)
        self.assertEqual(Decimal(publica.data['mapa_latitud']), Decimal('9.9325'))

    def test_el_centro_necesita_latitud_y_longitud(self):
        r = self.como(self.admin).patch(self.URL, {'mapa_latitud': '9.9'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('mapa_latitud', r.data)
        self.assertEqual(self.como(self.admin).patch(self.URL, {'mapa_zoom': 30}, format='json').status_code, 400)
        self.assertEqual(self.como(self.admin).patch(self.URL, {'licencia_datos': 'MIT'}, format='json').status_code, 400)

    def test_solo_quien_gestiona_la_configuracion(self):
        self.assertEqual(self.como(self.dueno).patch(self.URL, {'licencia_datos': 'CC0-1.0'}, format='json').status_code, 403)
