"""Deja lista una institución nueva en un solo paso, todo o nada: datos de la institución, departamentos,
el primer Administrador, las personas y, si se pide, los catálogos base."""
import io

from django.core.exceptions import ValidationError as ErrorDeModelo
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from rest_framework.exceptions import ValidationError

from Configuracion import instalacion
from Configuracion.models import Configuracion
from Configuracion.serializers import ConfiguracionSerializer
from Departments.models import Departamentos, Direccion
from Projects.models import FuenteFinanciamiento, Tipos
from Users.acceso import enlace_de_acceso
from Users.alta import crear_persona, errores_en_texto, validar_persona
from Users.models import Especialidad, Roles, Users

# Columnas del CSV de personas ↔ campos de la aplicación (para leer los errores en los términos del archivo).
COLUMNAS_PERSONAS = {'nombre': 'first_name', 'apellido': 'last_name', 'tipo_identificacion': 'tipo_identificacion',
                     'identificacion': 'cedula', 'correo': 'email', 'telefono': 'phone_number', 'puesto': 'puesto',
                     'numero_empleado': 'numero_empleado'}
NOMBRES = {v: k for k, v in COLUMNAS_PERSONAS.items()} | {'role': 'rol', 'departamento_ID': 'departamento'}
OBLIGATORIAS_PERSONAS = ['nombre', 'apellido', 'identificacion', 'correo', 'telefono', 'puesto', 'rol', 'departamento']
OPCIONALES_PERSONAS = ['tipo_identificacion', 'numero_empleado']
OPCIONES_ADMIN = {'first_name': '--admin-nombre', 'last_name': '--admin-apellido', 'cedula': '--admin-cedula',
                  'email': '--admin-correo', 'phone_number': '--admin-telefono', 'puesto': '--admin-puesto'}
OPCIONES_INSTITUCION = {'nombre': '--institucion', 'ubicacion': '--ubicacion', 'moneda': '--moneda',
                        'correo_soporte': '--correo-soporte', 'telefono_soporte': '--telefono-soporte', 'distritos': '--distritos'}


def _en_texto(error, nombres):
    """Errores de full_clean, con el nombre de la columna del CSV."""
    return '; '.join(f'{nombres.get(c, c)}: {" ".join(m)}' for c, m in error.message_dict.items())


class Command(BaseCommand):
    help = ('Instala una institución nueva: sus datos, el primer Administrador, departamentos y personas desde '
            'CSV, y los catálogos base. Si algo falla, no guarda nada.')

    def add_arguments(self, parser):
        parser.add_argument('--institucion', required=True, help='Nombre, por ejemplo «Municipalidad de Carmen».')
        parser.add_argument('--ubicacion', default='', help='Por ejemplo «San José, Costa Rica».')
        parser.add_argument('--moneda', default='CRC', help='Código ISO: CRC, USD…')
        parser.add_argument('--correo-soporte', default='')
        parser.add_argument('--telefono-soporte', default='')
        parser.add_argument('--distritos', default='', help='Los distritos del cantón, separados por coma.')
        parser.add_argument('--admin-correo', required=True)
        parser.add_argument('--admin-nombre', required=True)
        parser.add_argument('--admin-apellido', required=True)
        parser.add_argument('--admin-cedula', required=True, help='Cédula física de 9 dígitos.')
        parser.add_argument('--admin-telefono', required=True)
        parser.add_argument('--admin-puesto', default='Administración')
        parser.add_argument('--admin-departamento', default='Despacho de la Alcaldía',
                            help='Si no está en --departamentos, se crea en la Dirección «Alcaldía».')
        parser.add_argument('--departamentos', metavar='CSV', help='Columnas: direccion, departamento y, opcionales, codigo, correo y telefono.')
        parser.add_argument('--usuarios', metavar='CSV', help='Columnas: nombre, apellido, identificacion, correo, telefono, puesto, rol y departamento; opcionales, tipo_identificacion y numero_empleado.')
        parser.add_argument('--catalogos-base', action='store_true', help='Tipos de proyecto, fuentes de financiamiento y especialidades para empezar.')
        parser.add_argument('--probar', action='store_true', help='Valida todo y no guarda nada.')

    def handle(self, *args, **o):
        if Users.objects.filter(role__name='Administrador').exists():
            raise CommandError('Esta instalación ya tiene un Administrador. Las personas nuevas se suman desde la '
                               'aplicación, y otro Administrador, con crear_admin.')
        try:
            departamentos = instalacion.leer_csv(o['departamentos'], ['direccion', 'departamento'], ['codigo', 'correo', 'telefono']) if o['departamentos'] else []
            personas = instalacion.leer_csv(o['usuarios'], OBLIGATORIAS_PERSONAS, OPCIONALES_PERSONAS) if o['usuarios'] else []
        except (OSError, ValueError) as e:
            raise CommandError(str(e))

        errores = []
        with transaction.atomic():
            call_command('seed_system', stdout=io.StringIO())
            self._institucion(o, errores)
            creados = self._departamentos(departamentos, errores)
            admin = self._admin(o, errores)
            sumadas = self._personas(personas, errores)
            if o['catalogos_base']:
                self._catalogos_base()
            if errores:
                raise CommandError('No se guardó nada. Corrija esto y vuelva a correrlo:\n  ' + '\n  '.join(errores))
            if o['probar']:
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS(
            ('Todo está bien; con --probar no se guardó nada.' if o['probar'] else f'Instalada «{o["institucion"]}».')
            + f' Departamentos nuevos: {creados}. Personas: {sumadas} más el Administrador.'))
        if not o['probar']:
            self.stdout.write(f'Enlace para que {admin.email} defina su contraseña (vence en unos días):\n{enlace_de_acceso(admin)}')
            self.stdout.write('Las demás personas reciben el suyo por correo. Si no hay correo configurado, lo piden en '
                              '«Olvidé mi contraseña» cuando lo esté.')

    def _institucion(self, o, errores):
        cambios = {'nombre': o['institucion'].strip(), 'ubicacion': o['ubicacion'].strip(), 'moneda': o['moneda'].strip().upper(),
                   'correo_soporte': o['correo_soporte'].strip(), 'telefono_soporte': o['telefono_soporte'].strip(),
                   'distritos': [d.strip() for d in o['distritos'].split(',') if d.strip()]}
        # Con el serializer de Configuración: la misma validación que la pantalla (distritos sin repetir, topes).
        serializer = ConfiguracionSerializer(Configuracion.actual(), data=cambios, partial=True)
        if not serializer.is_valid():
            errores.append('Institución: ' + errores_en_texto(serializer.errors, OPCIONES_INSTITUCION))
            return
        serializer.save()

    def _departamentos(self, filas, errores):
        creados = 0
        codigos = {}  # Los de filas con error: no se guardan, y la base no avisaría si otra fila repite el código.
        for linea, fila in filas:
            codigo = fila.get('codigo') or None
            try:
                with transaction.atomic():
                    if codigo and codigo.casefold() in codigos:
                        raise ErrorDeModelo({'codigo': [f'repetido, también está en la línea {codigos[codigo.casefold()]}.']})
                    direccion = Direccion.objects.filter(name__iexact=fila['direccion']).first()
                    if direccion is None:
                        direccion = Direccion(name=fila['direccion'])
                        try:
                            direccion.full_clean()
                        except ErrorDeModelo as e:
                            raise ErrorDeModelo({'direccion': [m for ms in e.message_dict.values() for m in ms]})
                        direccion.save()
                    existente = Departamentos.objects.filter(name__iexact=fila['departamento']).first()
                    if existente is not None:
                        if existente.direccion_id != direccion.pk:
                            raise ErrorDeModelo({'departamento': [f'ya existe en la Dirección «{existente.direccion.name}».']})
                        continue
                    depto = Departamentos(name=fila['departamento'], direccion=direccion, codigo=codigo,
                                          correo=fila.get('correo', ''), telefono=fila.get('telefono', ''))
                    depto.full_clean()
                    depto.save()
                    creados += 1
            except ErrorDeModelo as e:
                if codigo:
                    codigos.setdefault(codigo.casefold(), linea)
                errores.append(f'Departamentos, línea {linea}: ' + _en_texto(e, {'name': 'departamento'}))
        return creados

    def _admin(self, o, errores):
        nombre_depto = o['admin_departamento'].strip()
        depto = Departamentos.objects.filter(name__iexact=nombre_depto).first()
        if depto is None:
            direccion, _ = Direccion.objects.get_or_create(name='Alcaldía')
            depto = Departamentos(name=nombre_depto, direccion=direccion)
            try:
                depto.full_clean()
            except ErrorDeModelo as e:
                errores.append('Administrador: ' + _en_texto(e, {'name': '--admin-departamento'}))
                return None
            depto.save()
        datos = {'first_name': o['admin_nombre'], 'last_name': o['admin_apellido'], 'cedula': o['admin_cedula'],
                 'email': o['admin_correo'], 'phone_number': o['admin_telefono'], 'puesto': o['admin_puesto'],
                 'role': Roles.objects.get(name='Administrador').pk, 'departamento_ID': depto.pk}
        try:
            return crear_persona(validar_persona(datos))
        except ValidationError as e:
            errores.append('Administrador: ' + errores_en_texto(e, OPCIONES_ADMIN))

    def _personas(self, filas, errores):
        roles = {r.name.lower(): r.pk for r in Roles.objects.all()}
        sumadas = 0
        # Lo de las filas con error: no se guardan, y la base no avisaría si una fila siguiente repite la cédula.
        vistos = {'email': {}, 'cedula': {}, 'numero_empleado': {}}
        for linea, fila in filas:
            datos = {campo: fila[col] for col, campo in COLUMNAS_PERSONAS.items() if fila.get(col)}
            datos['tipo_identificacion'] = instalacion.normalizar(datos.get('tipo_identificacion') or 'fisica')
            rol = roles.get(fila['rol'].lower())
            depto = Departamentos.objects.filter(name__iexact=fila['departamento']).first()
            problemas, sin_validar = [], set()
            if rol is None:
                problemas.append(f'rol: no existe «{fila["rol"]}» (los roles son: {", ".join(sorted(r.name for r in Roles.objects.all()))})')
                sin_validar.add('role')
            if depto is None:
                problemas.append(f'departamento: no existe «{fila["departamento"]}»')
                sin_validar.add('departamento_ID')
            # Se valida igual el resto de la fila, para decir de una vez todo lo que hay que corregir en ella. Con
            # un rol o un departamento que no existe, DRF no correría la validación de la fila (la de la cédula):
            # va uno cualquiera en su lugar, y la fila no se crea.
            validados = None
            try:
                relleno = depto or Departamentos.objects.first()
                validados = validar_persona({**datos, 'role': rol or next(iter(roles.values())),
                                             'departamento_ID': relleno.pk if relleno else None})
            except ValidationError as e:
                resto = {k: v for k, v in e.detail.items() if k not in sin_validar}
                if resto:
                    problemas.append(errores_en_texto(ValidationError(resto), NOMBRES))
            claves = {'email': datos.get('email', '').strip().lower()}
            if validados:
                claves |= {'cedula': validados['cedula'], 'numero_empleado': validados.get('numero_empleado')}
            for campo, valor in claves.items():
                if valor and valor in vistos[campo]:
                    problemas.append(f'{NOMBRES[campo]}: repetido, también está en la línea {vistos[campo][valor]}')
            if problemas:
                for campo, valor in claves.items():
                    if valor:
                        vistos[campo].setdefault(valor, linea)
                errores.append(f'Personas, línea {linea}: ' + '; '.join(problemas))
                continue
            crear_persona(validados)
            sumadas += 1
        return sumadas

    def _catalogos_base(self):
        for nombre in instalacion.TIPOS_DE_PROYECTO:
            Tipos.objects.get_or_create(name=nombre)
        for nombre in instalacion.FUENTES_DE_FINANCIAMIENTO:
            FuenteFinanciamiento.objects.get_or_create(name=nombre)
        for nombre in instalacion.ESPECIALIDADES:
            Especialidad.objects.get_or_create(name=nombre)
