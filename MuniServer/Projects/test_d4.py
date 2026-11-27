"""Tanda D4: campos personalizados en proyectos y tareas."""
from rest_framework.test import APITestCase

from Auditoria.models import RegistroAuditoria
from MuniServer.pruebas import Escenario
from Projects.models import CampoPersonalizado as Campo, Proyectos_tipos, TareaPlantilla, Tipos
from Task.models import Tareas

API = '/api/v1/projects'


class CamposTests(Escenario, APITestCase):
    def setUp(self):
        super().setUp()
        self.vial = Tipos.objects.create(name='Vial')
        Proyectos_tipos.objects.create(proyecto=self.proyecto, tipo=self.vial)
        self.otro_tipo = Tipos.objects.create(name='Social')

    def campo(self, **datos):
        tipos = datos.pop('tipos', [])
        campo = Campo.objects.create(**{'aplica_a': Campo.PROYECTO, 'tipo_dato': Campo.TEXTO, **datos})
        campo.tipos.set(tipos)
        return campo

    def nuevo_proyecto(self, quien, **extra):
        return self.como(quien).post(f'{API}/proyectosWrite/', {
            'name': 'Nuevo', 'descripcion': 'x', 'fecha_inicio': '2026-12-01', 'fecha_entrega': '2026-12-31',
            'costo': 100, 'estado_ID': str(self.proyecto.estado_ID_id), 'prioridad_ID': str(self.proyecto.prioridad_ID_id),
            'departamento_ID': str(self.depto_a.pk), 'user_ID': str(self.dueno.pk), **extra,
        }, format='json')

    def editar(self, quien, campos_extra, objeto=None):
        if objeto is None:
            return self.como(quien).patch(f'{API}/proyectosWrite/{self.proyecto.pk}/', {'campos_extra': campos_extra}, format='json')
        return self.como(quien).patch(f'/api/v1/task/tareas/{objeto.pk}/', {'campos_extra': campos_extra}, format='json')

    def test_el_catalogo_lo_gestiona_la_administracion(self):
        datos = {'nombre': 'Código de obra', 'aplica_a': 'proyecto', 'tipo_dato': 'texto', 'tipos': [str(self.vial.pk)]}
        self.assertEqual(self.como(self.dueno).post(f'{API}/campos/', datos, format='json').status_code, 403)
        r = self.como(self.admin).post(f'{API}/campos/', datos, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(self.como(self.dueno).get(f'{API}/campos/').status_code, 200)
        # Nombre repetido (sin distinguir mayúsculas) en el mismo destino; en tareas sí puede repetirse.
        self.assertEqual(self.como(self.admin).post(f'{API}/campos/', {**datos, 'nombre': 'código de obra'}, format='json').status_code, 400)
        self.assertEqual(self.como(self.admin).post(f'{API}/campos/', {**datos, 'aplica_a': 'tarea'}, format='json').status_code, 201)
        # Una lista necesita opciones; las repetidas no pasan y las vacías se quitan.
        lista = {'nombre': 'Zona', 'aplica_a': 'proyecto', 'tipo_dato': 'lista'}
        self.assertEqual(self.como(self.admin).post(f'{API}/campos/', {**lista, 'opciones': []}, format='json').status_code, 400)
        self.assertEqual(self.como(self.admin).post(f'{API}/campos/', {**lista, 'opciones': ['Norte', 'norte']}, format='json').status_code, 400)
        r = self.como(self.admin).post(f'{API}/campos/', {**lista, 'opciones': [' Norte ', '', 'Sur']}, format='json')
        self.assertEqual(r.data['opciones'], ['Norte', 'Sur'])
        self.assertTrue(RegistroAuditoria.objects.filter(objeto_tipo='Projects.CampoPersonalizado', modulo='catalogos').exists())
        # Salen en el orden en que se crearon, no por nombre.
        nombres = [c['nombre'] for c in self.como(self.dueno).get(f'{API}/campos/').data if c['aplica_a'] == 'proyecto']
        self.assertEqual(nombres, ['Código de obra', 'Zona'])

    def test_valida_cada_tipo_de_dato(self):
        texto = self.campo(nombre='Contratista')
        numero = self.campo(nombre='Metros', tipo_dato=Campo.NUMERO)
        fecha = self.campo(nombre='Orden de inicio', tipo_dato=Campo.FECHA)
        lista = self.campo(nombre='Zona', tipo_dato=Campo.LISTA, opciones=['Norte', 'Sur'])
        si_no = self.campo(nombre='Con permiso', tipo_dato=Campo.SI_NO)
        malos = [
            (texto, 'x' * 501), (texto, {'a': 1}), (numero, 'muchos'), (numero, True), (numero, 'inf'), (numero, '1_000'),
            (fecha, '2026-02-30'), (fecha, '20261201'), (lista, 'Este'), (si_no, 'sí'),
        ]
        for campo, valor in malos:
            r = self.editar(self.dueno, {str(campo.pk): valor})
            self.assertEqual(r.status_code, 400, (campo.nombre, valor))
            self.assertIn(campo.nombre, str(r.data))
        r = self.editar(self.dueno, {
            str(texto.pk): '  Constructora Vial  ', str(numero.pk): '1250.5', str(fecha.pk): '2026-12-01',
            str(lista.pk): 'Sur', str(si_no.pk): False,
        })
        self.assertEqual(r.status_code, 200, r.data)
        self.proyecto.refresh_from_db()
        self.assertEqual(self.proyecto.campos_extra, {
            str(texto.pk): 'Constructora Vial', str(numero.pk): 1250.5, str(fecha.pk): '2026-12-01',
            str(lista.pk): 'Sur', str(si_no.pk): False,
        })
        leido = self.como(self.dueno).get(f'{API}/proyectosRead/{self.proyecto.pk}/').data
        self.assertEqual(leido['campos_extra'][str(numero.pk)], 1250.5)

    def test_el_patch_combina_y_vacio_borra(self):
        a, b = self.campo(nombre='A'), self.campo(nombre='B')
        self.editar(self.dueno, {str(a.pk): 'uno', str(b.pk): 'dos'})
        self.assertEqual(self.editar(self.dueno, {str(b.pk): ''}).status_code, 200)
        self.proyecto.refresh_from_db()
        self.assertEqual(self.proyecto.campos_extra, {str(a.pk): 'uno'})
        # Un PATCH sin campos_extra no los toca.
        self.como(self.dueno).patch(f'{API}/proyectosWrite/{self.proyecto.pk}/', {'descripcion': 'otra'}, format='json')
        self.proyecto.refresh_from_db()
        self.assertEqual(self.proyecto.campos_extra, {str(a.pk): 'uno'})

    def test_solo_aplican_los_campos_del_tipo(self):
        de_otro = self.campo(nombre='Familias', tipos=[self.otro_tipo])
        del_tipo = self.campo(nombre='Kilómetros', tipo_dato=Campo.NUMERO, tipos=[self.vial])
        inactivo = self.campo(nombre='Viejo', activo=False)
        self.assertEqual(self.editar(self.dueno, {str(de_otro.pk): 'x'}).status_code, 400)
        self.assertEqual(self.editar(self.dueno, {str(inactivo.pk): 'x'}).status_code, 400)
        self.assertEqual(self.editar(self.dueno, {'no-es-un-campo': 'x'}).status_code, 400)
        self.assertEqual(self.editar(self.dueno, {str(del_tipo.pk): 3}).status_code, 200)
        # Un valor que quedó de un campo desactivado se puede reenviar sin cambios.
        self.proyecto.campos_extra = {**self.proyecto.campos_extra, str(inactivo.pk): 'quedó'}
        self.proyecto.save()
        self.assertEqual(self.editar(self.dueno, {str(inactivo.pk): 'quedó', str(del_tipo.pk): 4}).status_code, 200)
        # Y se puede borrar, aunque no se pueda cambiar.
        self.assertEqual(self.editar(self.dueno, {str(inactivo.pk): 'otro'}).status_code, 400)
        self.assertEqual(self.editar(self.dueno, {str(inactivo.pk): None}).status_code, 200)
        self.proyecto.refresh_from_db()
        self.assertNotIn(str(inactivo.pk), self.proyecto.campos_extra)
        # Al editar, el tipo es el que el proyecto ya tiene (un tipos_ID enviado no cambia qué aplica).
        r = self.como(self.dueno).patch(f'{API}/proyectosWrite/{self.proyecto.pk}/', {
            'tipos_ID': str(self.otro_tipo.pk), 'campos_extra': {str(de_otro.pk): 'x'},
        }, format='json')
        self.assertEqual(r.status_code, 400)

    def test_obligatorios_al_crear_y_al_enviar(self):
        obligatorio = self.campo(nombre='Expediente', obligatorio=True, tipos=[self.vial])
        r = self.nuevo_proyecto(self.jefe_a, tipos_ID=str(self.vial.pk))
        self.assertEqual(r.status_code, 400)
        self.assertIn('Expediente', str(r.data))
        # Sin ese tipo no se pide.
        self.assertEqual(self.nuevo_proyecto(self.jefe_a, tipos_ID=str(self.otro_tipo.pk)).status_code, 201)
        r = self.nuevo_proyecto(self.jefe_a, tipos_ID=str(self.vial.pk), campos_extra={str(obligatorio.pk): 'EXP-1'})
        self.assertEqual(r.status_code, 201, r.data)
        # El proyecto de antes del campo se sigue editando, también sus otros datos adicionales; lo que no se
        # puede es vaciar el obligatorio.
        opcional = self.campo(nombre='Notas', tipos=[self.vial])
        self.assertEqual(self.como(self.dueno).patch(f'{API}/proyectosWrite/{self.proyecto.pk}/', {'descripcion': 'y'}, format='json').status_code, 200)
        self.assertEqual(self.editar(self.dueno, {str(opcional.pk): 'algo'}).status_code, 200)
        self.assertEqual(self.editar(self.dueno, {str(obligatorio.pk): '   '}).status_code, 400)
        self.assertEqual(self.editar(self.dueno, {str(obligatorio.pk): 'EXP-9'}).status_code, 200)
        r = self.editar(self.dueno, {str(obligatorio.pk): None})
        self.assertEqual(r.status_code, 400)
        self.assertIn('Expediente', str(r.data))

    def test_los_valores_los_cambia_quien_edita(self):
        campo = self.campo(nombre='Contratista')
        self.assertIn(self.editar(self.ajeno, {str(campo.pk): 'x'}).status_code, (403, 404))

    def test_campos_de_tarea_por_el_tipo_del_proyecto(self):
        de_tarea = self.campo(nombre='Cuadrilla', aplica_a=Campo.TAREA, tipo_dato=Campo.LISTA, opciones=['A', 'B'],
                              obligatorio=True, tipos=[self.vial])
        de_proyecto = self.campo(nombre='Contratista')
        self.assertEqual(self.editar(self.dueno, {str(de_proyecto.pk): 'x'}, self.tarea).status_code, 400)
        self.assertEqual(self.editar(self.dueno, {str(de_tarea.pk): 'C'}, self.tarea).status_code, 400)
        self.assertEqual(self.editar(self.dueno, {str(de_tarea.pk): 'B'}, self.tarea).status_code, 200)
        self.assertEqual(Tareas.objects.get(pk=self.tarea.pk).campos_extra, {str(de_tarea.pk): 'B'})
        nueva = {
            'proyecto_ID': str(self.proyecto.pk), 'name': 'Bacheo', 'estado_ID': str(self.tarea.estado_ID_id),
            'prioridad_ID': str(self.tarea.prioridad_ID_id), 'fecha_inicio': '2026-12-01', 'fecha_entrega': '2026-12-10',
        }
        r = self.como(self.dueno).post('/api/v1/task/tareas/', nueva, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('Cuadrilla', str(r.data))
        r = self.como(self.dueno).post('/api/v1/task/tareas/', {**nueva, 'campos_extra': {str(de_tarea.pk): 'A'}}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        # Una tarea de antes del campo se sigue moviendo (un PATCH sin campos_extra no exige nada).
        Tareas.objects.filter(pk=self.tarea.pk).update(campos_extra={})
        self.assertEqual(self.como(self.dueno).patch(f'/api/v1/task/tareas/{self.tarea.pk}/', {'avance': 10}, format='json').status_code, 200)

    def test_las_tareas_de_plantilla_nacen_y_se_editan_sin_el_obligatorio(self):
        obligatorio = self.campo(nombre='Cuadrilla', aplica_a=Campo.TAREA, obligatorio=True, tipos=[self.vial])
        TareaPlantilla.objects.create(tipo=self.vial, nombre='Demarcar')
        r = self.nuevo_proyecto(self.jefe_a, tipos_ID=str(self.vial.pk))
        self.assertEqual(r.status_code, 201, r.data)
        tarea = Tareas.objects.get(proyecto_ID=r.data['proyect_ID'], name='Demarcar')
        self.assertEqual(tarea.campos_extra, {})
        url = f'/api/v1/task/tareas/{tarea.pk}/'
        self.assertEqual(self.como(self.jefe_a).patch(url, {'name': 'Demarcar vía'}, format='json').status_code, 200)
        self.assertEqual(self.editar(self.jefe_a, {str(obligatorio.pk): 'Norte'}, tarea).status_code, 200)

    def test_quien_solo_trabaja_en_la_tarea_no_cambia_los_datos(self):
        campo = self.campo(nombre='Cuadrilla', aplica_a=Campo.TAREA)
        self.assertEqual(self.editar(self.asignado, {str(campo.pk): 'Norte'}, self.tarea).status_code, 403)

    def test_con_datos_no_se_borra_ni_cambia_de_tipo(self):
        campo = self.campo(nombre='Metros', tipo_dato=Campo.NUMERO)
        libre = self.campo(nombre='Libre')
        self.editar(self.dueno, {str(campo.pk): 5})
        self.assertEqual(self.como(self.admin).delete(f'{API}/campos/{campo.pk}/').status_code, 409)
        r = self.como(self.admin).patch(f'{API}/campos/{campo.pk}/', {'tipo_dato': 'texto'}, format='json')
        self.assertEqual(r.status_code, 400)
        # Sí se puede desactivar o renombrar, y uno sin datos se borra.
        self.assertEqual(self.como(self.admin).patch(f'{API}/campos/{campo.pk}/', {'activo': False, 'nombre': 'Metros lineales'}, format='json').status_code, 200)
        self.assertEqual(self.como(self.admin).delete(f'{API}/campos/{libre.pk}/').status_code, 204)

    def test_la_opcion_quitada_se_conserva(self):
        zona = self.campo(nombre='Zona', tipo_dato=Campo.LISTA, opciones=['Norte', 'Sur'])
        self.editar(self.dueno, {str(zona.pk): 'Norte'})
        zona.opciones = ['Sur']
        zona.save()
        self.assertEqual(self.editar(self.dueno, {str(zona.pk): 'Norte'}).status_code, 200)
        self.assertEqual(self.editar(self.dueno, {str(zona.pk): 'Este'}).status_code, 400)
