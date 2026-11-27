from datetime import timedelta

from rest_framework.serializers import ModelSerializer, SerializerMethodField, ValidationError
from django.contrib.auth.hashers import make_password

from Projects import catalogo_permisos as cat
from .acceso import encolar_correo_de_acceso
from . import ausencias
from .identificacion import normalizar_identificacion, normalizar_telefono
from .models import Ausencia, Especialidad, Roles, Users

MAX_DIAS_AUSENCIA = 366

class RolesSerializer(ModelSerializer):
    class Meta:
        model = Roles
        fields = ['role_ID', 'name', 'descripcion', 'is_system', 'permisos']
        read_only_fields = ['is_system']

    def validate_permisos(self, value):
        if not isinstance(value, dict):
            raise ValidationError('Los permisos van como {permiso: alcance}.')
        limpio = {}
        for codigo, alcance in value.items():
            if codigo not in cat.PERMISOS:
                raise ValidationError(f'No existe el permiso «{codigo}».')
            if alcance in (None, ''):
                continue
            if alcance not in cat.ALCANCES:
                raise ValidationError(f'Alcance no válido para «{codigo}».')
            # Los permisos sin alcance (estructura, catálogos, …) son todo o nada.
            limpio[codigo] = alcance if cat.admite_alcance(codigo) else cat.TODOS
        return limpio


class RolYDepartamentoAnidados:
    """Al leer, rol y departamento salen como objetos; al escribir se mandan sus ids."""

    def to_representation(self, instance):
        datos = super().to_representation(instance)
        if 'role' in datos:
            rol = instance.role
            datos['role'] = rol and {
                'role_ID': str(rol.role_ID), 'name': rol.name,
                # Para elegir a quién sumar al equipo de un proyecto.
                'integra_equipos': rol.name == 'Administrador' or 'equipo.integrar' in (rol.permisos or {}),
            }
        if 'departamento_ID' in datos:
            depto = instance.departamento_ID
            datos['departamento_ID'] = depto and {'departamentos_ID': str(depto.departamentos_ID), 'name': depto.name}
        if 'especialidades' in datos:
            datos['especialidades'] = [{'especialidad_ID': str(e.pk), 'name': e.name} for e in instance.especialidades.all()]
        return datos


class DisponibilidadYCarga:
    """Campos calculados de la lista y el detalle: si está ausente y cuánto trabajo abierto tiene."""

    def get_disponibilidad(self, obj):
        request = self.context.get('request')
        estado = ausencias.disponibilidad(obj, ve_tipo=False)
        if estado['estado'] == 'ausente' and request and ausencias.ve_tipo_de_ausencia(request.user, obj):
            estado = ausencias.disponibilidad(obj, ve_tipo=True)
        return estado

    def get_carga(self, obj):
        return ausencias.carga(obj)


class UsersSerializer(RolYDepartamentoAnidados, DisponibilidadYCarga, ModelSerializer):
    # La anota UsersViewSet: la última actividad de sus sesiones.
    ultima_conexion = SerializerMethodField()
    disponibilidad = SerializerMethodField()
    carga = SerializerMethodField()

    def get_ultima_conexion(self, obj):
        valor = getattr(obj, 'ultima_conexion', None)
        return valor.isoformat() if valor else None

    def create(self, validated_data):
        # La cuenta nace sin contraseña usable: la persona la define con el enlace del correo.
        validated_data['password'] = make_password(None)
        instance = super().create(validated_data)
        encolar_correo_de_acceso(instance, 'bienvenida')
        return instance

    class Meta:
        model = Users
        fields = ['user_ID','first_name','last_name','tipo_identificacion','cedula','email','phone_number','puesto','role','departamento_ID','birthday','user_photo','onboarding_completado','is_active','ultima_conexion','privacidad_version','privacidad_aceptada_en',
                  'numero_empleado', 'extension', 'fecha_ingreso', 'especialidades', 'disponibilidad', 'carga']
        read_only_fields = ['user_ID', 'privacidad_version', 'privacidad_aceptada_en']
        extra_kwargs = {'numero_empleado': {'validators': []}}

    def validate_numero_empleado(self, valor):
        valor = (valor or '').strip()
        if not valor:
            return None
        otros = Users.objects.filter(numero_empleado__iexact=valor)
        if self.instance is not None:
            otros = otros.exclude(pk=self.instance.pk)
        if otros.exists():
            raise ValidationError('Ya hay una persona con ese número de empleado.')
        return valor

    def validate_extension(self, valor):
        return valor.strip()

    def validate(self, datos):
        datos = super().validate(datos)
        if 'cedula' in datos or 'tipo_identificacion' in datos:
            tipo = datos.get('tipo_identificacion', getattr(self.instance, 'tipo_identificacion', 'fisica'))
            numero = normalizar_identificacion(tipo, datos.get('cedula', getattr(self.instance, 'cedula', '')))
            otros = Users.objects.filter(cedula=numero)
            if self.instance is not None:
                otros = otros.exclude(pk=self.instance.pk)
            if otros.exists():
                raise ValidationError({'cedula': 'Ya hay una persona con esa identificación.'})
            datos['cedula'] = numero
        if 'phone_number' in datos:
            datos['phone_number'] = normalizar_telefono(datos['phone_number'])
        return datos

class UsuarioResumenSerializer(ModelSerializer):
    """Lo mínimo para mostrar a una persona dentro de proyectos, tareas, historial y comentarios.
    Sin cédula, teléfono ni fecha de nacimiento (Ley 8968: solo los datos necesarios)."""

    class Meta:
        model = Users
        fields = ['user_ID', 'first_name', 'last_name', 'email', 'puesto', 'user_photo']
        read_only_fields = fields


class UsuarioDirectorioSerializer(RolYDepartamentoAnidados, DisponibilidadYCarga, ModelSerializer):
    """Lo que un jefe ve de otras personas: el resumen más su rol, departamento y estado, la extensión,
    las especialidades, si está ausente y su carga (para repartir el trabajo)."""
    disponibilidad = SerializerMethodField()
    carga = SerializerMethodField()

    class Meta:
        model = Users
        fields = UsuarioResumenSerializer.Meta.fields + ['role', 'departamento_ID', 'is_active', 'extension', 'especialidades',
                                                         'disponibilidad', 'carga']
        read_only_fields = fields


class EspecialidadSerializer(ModelSerializer):
    class Meta:
        model = Especialidad
        fields = ['especialidad_ID', 'name']

    def validate_name(self, valor):
        valor = valor.strip()
        otras = Especialidad.objects.filter(name__iexact=valor)
        if self.instance is not None:
            otras = otras.exclude(pk=self.instance.pk)
        if not valor or otras.exists():
            raise ValidationError('Ya existe esa especialidad.' if valor else 'Escriba un nombre.')
        return valor


class AusenciaSerializer(ModelSerializer):
    registrada_por_nombre = SerializerMethodField()
    vigente = SerializerMethodField()

    class Meta:
        model = Ausencia
        fields = ['ausencia_ID', 'usuario', 'tipo', 'desde', 'hasta', 'registrada_por', 'registrada_por_nombre', 'creada_en', 'vigente']
        read_only_fields = ['ausencia_ID', 'registrada_por', 'creada_en']

    def get_fields(self):
        campos = super().get_fields()
        request = self.context.get('request')
        if request is not None and 'usuario' in campos:
            # Solo a quien se ve: así nadie averigua por los cruces cuándo está ausente otra persona.
            from Projects import authz
            campos['usuario'].queryset = authz.usuarios_visibles(request.user)
        return campos

    def get_registrada_por_nombre(self, obj):
        p = obj.registrada_por
        return f'{p.first_name} {p.last_name}'.strip() if p else None

    def get_vigente(self, obj):
        from django.utils import timezone
        return obj.desde <= timezone.localdate() <= obj.hasta

    def to_representation(self, instance):
        datos = super().to_representation(instance)
        request = self.context.get('request')
        if not (request and ausencias.ve_tipo_de_ausencia(request.user, instance.usuario)):
            datos['tipo'] = None
        return datos

    def validate_usuario(self, valor):
        if self.instance is not None and valor.pk != self.instance.usuario_id:
            raise ValidationError('La ausencia no se pasa a otra persona.')
        return valor

    def validate(self, datos):
        datos = super().validate(datos)
        usuario = datos.get('usuario', getattr(self.instance, 'usuario', None))
        desde = datos.get('desde', getattr(self.instance, 'desde', None))
        hasta = datos.get('hasta', getattr(self.instance, 'hasta', None))
        if desde and hasta:
            if hasta < desde:
                raise ValidationError({'hasta': 'La fecha final no puede ser anterior a la inicial.'})
            if hasta - desde > timedelta(days=MAX_DIAS_AUSENCIA):
                raise ValidationError({'hasta': 'Una ausencia dura hasta un año; si sigue, registre otra.'})
            cruces = Ausencia.objects.filter(usuario=usuario, desde__lte=hasta, hasta__gte=desde)
            if self.instance is not None:
                cruces = cruces.exclude(pk=self.instance.pk)
            if cruces.exists():
                raise ValidationError('Se cruza con otra ausencia de la misma persona.')
        return datos
