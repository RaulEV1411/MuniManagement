import io
import os
import tempfile
from unittest import mock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from Auditoria.models import CadenaAuditoria
from Configuracion.models import Configuracion
from Departments.models import Departamentos
from Projects.models import FuenteFinanciamiento, Tipos
from Solicitudes.models import ReglaAprobacion, TipoSolicitud
from Users.models import Especialidad, Roles, Users

ADMIN = dict(institucion='Municipalidad de Carmen', moneda='crc', distritos='Carmen, Merced ,Hospital',
             admin_correo='Admin@Muni.test', admin_nombre='Ana', admin_apellido='Mora', admin_cedula='1-0111-0111',
             admin_telefono='8888-1111')


class InstalarTests(TestCase):
    def archivo(self, texto):
        f = tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, encoding='utf-8')
        f.write(texto)
        f.close()
        self.addCleanup(os.unlink, f.name)
        return f.name

    def instalar(self, **extra):
        salida = io.StringIO()
        call_command('instalar', **{**ADMIN, **extra}, stdout=salida)
        return salida.getvalue()

    def test_instala_institucion_departamentos_admin_personas_y_catalogos(self):
        # Como lo guarda Excel en español: con BOM, punto y coma y encabezados con tildes y mayúsculas.
        deptos = self.archivo('﻿Dirección;Departamento;Código;Correo\nObras;Gestión Vial;GV;vial@muni.test\nObras;Proveeduría;;\n\n')
        personas = self.archivo('nombre,apellido,identificacion,correo,telefono,puesto,rol,departamento,tipo_identificacion\n'
                                'Beto,Solís,2-0222-0222,beto@muni.test,8888-2222,Ingeniero,jefe de departamento,gestión vial,\n'
                                'Fabi,Rojas,155812345678,fabi@muni.test,+50688883333,Analista,Funcionario,Proveeduría,DIMEX\n')
        with mock.patch('Users.alta.encolar_correo_de_acceso') as correo, self.captureOnCommitCallbacks(execute=True):
            salida = self.instalar(departamentos=deptos, usuarios=personas, catalogos_base=True)
        config = Configuracion.actual()
        self.assertEqual((config.nombre, config.moneda, config.distritos), ('Municipalidad de Carmen', 'CRC', ['Carmen', 'Merced', 'Hospital']))
        vial = Departamentos.objects.get(name='Gestión Vial')
        self.assertEqual((vial.direccion.name, vial.codigo, vial.correo), ('Obras', 'GV', 'vial@muni.test'))
        self.assertIsNone(Departamentos.objects.get(name='Proveeduría').codigo)
        admin = Users.objects.get(email='admin@muni.test')
        self.assertEqual((admin.role.name, admin.cedula, admin.departamento_ID.direccion.name), ('Administrador', '101110111', 'Alcaldía'))
        self.assertFalse(admin.has_usable_password())
        beto = Users.objects.get(email='beto@muni.test')
        self.assertEqual((beto.role.name, beto.departamento_ID, beto.phone_number), ('Jefe de Departamento', vial, '88882222'))
        self.assertEqual(Users.objects.get(email='fabi@muni.test').tipo_identificacion, 'dimex')
        self.assertEqual(correo.call_count, 3)
        self.assertTrue(Tipos.objects.filter(name='Infraestructura vial').exists())
        self.assertTrue(FuenteFinanciamiento.objects.filter(name='Ley 8114 (red vial cantonal)').exists())
        self.assertTrue(Especialidad.objects.filter(name='Topografía').exists())
        # Lo que hacía la migración de datos: los tipos de solicitud con sus reglas y la cadena de la auditoría.
        self.assertEqual(TipoSolicitud.objects.count(), 7)
        self.assertTrue(CadenaAuditoria.objects.filter(pk=1).exists())
        self.assertIn('https://muni.test/definir-clave/', salida)
        self.assertIn('Departamentos nuevos: 2. Personas: 2', salida)

    def test_con_un_error_no_guarda_nada_y_dice_cada_linea(self):
        deptos = self.archivo('direccion,departamento\nObras,Gestión Vial\n')
        personas = self.archivo('nombre,apellido,identificacion,correo,telefono,puesto,rol,departamento\n'
                                'Beto,Solís,111,beto@muni.test,8888-2222,Ingeniero,Funcionario,Gestión Vial\n'
                                'Fabi,Rojas,3-0333-0333,fabi@muni.test,8888-3333,Analista,Gerente,Bodega\n'
                                'Gabi,Mena,4-0444-0444,admin@muni.test,8888-4444,Analista,Funcionario,Gestión Vial\n')
        with mock.patch('Users.alta.encolar_correo_de_acceso') as correo, self.captureOnCommitCallbacks(execute=True):
            with self.assertRaises(CommandError) as error:
                self.instalar(departamentos=deptos, usuarios=personas)
        texto = str(error.exception)
        self.assertIn('No se guardó nada', texto)
        self.assertIn('Personas, línea 2: identificacion:', texto)
        self.assertIn('Personas, línea 3: rol: no existe «Gerente»', texto)
        self.assertIn('departamento: no existe «Bodega»', texto)
        # La misma línea también dice lo demás que está mal.
        personas2 = self.archivo('nombre,apellido,identificacion,correo,telefono,puesto,rol,departamento\n'
                                 'Beto,Solís,111,beto@muni.test,8888-2222,Ingeniero,Gerente,Gestión Vial\n')
        with self.assertRaises(CommandError) as error2:
            self.instalar(departamentos=deptos, usuarios=personas2)
        self.assertRegex(str(error2.exception), r'línea 2: rol: no existe «Gerente».*; identificacion:')
        self.assertIn('Personas, línea 4: correo:', texto)
        self.assertFalse(Users.objects.exists())
        self.assertFalse(Departamentos.objects.exists())
        self.assertNotEqual(Configuracion.actual().nombre, 'Municipalidad de Carmen')
        correo.assert_not_called()

    def test_falta_una_columna(self):
        with self.assertRaisesMessage(CommandError, 'faltan las columnas rol'):
            self.instalar(usuarios=self.archivo('nombre,apellido,identificacion,correo,telefono,puesto,departamento\n'))

    def test_probar_valida_sin_guardar_ni_mandar_correos(self):
        with mock.patch('Users.alta.encolar_correo_de_acceso') as correo, self.captureOnCommitCallbacks(execute=True):
            salida = self.instalar(probar=True, catalogos_base=True)
        self.assertIn('no se guardó nada', salida)
        self.assertNotIn('definir-clave', salida)
        self.assertFalse(Users.objects.exists())
        self.assertFalse(Tipos.objects.exists())
        correo.assert_not_called()

    def test_no_se_instala_dos_veces(self):
        with mock.patch('Users.alta.encolar_correo_de_acceso'):
            self.instalar()
        with self.assertRaisesMessage(CommandError, 'ya tiene un Administrador'):
            self.instalar(admin_correo='otra@muni.test', admin_cedula='2-0222-0222')


class CsvYValidacionTests(TestCase):
    """Lo que encontró la revisión: un CSV común de Excel, columnas con otro nombre, líneas y repetidos."""
    PERSONAS = 'nombre,apellido,identificacion,correo,telefono,puesto,rol,departamento\n'

    def archivo(self, texto, codificacion='utf-8'):
        f = tempfile.NamedTemporaryFile('wb', suffix='.csv', delete=False)
        f.write(texto.encode(codificacion))
        f.close()
        self.addCleanup(os.unlink, f.name)
        return f.name

    def fallar(self, **extra):
        with mock.patch('Users.alta.encolar_correo_de_acceso'), self.assertRaises(CommandError) as error:
            call_command('instalar', **{**ADMIN, **extra}, stdout=io.StringIO())
        return str(error.exception)

    def test_un_csv_que_no_es_utf8_dice_como_guardarlo(self):
        texto = self.fallar(departamentos=self.archivo('Dirección;Departamento\nObras;Gestión Vial\n', 'cp1252'))
        self.assertIn('no está en UTF-8', texto)
        self.assertIn('CSV UTF-8 (delimitado por comas)', texto)

    def test_una_columna_que_no_se_conoce_se_rechaza(self):
        texto = self.fallar(usuarios=self.archivo(self.PERSONAS.strip() + ',Número de empleado\n'))
        self.assertIn('no se conocen las columnas numero_de_empleado', texto)
        self.assertIn('numero_empleado', texto)

    def test_la_linea_es_la_del_archivo_con_blancos_y_celdas_de_varias_lineas(self):
        personas = self.archivo(self.PERSONAS
                                + 'Beto,Solís,2-0222-0222,beto@muni.test,8888-2222,"Ingeniero\nvial",Funcionario,Despacho de la Alcaldía\n'
                                + '\n'
                                + 'Fabi,Rojas,3-0333-0333,fabi@muni.test,8888-3333,Analista,Gerente,Despacho de la Alcaldía\n')
        self.assertIn('Personas, línea 5: rol: no existe «Gerente»', self.fallar(usuarios=personas))

    def test_los_errores_de_departamentos_dicen_la_columna(self):
        texto = self.fallar(departamentos=self.archivo(f'direccion,departamento\n{"D" * 60},Obras\nObras,{"P" * 60}\n'))
        self.assertIn('Departamentos, línea 2: direccion:', texto)
        self.assertIn('Departamentos, línea 3: departamento:', texto)

    def test_el_departamento_del_administrador_se_valida(self):
        self.assertIn('Administrador: --admin-departamento:', self.fallar(admin_departamento='X' * 60))
        self.assertFalse(Departamentos.objects.exists())

    def test_los_distritos_se_validan_como_en_la_pantalla(self):
        with mock.patch('Users.alta.encolar_correo_de_acceso'):
            call_command('instalar', **{**ADMIN, 'distritos': 'Carmen, carmen,Merced'}, stdout=io.StringIO())
        self.assertEqual(Configuracion.actual().distritos, ['Carmen', 'Merced'])

    def test_un_distrito_demasiado_largo(self):
        self.assertIn('Institución: --distritos: Cada distrito puede tener hasta 80 caracteres', self.fallar(distritos='X' * 81))

    def test_una_cedula_o_un_correo_repetido_se_avisa_aunque_la_fila_anterior_tenga_error(self):
        personas = self.archivo(self.PERSONAS
                                + 'Beto,Solís,2-0222-0222,beto@muni.test,8888-2222,Ingeniero,Gerente,Despacho de la Alcaldía\n'
                                + 'Fabi,Rojas,202220222,Beto@Muni.test,8888-3333,Analista,Funcionario,Despacho de la Alcaldía\n')
        texto = self.fallar(usuarios=personas)
        self.assertIn('Personas, línea 3: correo: repetido, también está en la línea 2', texto)
        self.assertIn('identificacion: repetido, también está en la línea 2', texto)


class SembrarTests(TestCase):
    def test_no_promueve_a_nadie_por_su_correo(self):
        call_command('seed_system', stdout=io.StringIO())
        funcionario = Roles.objects.get(name='Funcionario')
        from MuniServer.pruebas import crear_departamento
        from Departments.models import Direccion
        depto = crear_departamento('Obras', Direccion.objects.create(name='Infraestructura'))
        u = Users.objects.create(role=funcionario, departamento_ID=depto, first_name='X', last_name='Y', cedula='101110111',
                                 phone_number='88881111', email='admin@muni.cr', puesto='Z')
        call_command('seed_system', stdout=io.StringIO())
        u.refresh_from_db()
        self.assertEqual(u.role.name, 'Funcionario')

    def test_un_rol_que_la_institucion_dejo_sin_permisos_sigue_sin_permisos(self):
        call_command('seed_system', stdout=io.StringIO())
        Roles.objects.filter(name='Vicealcalde').update(permisos={})
        call_command('seed_system', stdout=io.StringIO())
        self.assertEqual(Roles.objects.get(name='Vicealcalde').permisos, {})

    def test_los_tipos_de_solicitud_se_siembran_una_sola_vez(self):
        call_command('seed_system', stdout=io.StringIO())
        ReglaAprobacion.objects.filter(tipo__nombre='Prórroga de plazo', nivel='alcaldia').delete()
        call_command('seed_system', stdout=io.StringIO())
        self.assertFalse(ReglaAprobacion.objects.filter(tipo__nombre='Prórroga de plazo', nivel='alcaldia').exists())
        self.assertEqual(TipoSolicitud.objects.count(), 7)
