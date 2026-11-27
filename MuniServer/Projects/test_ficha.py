"""Tanda D2: la ficha del proyecto, sus hitos y riesgos, y las tareas que trae cada tipo."""
from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from Configuracion.models import Configuracion
from MuniServer.pruebas import Escenario, crear_proyecto
from Projects.models import CierreProyecto, Estado, FuenteFinanciamiento, HitoProyecto, RiesgoProyecto, Tipos, TareaPlantilla
from Task.models import Tareas

API = '/api/v1/projects'


class FichaTests(Escenario, APITestCase):
    def setUp(self):
        super().setUp()
        self.url = f'{API}/proyectosWrite/{self.proyecto.pk}/'

    def editar(self, datos, quien=None):
        return self.como(quien or self.dueno).patch(self.url, datos, format='json')

    def test_guarda_la_ficha_y_se_busca_por_codigo_o_sicop(self):
        fuente = FuenteFinanciamiento.objects.create(name='Ley 8114')
        r = self.editar({
            'codigo': ' EXP-2026-014 ', 'numero_sicop': '2026LA-000012-0002300001', 'fuente_financiamiento': str(fuente.pk),
            'distrito': 'Carmen', 'latitud': '9.934739', 'longitud': '-84.087502', 'objetivo': 'Acera accesible',
            'beneficiarios': 1200, 'indicadores': [{'nombre': 'Acera construida', 'unidad': 'm', 'meta': '500', 'logrado': 120}],
        })
        self.assertEqual(r.status_code, 200, r.data)
        self.proyecto.refresh_from_db()
        self.assertEqual((self.proyecto.codigo, self.proyecto.beneficiarios), ('EXP-2026-014', 1200))
        self.assertEqual(self.proyecto.indicadores, [{'nombre': 'Acera construida', 'unidad': 'm', 'meta': 500.0, 'logrado': 120.0}])

        detalle = self.como(self.dueno).get(f'{API}/proyectosRead/{self.proyecto.pk}/').data
        self.assertEqual(detalle['fuente_financiamiento_nombre'], 'Ley 8114')
        for buscado in ('exp-2026', '0002300001'):
            r = self.client.get(f'{API}/proyectosRead/', {'search': buscado})
            self.assertEqual(self.ids(r, 'proyect_ID'), {str(self.proyecto.pk)})

    def test_el_codigo_no_se_repite_y_vacio_no_cuenta(self):
        otro = crear_proyecto(self.dueno, name='Otro', codigo='EXP-1')
        self.assertEqual(self.editar({'codigo': 'exp-1'}).status_code, 400)
        self.assertEqual(self.editar({'codigo': ''}).status_code, 200)
        crear_proyecto(self.dueno, name='Sin código')
        self.proyecto.refresh_from_db()
        self.assertIsNone(self.proyecto.codigo)
        self.assertEqual(self.como(self.dueno).patch(f'{API}/proyectosWrite/{otro.pk}/', {'codigo': 'EXP-1'}, format='json').status_code, 200)

    def test_valida_punto_distrito_e_indicadores(self):
        self.assertEqual(self.editar({'latitud': '9.9'}).status_code, 400)
        self.assertEqual(self.editar({'latitud': '95', 'longitud': '-84'}).status_code, 400)
        self.assertEqual(self.editar({'indicadores': [{'nombre': ''}]}).status_code, 400)
        self.assertEqual(self.editar({'indicadores': [{'nombre': 'Luminarias', 'meta': 'muchas'}]}).status_code, 400)
        self.assertEqual(self.editar({'indicadores': [{'nombre': 'Luminarias', 'meta': -1}]}).status_code, 400)
        for raro in ('nan', 'inf', 'Infinity', 10 ** 400):
            self.assertEqual(self.editar({'indicadores': [{'nombre': 'Luminarias', 'meta': raro}]}).status_code, 400, raro)
        self.editar({'indicadores': [{'nombre': 'Luminarias', 'unidad': None}]})
        self.proyecto.refresh_from_db()
        self.assertEqual(self.proyecto.indicadores[0]['unidad'], '')

        config = Configuracion.actual()
        config.distritos = ['Carmen', 'Merced']
        config.save()
        self.assertEqual(self.editar({'distrito': 'Hospital'}).status_code, 400)
        self.assertEqual(self.editar({'distrito': 'merced'}).status_code, 200)
        self.proyecto.refresh_from_db()
        self.assertEqual(self.proyecto.distrito, 'Merced')
        # Si lo quitan de la lista, el proyecto que ya lo tenía se sigue guardando.
        config.distritos = ['Carmen']
        config.save()
        self.assertEqual(self.editar({'distrito': 'Merced', 'objetivo': 'Otro'}).status_code, 200)

    def test_los_distritos_se_configuran_sin_repetir(self):
        r = self.como(self.admin).patch('/api/v1/configuracion/', {'distritos': [' Carmen ', 'carmen', 'Merced', '']}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(Configuracion.actual().distritos, ['Carmen', 'Merced'])

    def test_una_fuente_en_uso_no_se_borra_y_solo_la_edita_quien_gestiona_catalogos(self):
        fuente = FuenteFinanciamiento.objects.create(name='Recursos propios')
        self.assertEqual(self.como(self.dueno).post(f'{API}/fuentes/', {'name': 'Donación'}).status_code, 403)
        self.assertEqual(self.como(self.dueno).get(f'{API}/fuentes/').status_code, 200)
        self.editar({'fuente_financiamiento': str(fuente.pk)})
        self.assertEqual(self.como(self.admin).delete(f'{API}/fuentes/{fuente.pk}/').status_code, 409)


class HitosYRiesgosTests(Escenario, APITestCase):
    def hito(self, quien, **extra):
        datos = {'proyecto': str(self.proyecto.pk), 'nombre': 'Diseño aprobado',
                 'fecha_prevista': (timezone.localdate() + timedelta(days=10)).isoformat(), **extra}
        return self.como(quien).post(f'{API}/hitos/', datos, format='json')

    def test_los_hitos_los_cambia_quien_edita_el_proyecto(self):
        r = self.hito(self.dueno)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertFalse(r.data['cumplido'])
        self.assertEqual(self.hito(self.asignado).status_code, 403)
        self.assertEqual(self.hito(self.ajeno).status_code, 400)
        url = f'{API}/hitos/{r.data["hito_ID"]}/'
        self.assertEqual(self.como(self.ajeno).patch(url, {'nombre': 'x'}, format='json').status_code, 404)
        # El asignado ve el proyecto: ve sus hitos, pero no los cambia.
        self.assertEqual(len(self.como(self.asignado).get(f'{API}/hitos/', {'proyecto': self.proyecto.pk}).data), 1)
        self.assertEqual(self.como(self.asignado).patch(url, {'nombre': 'x'}, format='json').status_code, 403)

        manana = (timezone.localdate() + timedelta(days=1)).isoformat()
        self.assertEqual(self.como(self.dueno).patch(url, {'fecha_real': manana}, format='json').status_code, 400)
        r = self.como(self.dueno).patch(url, {'fecha_real': timezone.localdate().isoformat()}, format='json')
        self.assertTrue(r.data['cumplido'])
        otro = crear_proyecto(self.dueno, name='Otro')
        self.assertEqual(self.como(self.dueno).patch(url, {'proyecto': str(otro.pk)}, format='json').status_code, 400)

    def test_con_el_proyecto_cerrado_no_se_cambian(self):
        r = self.hito(self.dueno)
        CierreProyecto.objects.create(proyecto=self.proyecto, estado=Estado.objects.get(name='Completado'),
                                      fecha_fin_real=timezone.localdate(), costo_real=0, motivo='Listo')
        self.proyecto.estado_ID = Estado.objects.get(name='Completado')
        self.proyecto.save()
        self.assertEqual(self.como(self.dueno).delete(f'{API}/hitos/{r.data["hito_ID"]}/').status_code, 403)
        self.assertEqual(HitoProyecto.objects.count(), 1)

    def test_el_riesgo_calcula_su_nivel_y_el_responsable_es_del_alcance(self):
        datos = {'proyecto': str(self.proyecto.pk), 'descripcion': 'Lluvias en octubre', 'probabilidad': 3, 'impacto': 2,
                 'mitigacion': 'Empezar antes', 'responsable': str(self.dueno.pk)}
        r = self.como(self.dueno).post(f'{API}/riesgos/', datos, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual((r.data['nivel'], r.data['estado'], r.data['probabilidad_display']), (6, 'abierto', 'Alta'))
        self.assertEqual(RiesgoProyecto.objects.get().creado_por, self.dueno)
        # Un Funcionario no ve a las personas de otro departamento.
        r = self.como(self.dueno).post(f'{API}/riesgos/', {**datos, 'responsable': str(self.ajeno.pk)}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.como(self.asignado).post(f'{API}/riesgos/', datos, format='json').status_code, 403)
        # Un responsable que ya no está en el alcance no impide editar el resto del riesgo.
        riesgo = RiesgoProyecto.objects.get()
        riesgo.responsable = self.ajeno
        riesgo.save()
        r = self.como(self.dueno).patch(f'{API}/riesgos/{riesgo.pk}/', {'responsable': str(self.ajeno.pk), 'estado': 'mitigado'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)

    def test_un_id_mal_escrito_en_un_filtro_es_un_400(self):
        for ruta in ('hitos/?proyecto=abc', 'riesgos/?proyecto=abc', 'plantillas/?tipo=abc', 'documentos/?proyecto=abc'):
            self.assertEqual(self.como(self.dueno).get(f'{API}/{ruta}').status_code, 400, ruta)


class PlantillasTests(Escenario, APITestCase):
    def setUp(self):
        super().setUp()
        self.tipo = Tipos.objects.create(name='Acera')
        TareaPlantilla.objects.create(tipo=self.tipo, nombre='Demarcar', dias_desde_inicio=0, duracion_dias=3,
                                      pasos=['Medir', 'Pintar'], orden=1)
        TareaPlantilla.objects.create(tipo=self.tipo, nombre='Colar concreto', dias_desde_inicio=20, duracion_dias=30, orden=2)

    def crear(self, **extra):
        hoy = timezone.localdate()
        datos = {
            'name': 'Acera escuela', 'descripcion': 'Acera', 'departamento_ID': str(self.depto_a.pk),
            'estado_ID': str(Estado.objects.get(name='Pendiente').pk), 'prioridad_ID': str(self.proyecto.prioridad_ID_id),
            'user_ID': str(self.jefe_a.pk), 'fecha_inicio': hoy.isoformat(),
            'fecha_entrega': (hoy + timedelta(days=30)).isoformat(), 'costo': 0, 'tipos_ID': str(self.tipo.pk), **extra,
        }
        return self.como(self.jefe_a).post(f'{API}/proyectosWrite/', datos, format='json')

    def test_el_tipo_trae_sus_tareas_con_fechas_dentro_del_proyecto(self):
        r = self.crear()
        self.assertEqual(r.status_code, 201, r.data)
        hoy = timezone.localdate()
        tareas = {t.name: t for t in Tareas.objects.filter(proyecto_ID=r.data['proyect_ID'])}
        self.assertEqual(set(tareas), {'Demarcar', 'Colar concreto'})
        self.assertEqual((tareas['Demarcar'].fecha_inicio, tareas['Demarcar'].fecha_entrega), (hoy, hoy + timedelta(days=2)))
        # Termina con la entrega del proyecto aunque la plantilla diga 30 días.
        self.assertEqual(tareas['Colar concreto'].fecha_entrega, hoy + timedelta(days=30))
        self.assertEqual(list(tareas['Demarcar'].checklist.values_list('texto', flat=True)), ['Medir', 'Pintar'])
        self.assertEqual(tareas['Demarcar'].estado_ID.name, 'Pendiente')

    def test_se_puede_crear_sin_las_tareas_de_la_plantilla(self):
        r = self.crear(usar_plantilla=False)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertFalse(Tareas.objects.filter(proyecto_ID=r.data['proyect_ID']).exists())

    def test_las_plantillas_las_edita_quien_gestiona_catalogos(self):
        datos = {'tipo': str(self.tipo.pk), 'nombre': 'Limpiar', 'pasos': ['Barrer', ' ', None, 'Botar escombro'], 'orden': 3}
        self.assertEqual(self.como(self.jefe_a).post(f'{API}/plantillas/', datos, format='json').status_code, 403)
        r = self.como(self.admin).post(f'{API}/plantillas/', datos, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['pasos'], ['Barrer', 'Botar escombro'])
        otro = Tipos.objects.create(name='Puente')
        url = f'{API}/plantillas/{r.data["plantilla_ID"]}/'
        self.assertEqual(self.client.patch(url, {'tipo': str(otro.pk)}, format='json').status_code, 400)
        tipos = {t['name']: t for t in self.como(self.dueno).get(f'{API}/tipos/').data}
        self.assertEqual([p['nombre'] for p in tipos['Acera']['plantillas']], ['Demarcar', 'Colar concreto', 'Limpiar'])
