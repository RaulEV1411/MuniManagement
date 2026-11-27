"""Tanda D3: datos de empleado, especialidades, ausencias, carga y la suplencia de las jefaturas."""
from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from MuniServer.pruebas import Escenario, crear_proyecto, crear_tarea, crear_usuario
from Notifications.models import Notificacion
from Projects import authz
from Solicitudes import servicios as solicitudes
from Solicitudes.models import Solicitud, TipoSolicitud
from Task.cron import send_due_date_warnings
from Users.models import Ausencia, Especialidad, Users

API = '/api/v1/users'


def hoy():
    return timezone.localdate()


class EmpleadoTests(Escenario, APITestCase):
    def test_numero_de_empleado_unico_y_solo_lo_cambia_quien_gestiona(self):
        url = f'{API}/users/{self.dueno.pk}/'
        self.assertEqual(self.como(self.admin).patch(url, {'numero_empleado': ' E-10 ', 'extension': '214'}, format='json').status_code, 200)
        self.dueno.refresh_from_db()
        self.assertEqual((self.dueno.numero_empleado, self.dueno.extension), ('E-10', '214'))
        r = self.como(self.admin).patch(f'{API}/users/{self.ajeno.pk}/', {'numero_empleado': 'e-10'}, format='json')
        self.assertEqual(r.status_code, 400)
        # Vacío es «sin número» y no choca con otros vacíos.
        for persona in (self.ajeno, self.asignado):
            self.assertEqual(self.como(self.admin).patch(f'{API}/users/{persona.pk}/', {'numero_empleado': ''}, format='json').status_code, 200)
        # La persona no se cambia el número ni la fecha de ingreso, pero sí la extensión y las especialidades.
        topo = Especialidad.objects.create(name='Topografía')
        self.assertEqual(self.como(self.dueno).patch(url, {'numero_empleado': 'E-99'}, format='json').status_code, 403)
        self.assertEqual(self.como(self.dueno).patch(url, {'fecha_ingreso': '2020-01-01'}, format='json').status_code, 403)
        r = self.como(self.dueno).patch(url, {'numero_empleado': 'E-10', 'extension': '300', 'especialidades': [str(topo.pk)]}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['especialidades'], [{'especialidad_ID': str(topo.pk), 'name': 'Topografía'}])

    def test_el_directorio_muestra_extension_y_especialidades_pero_no_el_numero(self):
        topo = Especialidad.objects.create(name='Topografía')
        self.dueno.numero_empleado, self.dueno.extension = 'E-1', '214'
        self.dueno.save()
        self.dueno.especialidades.add(topo)
        r = self.como(self.companero).get(f'{API}/users/{self.dueno.pk}/')
        self.assertNotIn('numero_empleado', r.data)
        self.assertEqual(r.data['extension'], '214')
        self.assertEqual([e['name'] for e in r.data['especialidades']], ['Topografía'])
        r = self.como(self.companero).get(f'{API}/users/', {'especialidad': str(topo.pk)})
        self.assertEqual(self.ids(r, 'user_ID'), {str(self.dueno.pk)})
        self.assertEqual(self.como(self.admin).get(f'{API}/users/{self.dueno.pk}/').data['numero_empleado'], 'E-1')

    def test_catalogo_de_especialidades(self):
        url = f'{API}/especialidades/'
        self.assertEqual(self.como(self.jefe_a).post(url, {'name': 'Electricidad'}, format='json').status_code, 403)
        r = self.como(self.admin).post(url, {'name': 'Electricidad'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.como(self.admin).post(url, {'name': ' electricidad '}, format='json').status_code, 400)
        self.dueno.especialidades.add(r.data['especialidad_ID'])
        self.assertEqual(self.como(self.admin).delete(f'{url}{r.data["especialidad_ID"]}/').status_code, 409)
        self.assertEqual(self.como(self.dueno).get(url).status_code, 200)

    def test_carga_de_trabajo(self):
        self.tarea.horas_estimadas, self.tarea.avance = 10, 50
        self.tarea.save()
        crear_tarea(self.proyecto, asignado_a=self.asignado, name='Vencida', fecha_inicio=hoy() - timedelta(days=9),
                    fecha_entrega=hoy() - timedelta(days=2), horas_estimadas=4)
        r = self.como(self.admin).get(f'{API}/users/{self.asignado.pk}/')
        self.assertEqual(r.data['carga'], {'tareas_abiertas': 2, 'tareas_vencidas': 1, 'horas_pendientes': 9.0, 'proyectos_a_cargo': 0})
        filas = self.como(self.admin).get(f'{API}/users/').data['results']
        self.assertEqual(next(f for f in filas if f['user_ID'] == str(self.dueno.pk))['carga']['proyectos_a_cargo'], 1)

    def test_anonimizar_borra_los_datos_de_empleado_y_las_ausencias(self):
        self.dueno.numero_empleado, self.dueno.extension, self.dueno.is_active = 'E-7', '214', False
        self.dueno.save()
        Ausencia.objects.create(usuario=self.dueno, tipo='incapacidad', desde=hoy(), hasta=hoy())
        self.assertEqual(self.como(self.admin).post(f'{API}/users/{self.dueno.pk}/anonimizar/', {}, format='json').status_code, 200)
        self.dueno.refresh_from_db()
        self.assertEqual((self.dueno.numero_empleado, self.dueno.extension), (None, ''))
        self.assertFalse(Ausencia.objects.filter(usuario=self.dueno).exists())


class BusquedaTests(Escenario, APITestCase):
    def test_busca_por_nombre_completo(self):
        crear_usuario('Funcionario', self.depto_a, first_name='Marta', last_name='Quesada Ulate')
        r = self.como(self.admin).get(f'{API}/users/', {'search': 'marta  ulate'})
        self.assertEqual([u['last_name'] for u in r.data['results']], ['Quesada Ulate'])
        r = self.como(self.admin).get(f'{API}/users/', {'search': 'Marta Solano'})
        self.assertEqual(r.data['results'], [])


class AusenciasTests(Escenario, APITestCase):
    def registrar(self, quien, persona, tipo='vacaciones', desde=None, hasta=None):
        desde = desde or hoy()
        return self.como(quien).post(f'{API}/ausencias/', {
            'usuario': str(persona.pk), 'tipo': tipo, 'desde': desde.isoformat(), 'hasta': (hasta or desde + timedelta(days=4)).isoformat(),
        }, format='json')

    def test_quien_registra_y_que_se_valida(self):
        r = self.registrar(self.dueno, self.dueno)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['proyectos_a_cargo'], [{'proyect_ID': str(self.proyecto.pk), 'name': 'Proyecto P'}])
        self.assertEqual(self.registrar(self.ajeno, self.dueno, desde=hoy() + timedelta(days=30)).status_code, 400)  # no lo ve
        self.assertEqual(self.registrar(self.companero, self.dueno, desde=hoy() + timedelta(days=30)).status_code, 403)
        self.assertEqual(self.registrar(self.jefe_a, self.dueno, desde=hoy() + timedelta(days=30)).status_code, 201)
        self.assertEqual(self.registrar(self.dueno, self.dueno, desde=hoy() + timedelta(days=2)).status_code, 400)  # se cruza
        self.assertEqual(self.registrar(self.dueno, self.dueno, desde=hoy() + timedelta(days=90), hasta=hoy() + timedelta(days=80)).status_code, 400)
        self.assertEqual(self.registrar(self.dueno, self.dueno, desde=hoy() + timedelta(days=90), hasta=hoy() + timedelta(days=500)).status_code, 400)
        ausencia = Ausencia.objects.filter(usuario=self.dueno).first()
        r = self.como(self.dueno).patch(f'{API}/ausencias/{ausencia.pk}/', {'usuario': str(self.companero.pk)}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.como(self.companero).delete(f'{API}/ausencias/{ausencia.pk}/').status_code, 403)

    def test_no_se_averiguan_las_ausencias_de_quien_no_se_ve(self):
        self.registrar(self.dueno, self.dueno, tipo='incapacidad')
        r = self.registrar(self.ajeno, self.dueno)  # misma fecha: si dijera «se cruza», delataría la ausencia
        self.assertEqual(r.status_code, 400)
        self.assertNotIn('cruza', str(r.data))

    def test_un_jefe_no_registra_ausencias_de_un_superior(self):
        director = crear_usuario('Jefe de Dirección', self.depto_a)
        self.assertEqual(self.registrar(self.jefe_a, director).status_code, 403)

    def test_la_auditoria_no_guarda_el_tipo(self):
        from Auditoria.models import RegistroAuditoria
        self.registrar(self.dueno, self.dueno, tipo='incapacidad')
        registro = RegistroAuditoria.objects.filter(objeto_tipo='Users.Ausencia').latest('creado_en')
        self.assertNotIn('incapacidad', str(registro.cambios))

    def test_la_jefatura_se_entera_sin_el_motivo(self):
        self.registrar(self.dueno, self.dueno, tipo='incapacidad')
        aviso = Notificacion.objects.get(usuario=self.jefe_a, tipo='general')
        self.assertIn('1 proyecto', aviso.mensaje)
        self.assertNotIn('ncapacidad', aviso.mensaje + aviso.titulo)

    def test_el_tipo_lo_ven_solo_quienes_corresponde(self):
        self.registrar(self.dueno, self.dueno, tipo='incapacidad')
        tipo_para = lambda quien: self.como(quien).get(f'{API}/ausencias/', {'usuario': str(self.dueno.pk)}).data[0]['tipo']
        self.assertEqual(tipo_para(self.dueno), 'incapacidad')
        self.assertEqual(tipo_para(self.jefe_a), 'incapacidad')
        self.assertEqual(tipo_para(self.admin), 'incapacidad')
        self.assertIsNone(tipo_para(self.companero))
        fila = self.como(self.companero).get(f'{API}/users/{self.dueno.pk}/').data
        self.assertEqual(fila['disponibilidad']['estado'], 'ausente')
        self.assertIsNone(fila['disponibilidad']['tipo'])
        self.assertEqual(self.como(self.jefe_a).get(f'{API}/users/{self.dueno.pk}/').data['disponibilidad']['tipo'], 'incapacidad')
        self.assertEqual(self.como(self.companero).get(f'{API}/users/{self.companero.pk}/').data['disponibilidad']['estado'], 'disponible')


class SuplenciaTests(Escenario, APITestCase):
    """ajeno (Funcionario de B) suple la jefatura de A mientras jefe_a está ausente."""

    def setUp(self):
        super().setUp()
        self.depto_a.suplente = self.ajeno
        self.depto_a.save()
        self.proyecto_b = crear_proyecto(self.jefe_b, name='Proyecto de B')

    def ausentar(self, persona=None, desde=None, hasta=None):
        persona = persona or self.jefe_a
        return Ausencia.objects.create(usuario=persona, tipo='vacaciones', desde=desde or hoy(), hasta=hasta or hoy() + timedelta(days=3))

    def otra_vez(self, usuario):
        # Instancia nueva, como en cada petición: la suplencia se guarda en el objeto.
        return Users.objects.get(pk=usuario.pk)

    def test_sin_ausencia_el_suplente_no_tiene_nada(self):
        self.assertFalse(authz.puede_ver(self.ajeno, self.proyecto))
        self.assertEqual(authz.suplencias(self.ajeno), [])
        # Una ausencia futura o ya pasada tampoco cuenta.
        self.ausentar(desde=hoy() + timedelta(days=5), hasta=hoy() + timedelta(days=9))
        self.ausentar(desde=hoy() - timedelta(days=9), hasta=hoy() - timedelta(days=5))
        self.assertFalse(authz.puede_ver(self.otra_vez(self.ajeno), self.proyecto))

    def test_durante_la_ausencia_puede_lo_del_jefe_en_su_zona(self):
        self.ausentar()
        ajeno = self.otra_vez(self.ajeno)
        self.assertTrue(authz.puede_ver(ajeno, self.proyecto))
        self.assertTrue(authz.puede_editar(ajeno, self.proyecto))
        self.assertTrue(authz.puede_crear_proyecto_en(ajeno, self.depto_a))
        self.assertIn(self.proyecto.pk, set(authz.proyectos_visibles(ajeno).values_list('pk', flat=True)))
        self.assertIn(self.dueno.pk, set(authz.usuarios_visibles(ajeno).values_list('pk', flat=True)))
        # Fuera de la zona, nada: el proyecto de B no es del jefe suplido.
        self.assertFalse(authz.puede_editar(ajeno, self.proyecto_b))
        r = self.como(self.otra_vez(self.ajeno)).patch(f'/api/v1/projects/proyectosWrite/{self.proyecto.pk}/', {'descripcion': 'Cubriendo'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)

    def test_sin_cadenas_y_no_cubre_a_un_jefe_inactivo(self):
        # jefe_a cubre B mientras jefe_b no está, y ajeno cubre A: ajeno no hereda B a través de jefe_a.
        self.depto_b.suplente = self.jefe_a
        self.depto_b.save()
        self.ausentar()
        self.ausentar(self.jefe_b)
        self.assertTrue(authz.puede_editar(self.otra_vez(self.jefe_a), self.proyecto_b))
        self.assertFalse(authz.puede_editar(self.otra_vez(self.ajeno), self.proyecto_b))
        self.jefe_a.is_active = False
        self.jefe_a.save()
        self.assertEqual(authz.suplencias(self.otra_vez(self.ajeno)), [])

    def test_toma_la_jefatura_no_el_rol_entero_del_jefe(self):
        # Si el jefe ausente es Administrador, el suplente no gana los permisos generales ni sale de la zona.
        self.depto_a.jefe = self.admin
        self.depto_a.save()
        self.ausentar(self.admin)
        ajeno = self.otra_vez(self.ajeno)
        for general in ('usuarios.gestionar', 'estructura.gestionar', 'catalogos.gestionar', 'roles.gestionar',
                        'configuracion.gestionar', 'auditoria.ver'):
            self.assertFalse(authz.puede(ajeno, general), general)
        self.assertFalse(authz.puede(ajeno, 'usuarios.gestionar', self.proyecto))
        self.assertTrue(authz.puede_editar(ajeno, self.proyecto))
        self.assertFalse(authz.puede_editar(ajeno, self.proyecto_b))
        self.assertFalse(authz.puede_crear_proyecto_en(ajeno, self.depto_b))
        self.assertEqual(self.como(ajeno).post(f'{API}/especialidades/', {'name': 'Nada'}, format='json').status_code, 403)

    def test_la_suplencia_de_una_direccion_no_decide_la_alcaldia(self):
        self.direccion.jefe, self.direccion.suplente = self.alcalde, self.companero
        self.direccion.save()
        jefe_dir = crear_usuario('Jefe de Dirección', self.depto_a)
        self.ausentar(self.alcalde)
        tipo = TipoSolicitud.objects.filter(efecto='aumento').first()
        n = self.como(self.dueno).post('/api/v1/solicitudes/solicitudes/', {
            'proyecto': str(self.proyecto.pk), 'tipo': tipo.pk, 'justificacion': 'Hace falta', 'monto': 25_000_000,
        }, format='json').data['numero']
        for quien in (self.jefe_a, jefe_dir):
            r = self.como(quien).post(f'/api/v1/solicitudes/solicitudes/{n}/decidir/', {'aprobar': True}, format='json')
            self.assertEqual(r.status_code, 200, r.data)
        solicitud = Solicitud.objects.get(numero=n)
        paso = solicitudes.paso_en_turno(solicitud)
        self.assertEqual(paso.nivel, 'alcaldia')
        self.assertFalse(solicitudes.puede_decidir(self.otra_vez(self.companero), paso, solicitud))

    def test_decide_las_solicitudes_del_jefe(self):
        tipo = TipoSolicitud.objects.filter(efecto='aumento').first()
        pedir = lambda: self.como(self.dueno).post('/api/v1/solicitudes/solicitudes/', {
            'proyecto': str(self.proyecto.pk), 'tipo': tipo.pk, 'justificacion': 'Hace falta', 'monto': 10,
        }, format='json').data['numero']
        decidir = lambda n: self.como(self.otra_vez(self.ajeno)).post(f'/api/v1/solicitudes/solicitudes/{n}/decidir/', {'aprobar': True}, format='json')
        self.assertIn(decidir(pedir()).status_code, (403, 404))
        self.ausentar()
        n = pedir()
        self.assertTrue(Notificacion.objects.filter(usuario=self.ajeno, tipo='solicitud').exists())
        r = decidir(n)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['estado'], 'aprobada')

    def test_el_suplente_no_alarga_la_ausencia_del_jefe(self):
        ausencia = self.ausentar()
        ajeno = self.otra_vez(self.ajeno)
        r = self.como(ajeno).patch(f'{API}/ausencias/{ausencia.pk}/', {'hasta': (hoy() + timedelta(days=300)).isoformat()}, format='json')
        self.assertEqual(r.status_code, 403)
        r = self.como(self.otra_vez(self.ajeno)).post(f'{API}/ausencias/', {
            'usuario': str(self.jefe_a.pk), 'tipo': 'permiso', 'desde': (hoy() + timedelta(days=4)).isoformat(),
            'hasta': (hoy() + timedelta(days=90)).isoformat(),
        }, format='json')
        self.assertEqual(r.status_code, 403)
        # Sí cubre a la gente del departamento: le registra la ausencia a quien trabaja ahí.
        r = self.como(self.otra_vez(self.ajeno)).post(f'{API}/ausencias/', {
            'usuario': str(self.dueno.pk), 'tipo': 'permiso', 'desde': hoy().isoformat(), 'hasta': hoy().isoformat(),
        }, format='json')
        self.assertEqual(r.status_code, 201, r.data)

    def test_avisos_al_suplente(self):
        r = self.como(self.jefe_a).post(f'{API}/ausencias/', {
            'usuario': str(self.jefe_a.pk), 'tipo': 'vacaciones', 'desde': hoy().isoformat(), 'hasta': (hoy() + timedelta(days=2)).isoformat(),
        }, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(Notificacion.objects.filter(usuario=self.ajeno, tipo='delegacion', titulo__contains='Departamento A').exists())
        self.proyecto.fecha_entrega = hoy() + timedelta(days=2)
        self.proyecto.save()
        send_due_date_warnings()
        self.assertTrue(Notificacion.objects.filter(usuario=self.ajeno, tipo='vencimiento_proyecto').exists())


class DepartamentosTests(Escenario, APITestCase):
    def test_datos_del_departamento(self):
        url = f'/api/v1/departments/departamentos/{self.depto_a.pk}/'
        datos = {'codigo': ' OBR ', 'descripcion': 'Obra pública', 'presupuesto_anual': '1500000.00', 'correo': 'obras@muni.test',
                 'telefono': ' 2222-0000 ', 'metas': ['Asfaltar 5 km', ' ', None], 'suplente': str(self.companero.pk)}
        self.assertEqual(self.como(self.jefe_a).patch(url, datos, format='json').status_code, 403)
        r = self.como(self.admin).patch(url, datos, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual((r.data['codigo'], r.data['telefono'], r.data['metas']), ('OBR', '2222-0000', ['Asfaltar 5 km']))
        r = self.como(self.admin).patch(f'/api/v1/departments/departamentos/{self.depto_b.pk}/', {'codigo': 'obr'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.como(self.admin).patch(url, {'suplente': str(self.jefe_a.pk)}, format='json').status_code, 400)
        self.assertEqual(self.como(self.admin).patch(url, {'metas': ['x'] * 21}, format='json').status_code, 400)
        # El proyecto trae su departamento sin presupuesto, contacto ni metas.
        r = self.como(self.dueno).get(f'/api/v1/projects/proyectosRead/{self.proyecto.pk}/')
        self.assertEqual(set(r.data['departamento_ID']), {'departamentos_ID', 'name', 'direccion', 'jefe'})

    def test_datos_de_la_direccion_y_su_suplencia(self):
        url = f'/api/v1/departments/direcciones/{self.direccion.pk}/'
        r = self.como(self.admin).patch(url, {'jefe': str(self.jefe_b.pk), 'suplente': str(self.companero.pk), 'codigo': 'DOB'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        Ausencia.objects.create(usuario=self.jefe_b, tipo='permiso', desde=hoy(), hasta=hoy())
        zonas = authz.suplencias(Users.objects.get(pk=self.companero.pk))
        self.assertEqual([(j.pk, z, n) for j, z, n in zonas], [(self.jefe_b.pk, frozenset({self.depto_a.pk, self.depto_b.pk}), 'direccion')])
