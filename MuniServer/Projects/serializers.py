from datetime import date

from django.utils import timezone
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer, PrimaryKeyRelatedField, SerializerMethodField, ValidationError
from .models import (
    Estado, Prioridad, Tipos, Proyectos, Proyectos_tipos, ProjectImage,
    AjustePresupuesto, MiembroProyecto, RolProyecto, CierreProyecto, DocumentoProyecto,
)
from . import authz
from .catalogo_permisos import PERMISOS_DE_PROYECTO
from Departments.serializers import DepartamentosSerializer
from Users.serializers import UsuarioResumenSerializer


class EstadoSerializer(ModelSerializer):
    class Meta:
        model = Estado
        fields = ['estado_ID', 'name', 'color', 'orden', 'is_system', 'categoria']
        read_only_fields = ['is_system']

    def validate_categoria(self, valor):
        # Cambiarla con proyectos en ese estado los cerraría (o abriría) sin pasar por el cierre.
        if self.instance is not None and valor != self.instance.categoria and self.instance.proyectos_set.exists():
            raise ValidationError('Hay proyectos en este estado: no se puede cambiar su categoría.')
        return valor


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
        # Archivar tiene su acción (solo el Administrador).
        read_only_fields = ['archivado', 'archivado_en', 'archivado_por']

    def validate_estado_ID(self, estado):
        # Un proyecto nace activo o pausado: a un estado finalizado se llega cerrándolo.
        if self.instance is None and estado.categoria == 'finalizado':
            raise ValidationError('Un proyecto nuevo no puede empezar cerrado.')
        return estado

    def create(self, validated_data):
        tipo = validated_data.pop('tipos_ID', None)
        proyecto = super().create(validated_data)
        if tipo is not None:
            Proyectos_tipos.objects.create(proyecto=proyecto, tipo=tipo)
        return proyecto

    def update(self, instance, validated_data):
        validated_data.pop('tipos_ID', None)
        return super().update(instance, validated_data)


class DocumentoProyectoSerializer(ModelSerializer):
    class Meta:
        model = DocumentoProyecto
        fields = ['documento_ID', 'tipo', 'nombre', 'url', 'creado_en']


class CierreProyectoSerializer(ModelSerializer):
    estado_nombre = serializers.CharField(source='estado.name', read_only=True)
    cerrado_por_nombre = SerializerMethodField()
    documentos = DocumentoProyectoSerializer(many=True, read_only=True)

    class Meta:
        model = CierreProyecto
        fields = [
            'cierre_ID', 'estado', 'estado_nombre', 'fecha_fin_real', 'costo_real', 'motivo', 'lecciones',
            'cerrado_por_nombre', 'cerrado_en', 'documentos',
        ]

    def get_cerrado_por_nombre(self, obj):
        u = obj.cerrado_por
        return f'{u.first_name} {u.last_name}'.strip() if u else ''


class CerrarProyectoSerializer(serializers.Serializer):
    estado_ID = serializers.PrimaryKeyRelatedField(queryset=Estado.objects.filter(categoria='finalizado'),
                                                   error_messages={'does_not_exist': 'Elija un estado de cierre (por ejemplo Completado o Cancelado).'})
    fecha_fin_real = serializers.DateField()
    costo_real = serializers.IntegerField(min_value=0)
    motivo = serializers.CharField(max_length=2000)
    lecciones = serializers.CharField(max_length=4000, required=False, allow_blank=True, default='')

    def validate_fecha_fin_real(self, valor):
        if valor > timezone.localdate():
            raise serializers.ValidationError('La fecha real de fin no puede ser futura.')
        return valor


class ReabrirProyectoSerializer(serializers.Serializer):
    estado_ID = serializers.PrimaryKeyRelatedField(queryset=Estado.objects.exclude(categoria='finalizado'),
                                                   error_messages={'does_not_exist': 'Elija un estado activo o pausado.'})
    motivo = serializers.CharField(max_length=2000)


class ProyectosReadSerializer(ModelSerializer):
    departamento_ID = DepartamentosSerializer(read_only=True)
    estado_ID = EstadoSerializer(read_only=True)
    prioridad_ID = PrioridadSerializer(read_only=True)
    user_ID = UsuarioResumenSerializer(read_only=True)
    images = ProjectImageSerializer(many=True, read_only=True)
    costo_total = SerializerMethodField()
    tipos = SerializerMethodField()
    mis_permisos = SerializerMethodField()
    cerrado = SerializerMethodField()
    cierre = SerializerMethodField()

    class Meta:
        model = Proyectos
        fields = '__all__'

    def get_cerrado(self, obj):
        return authz.esta_cerrado(obj)

    def get_cierre(self, obj):
        # Solo en el detalle, como mis_permisos: el cierre vigente (el último sin reabrir).
        if not self.context.get('incluir_mis_permisos') or not authz.esta_cerrado(obj):
            return None
        cierre = obj.cierres.filter(reabierto_en__isnull=True).select_related('estado', 'cerrado_por').prefetch_related('documentos').first()
        return CierreProyectoSerializer(cierre).data if cierre else None

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
