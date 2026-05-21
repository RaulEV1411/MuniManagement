from rest_framework.serializers import ModelSerializer, SerializerMethodField, ValidationError
from .models import (
    Estado, Prioridad, Tipos, Proyectos, Proyectos_tipos, ProjectImage,
    DelegacionSupervision, AjustePresupuesto,
)
from Departments.serializers import DepartamentosSerializer
from Users.serializers import UsersSerializer


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
    class Meta:
        model = Proyectos
        fields = '__all__'


class ProyectosReadSerializer(ModelSerializer):
    departamento_ID = DepartamentosSerializer(read_only=True)
    estado_ID = EstadoSerializer(read_only=True)
    prioridad_ID = PrioridadSerializer(read_only=True)
    user_ID = UsersSerializer(read_only=True)
    images = ProjectImageSerializer(many=True, read_only=True)
    costo_total = SerializerMethodField()

    class Meta:
        model = Proyectos
        fields = '__all__'

    def get_costo_total(self, obj):
        ajustes = getattr(obj, '_prefetched_ajustes', None)
        if ajustes is None:
            ajustes = list(obj.ajustes_presupuesto.all())
        delta = sum(a.monto if a.tipo == 'aumento' else -a.monto for a in ajustes)
        return (obj.costo or 0) + delta


class ProyectosTiposSerializer(ModelSerializer):
    class Meta:
        model = Proyectos_tipos
        fields = '__all__'


class DelegacionSupervisionSerializer(ModelSerializer):
    supervisor_info = UsersSerializer(source='supervisor', read_only=True)
    otorgado_por_info = UsersSerializer(source='otorgado_por', read_only=True)

    class Meta:
        model = DelegacionSupervision
        fields = [
            'delegacion_ID', 'proyecto', 'supervisor', 'otorgado_por',
            'puede_editar', 'activa', 'creada_en', 'expira_en',
            'supervisor_info', 'otorgado_por_info',
        ]
        read_only_fields = ['delegacion_ID', 'creada_en', 'otorgado_por']


class AjustePresupuestoSerializer(ModelSerializer):
    usuario_info = UsersSerializer(source='usuario', read_only=True)

    class Meta:
        model = AjustePresupuesto
        fields = [
            'ajuste_ID', 'proyecto', 'tarea', 'tipo', 'monto', 'motivo',
            'usuario', 'aprobado_por', 'fecha', 'usuario_info',
        ]
        read_only_fields = ['ajuste_ID', 'fecha', 'usuario']

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
