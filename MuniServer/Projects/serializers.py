from datetime import date

from rest_framework.serializers import ModelSerializer, PrimaryKeyRelatedField, SerializerMethodField, ValidationError
from .models import (
    Estado, Prioridad, Tipos, Proyectos, Proyectos_tipos, ProjectImage,
    AjustePresupuesto, MiembroProyecto, RolProyecto,
)
from . import authz
from .catalogo_permisos import PERMISOS_DE_PROYECTO
from Departments.serializers import DepartamentosSerializer
from Users.serializers import UsuarioResumenSerializer


class EstadoSerializer(ModelSerializer):
    class Meta:
        model = Estado
        fields = ['estado_ID', 'name', 'color', 'orden', 'is_system']
        read_only_fields = ['is_system']


class PrioridadSerializer(ModelSerializer):
    class Meta:
        model = Prioridad
        fields = ['prioridad_ID', 'name', 'color', 'orden', 'is_system']
        read_only_fields = ['is_system']


class TiposSerializer(ModelSerializer):
    class Meta:
        model = Tipos
        fields = '__all__'


class ProjectImageSerializer(ModelSerializer):
    class Meta:
        model = ProjectImage
        fields = ['imagen_ID', 'url', 'public_id', 'created_at']


class ProyectosWriteSerializer(ModelSerializer):
    # El asistente elige un tipo al crear; se guarda en Proyectos_tipos.
    tipos_ID = PrimaryKeyRelatedField(queryset=Tipos.objects.all(), write_only=True, required=False, allow_null=True)

    class Meta:
        model = Proyectos
        fields = '__all__'

    def create(self, validated_data):
        tipo = validated_data.pop('tipos_ID', None)
        proyecto = super().create(validated_data)
        if tipo is not None:
            Proyectos_tipos.objects.create(proyecto=proyecto, tipo=tipo)
        return proyecto

    def update(self, instance, validated_data):
        validated_data.pop('tipos_ID', None)
        return super().update(instance, validated_data)


class ProyectosReadSerializer(ModelSerializer):
    departamento_ID = DepartamentosSerializer(read_only=True)
    estado_ID = EstadoSerializer(read_only=True)
    prioridad_ID = PrioridadSerializer(read_only=True)
    user_ID = UsuarioResumenSerializer(read_only=True)
    images = ProjectImageSerializer(many=True, read_only=True)
    costo_total = SerializerMethodField()
    tipos = SerializerMethodField()
    mis_permisos = SerializerMethodField()

    class Meta:
        model = Proyectos
        fields = '__all__'

    def get_tipos(self, obj):
        return [{'tipos_ID': str(pt.tipo_id), 'name': pt.tipo.name} for pt in obj.proyectos_tipos_set.all()]

    def get_mis_permisos(self, obj):
        # Solo en el detalle: calcularlo en cada fila de una lista costaría consultas por proyecto.
        if not self.context.get('incluir_mis_permisos') or 'request' not in self.context:
            return None
        return authz.mis_permisos_en(self.context['request'].user, obj)

    def get_costo_total(self, obj):
        ajustes = obj.ajustes_presupuesto.all()
        delta = sum(a.monto if a.tipo == 'aumento' else -a.monto for a in ajustes)
        return (obj.costo or 0) + delta


class ProyectosTiposSerializer(ModelSerializer):
    class Meta:
        model = Proyectos_tipos
        fields = '__all__'


class RolProyectoSerializer(ModelSerializer):
    class Meta:
        model = RolProyecto
        fields = ['rol_proyecto_ID', 'nombre', 'descripcion', 'permisos', 'is_system', 'orden']
        read_only_fields = ['rol_proyecto_ID', 'is_system']

    def validate_permisos(self, value):
        if not isinstance(value, list) or any(c not in PERMISOS_DE_PROYECTO for c in value):
            raise ValidationError('Hay permisos que no existen o que no valen dentro de un proyecto.')
        return sorted(set(value))


class MiembroProyectoSerializer(ModelSerializer):
    usuario_info = UsuarioResumenSerializer(source='usuario', read_only=True)
    otorgado_por_info = UsuarioResumenSerializer(source='otorgado_por', read_only=True)
    rol_info = RolProyectoSerializer(source='rol', read_only=True)
    vigente = SerializerMethodField()
    dias_restantes = SerializerMethodField()

    class Meta:
        model = MiembroProyecto
        fields = [
            'miembro_ID', 'proyecto', 'usuario', 'rol', 'desde', 'hasta', 'motivo', 'activo',
            'otorgado_por', 'creado_en', 'revocado_en',
            'usuario_info', 'otorgado_por_info', 'rol_info', 'vigente', 'dias_restantes',
        ]
        read_only_fields = ['miembro_ID', 'otorgado_por', 'creado_en', 'revocado_en', 'activo']

    def get_vigente(self, obj):
        hoy = date.today()
        return obj.activo and obj.desde <= hoy and (obj.hasta is None or obj.hasta >= hoy)

    def get_dias_restantes(self, obj):
        return (obj.hasta - date.today()).days if obj.hasta else None

    def validate(self, attrs):
        desde = attrs.get('desde', getattr(self.instance, 'desde', None) or date.today())
        hasta = attrs.get('hasta', getattr(self.instance, 'hasta', None))
        if hasta and desde and hasta < desde:
            raise ValidationError({'hasta': 'La fecha de fin no puede ser anterior a la de inicio.'})
        if self.instance is None and hasta and hasta < date.today():
            raise ValidationError({'hasta': 'La vigencia ya habría vencido.'})
        return attrs


class AjustePresupuestoSerializer(ModelSerializer):
    usuario_info = UsuarioResumenSerializer(source='usuario', read_only=True)

    class Meta:
        model = AjustePresupuesto
        fields = [
            'ajuste_ID', 'proyecto', 'tarea', 'tipo', 'monto', 'motivo',
            'usuario', 'aprobado_por', 'fecha', 'usuario_info',
        ]
        read_only_fields = ['ajuste_ID', 'fecha', 'usuario', 'aprobado_por']

    def validate_monto(self, value):
        if value is None or value <= 0:
            raise ValidationError('El monto debe ser mayor a cero.')
        return value

    def validate_motivo(self, value):
        value = (value or '').strip()
        if not value:
            raise ValidationError('El motivo es obligatorio.')
        return value

    def validate(self, attrs):
        proyecto = attrs.get('proyecto')
        tarea = attrs.get('tarea')
        if not proyecto and not tarea:
            raise ValidationError('Debe asociarse a un proyecto o a una tarea.')
        if proyecto and tarea and tarea.proyecto_ID_id != proyecto.proyect_ID:
            raise ValidationError('La tarea no pertenece al proyecto indicado.')
        return attrs
