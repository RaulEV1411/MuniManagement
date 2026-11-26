"""Permisos configurables: por rol de la institución (con alcance) y por rol dentro del proyecto (con vigencia)."""
from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from MuniServer.pruebas import Escenario, crear_departamento, crear_usuario
from Projects import authz
from Projects.models import Estado, MiembroProyecto, Prioridad, RolProyecto
from Users.models import Roles

API = '/api/v1'


class CrearProyectosTests(Escenario, APITestCase):
    def datos(self, departamento, responsable):
        hoy = timezone.localdate()
        return {
            'name': 'Nuevo', 'descripcion': 'x', 'costo': 1,
            'fecha_inicio': hoy.isoformat(), 'fecha_entrega': (hoy + timedelta(days=10)).isoformat(),
            'estado_ID': str(Estado.objects.get(name='Pendiente').pk), 'prioridad_ID': str(Prioridad.objects.get(name='Media').pk),
            'departamento_ID': str(departamento.pk), 'user_ID': str(responsable.pk),
        }

    def crear(self, quien, departamento, responsable):
        return self.como(quien).post(f'{API}/projects/proyectosWrite/', self.datos(departamento, responsable), format='json')

    def test_el_funcionario_no_crea_por_defecto(self):
        self.assertEqual(self.crear(self.dueno, self.depto_a, self.dueno).status_code, 403)

    def test_el_coordinador_crea_solo_en_su_departamento(self):
        self.assertEqual(self.crear(self.companero, self.depto_a, self.dueno).status_code, 201)
        self.assertEqual(self.crear(self.companero, self.depto_b, self.dueno).status_code, 403)

    def test_el_jefe_crea_en_su_departamento_y_con_un_responsable_de_su_alcance(self):
        self.assertEqual(self.crear(self.jefe_a, self.depto_a, self.dueno).status_code, 201)
        self.assertEqual(self.crear(self.jefe_a, self.depto_b, self.dueno).status_code, 403)
        r = self.crear(self.jefe_a, self.depto_a, self.ajeno)
        self.assertEqual(r.status_code, 400)
        self.assertIn('alcance', str(r.data))

    def test_mover_un_proyecto_de_departamento_exige_poder_crear_alla(self):
        url = f'{API}/projects/proyectosWrite/{self.proyecto.pk}/'
        self.assertEqual(self.como(self.jefe_a).patch(url, {'departamento_ID': str(self.depto_b.pk)}, format='json').status_code, 403)
        self.assertEqual(self.como(self.alcalde).patch(url, {'departamento_ID': str(self.depto_b.pk)}, format='json').status_code, 200)

    def test_la_matriz_habilita_al_funcionario(self):
        rol = Roles.objects.get(name='Funcionario')
        r = self.como(self.alcalde).patch(f'{API}/users/roles/{rol.pk}/', {'permisos': {**rol.permisos, 'proyectos.crear': 'departamento'}}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.dueno.refresh_from_db()  # en una petición real el usuario (y su rol) se lee de nuevo
        self.assertEqual(self.crear(self.dueno, self.depto_a, self.dueno).status_code, 201)


class MatrizDeRolesTests(Escenario, APITestCase):
    def test_solo_quien_gestiona_roles_cambia_la_matriz(self):
        rol = Roles.objects.get(name='Coordinador')
        self.assertEqual(self.como(self.jefe_a).patch(f'{API}/users/roles/{rol.pk}/', {'permisos': {}}, format='json').status_code, 403)

    def test_el_administrador_no_se_edita_y_los_del_sistema_no_se_renombran_ni_borran(self):
        admin = Roles.objects.get(name='Administrador')
        c = self.como(self.admin)
        self.assertEqual(c.patch(f'{API}/users/roles/{admin.pk}/', {'permisos': {}}, format='json').status_code, 400)
        coord = Roles.objects.get(name='Coordinador')
        self.assertEqual(c.patch(f'{API}/users/roles/{coord.pk}/', {'name': 'Otro'}, format='json').status_code, 400)
        self.assertEqual(c.delete(f'{API}/users/roles/{coord.pk}/').status_code, 400)

    def test_valida_permisos_y_alcances(self):
        rol = self.como(self.admin).post(f'{API}/users/roles/', {'name': 'Inspector', 'permisos': {'proyectos.ver': 'direccion'}}, format='json')
        self.assertEqual(rol.status_code, 201, rol.data)
        url = f"{API}/users/roles/{rol.data['role_ID']}/"
        c = self.como(self.admin)
        self.assertEqual(c.patch(url, {'permisos': {'no.existe': 'todos'}}, format='json').status_code, 400)
        self.assertEqual(c.patch(url, {'permisos': {'proyectos.ver': 'galaxia'}}, format='json').status_code, 400)
        # Lo que no admite alcance queda en «todos».
        r = c.patch(url, {'permisos': {'estructura.gestionar': 'departamento'}}, format='json')
        self.assertEqual(r.data['permisos'], {'estructura.gestionar': 'todos'})

    def test_el_catalogo_trae_modulos_permisos_y_alcances(self):
        r = self.como(self.dueno).get(f'{API}/users/roles/catalogo/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('proyectos.crear', {p['codigo'] for p in r.data['permisos']})
        self.assertEqual([a['codigo'] for a in r.data['alcances']], ['propio', 'departamento', 'direccion', 'todos'])


class AlcancesTests(Escenario, APITestCase):
    def test_el_jefe_de_direccion_ve_los_proyectos_de_toda_su_direccion(self):
        jefe_dir = crear_usuario('Jefe de Dirección', self.depto_b)
        self.direccion.jefe = jefe_dir
        self.direccion.save()
        self.assertTrue(authz.puede_ver(jefe_dir, self.proyecto))
        self.assertIn(self.proyecto, authz.proyectos_visibles(jefe_dir))
        otra = crear_departamento('Otra')
        jefe_otra = crear_usuario('Jefe de Dirección', otra)
        self.assertFalse(authz.puede_ver(jefe_otra, self.proyecto))
        self.assertNotIn(self.proyecto, authz.proyectos_visibles(jefe_otra))

    def test_puede_y_proyectos_visibles_dicen_lo_mismo(self):
        for persona in (self.admin, self.alcalde, self.jefe_a, self.jefe_b, self.dueno, self.ajeno, self.asignado, self.companero):
            self.assertEqual(authz.puede_ver(persona, self.proyecto), self.proyecto in authz.proyectos_visibles(persona), persona.email)


class RolesDeProyectoTests(Escenario, APITestCase):
    def test_un_rol_de_proyecto_nuevo_da_solo_lo_suyo(self):
        r = self.como(self.admin).post(f'{API}/projects/roles-proyecto/', {'nombre': 'Inspector', 'permisos': ['proyectos.ver', 'fotos.subir']}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        MiembroProyecto.objects.create(proyecto=self.proyecto, usuario=self.ajeno, rol_id=r.data['rol_proyecto_ID'], otorgado_por=self.jefe_a)
        self.assertTrue(authz.puede(self.ajeno, 'fotos.subir', self.proyecto))
        self.assertFalse(authz.puede_editar(self.ajeno, self.proyecto))

    def test_solo_permisos_que_valen_en_un_proyecto_y_los_del_sistema_no_se_borran(self):
        c = self.como(self.admin)
        self.assertEqual(c.post(f'{API}/projects/roles-proyecto/', {'nombre': 'X', 'permisos': ['usuarios.gestionar']}, format='json').status_code, 400)
        supervisor = RolProyecto.objects.get(nombre='Supervisor')
        self.assertEqual(c.delete(f'{API}/projects/roles-proyecto/{supervisor.pk}/').status_code, 400)
        self.assertEqual(self.como(self.jefe_a).post(f'{API}/projects/roles-proyecto/', {'nombre': 'Y', 'permisos': []}, format='json').status_code, 403)

    def test_la_vigencia_empieza_y_termina(self):
        hoy = timezone.localdate()
        m = MiembroProyecto.objects.create(proyecto=self.proyecto, usuario=self.ajeno, rol=RolProyecto.objects.get(nombre='Observador'),
                                           desde=hoy + timedelta(days=2), otorgado_por=self.jefe_a)
        self.assertFalse(authz.puede_ver(self.ajeno, self.proyecto))
        m.desde, m.hasta = hoy - timedelta(days=2), hoy
        m.save()
        # Los permisos se guardan en el objeto del proyecto lo que dura una petición: se vuelve a pedir.
        self.assertTrue(authz.puede_ver(self.ajeno, type(self.proyecto).objects.get(pk=self.proyecto.pk)))

    def test_el_dueno_es_responsable_y_el_asignado_colaborador(self):
        detalle = self.como(self.dueno).get(f'{API}/projects/proyectosRead/{self.proyecto.pk}/').data
        self.assertIn('proyectos.editar', detalle['mis_permisos'])
        self.assertNotIn('equipo.gestionar', detalle['mis_permisos'])
        detalle = self.como(self.asignado).get(f'{API}/projects/proyectosRead/{self.proyecto.pk}/').data
        self.assertEqual(detalle['mis_permisos'], ['proyectos.ver'])
        # En la lista no se calcula (costaría consultas por fila).
        fila = self.como(self.dueno).get(f'{API}/projects/proyectosRead/').data['results'][0]
        self.assertIsNone(fila['mis_permisos'])


class VerComoTests(Escenario, APITestCase):
    def test_me_trae_los_permisos_y_ver_como_tiene_limites(self):
        me = self.como(self.dueno).get(f'{API}/users/me/').data
        self.assertEqual(me['permisos']['proyectos.ver'], 'propio')
        self.assertNotIn('role_flags', me)
        self.assertEqual(self.como(self.dueno).get(f'{API}/users/users/{self.dueno.pk}/permisos/').status_code, 200)
        self.assertEqual(self.como(self.dueno).get(f'{API}/users/users/{self.companero.pk}/permisos/').status_code, 403)
        r = self.como(self.alcalde).get(f'{API}/users/users/{self.dueno.pk}/permisos/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['rol'], 'Funcionario')


class AsignarRolesTests(Escenario, APITestCase):
    def test_nadie_da_mas_de_lo_que_tiene(self):
        # Un rol que gestiona usuarios de su departamento, pero no roles.
        gestor_rol = Roles.objects.create(name='Gestor de personal', permisos={'usuarios.gestionar': 'departamento', 'proyectos.ver': 'propio'})
        gestor = crear_usuario('Funcionario', self.depto_a)
        gestor.role = gestor_rol
        gestor.save()
        alcalde = Roles.objects.get(name='Alcalde')
        url = f'{API}/users/users/{self.companero.pk}/'
        self.assertEqual(self.como(gestor).patch(url, {'role': str(alcalde.pk)}, format='json').status_code, 403)
        modesto = Roles.objects.create(name='Consulta', permisos={'proyectos.ver': 'propio'})
        self.assertEqual(self.como(gestor).patch(url, {'role': str(modesto.pk)}, format='json').status_code, 200)
        # Y solo en su departamento.
        self.assertEqual(self.como(gestor).patch(f'{API}/users/users/{self.ajeno.pk}/', {'puesto': 'x'}, format='json').status_code, 404)

    def test_solo_un_administrador_nombra_administradores(self):
        admin = Roles.objects.get(name='Administrador')
        r = self.como(self.alcalde).patch(f'{API}/users/users/{self.companero.pk}/', {'role': str(admin.pk)}, format='json')
        self.assertEqual(r.status_code, 403)
