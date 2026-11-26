from rest_framework.serializers import ModelSerializer, PrimaryKeyRelatedField, SerializerMethodField, ValidationError
from .models import (
    Estado, Prioridad, Tipos, Proyectos, Proyectos_tipos, ProjectImage,
    DelegacionSupervision, AjustePresupuesto,
)
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

    class Meta:
        model = Proyectos
        fields = '__all__'

    def get_tipos(self, obj):
        return [{'tipos_ID': str(pt.tipo_id), 'name': pt.tipo.name} for pt in obj.proyectos_tipos_set.all()]

    def get_costo_total(self, obj):
        ajustes = obj.ajustes_presupuesto.all()
        delta = sum(a.monto if a.tipo == 'aumento' else -a.monto for a in ajustes)
        return (obj.costo or 0) + delta


class ProyectosTiposSerializer(ModelSerializer):
    class Meta:
        model = Proyectos_tipos
        fields = '__all__'


class DelegacionSupervisionSerializer(ModelSerializer):
    supervisor_info = UsuarioResumenSerializer(source='supervisor', read_only=True)
    otorgado_por_info = UsuarioResumenSerializer(source='otorgado_por', read_only=True)

    class Meta:
        model = DelegacionSupervision
        fields = [
            'delegacion_ID', 'proyecto', 'supervisor', 'otorgado_por',
            'puede_editar', 'activa', 'creada_en', 'expira_en',
            'supervisor_info', 'otorgado_por_info',
        ]
        read_only_fields = ['delegacion_ID', 'creada_en', 'otorgado_por']


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
