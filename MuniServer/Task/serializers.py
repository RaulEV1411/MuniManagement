from rest_framework import serializers
from rest_framework.serializers import ModelSerializer, SerializerMethodField, ValidationError

from Projects import campos as campos_personalizados
from Projects.models import CampoPersonalizado
from Projects.serializers import EstadoSerializer, PrioridadSerializer
from Users.serializers import UsuarioResumenSerializer

from .models import AsignacionRecurso, ChecklistItem, ComentarioTarea, Recurso, Tareas, TaskImage


class TaskImageSerializer(ModelSerializer):
    class Meta:
        model = TaskImage
        fields = ['imagen_ID', 'url', 'public_id', 'created_at']


def _hay_ciclo(tarea, bloqueos):
    """¿Alguna de las que la bloquean termina dependiendo de ella misma?"""
    pendientes, vistas = [b.pk for b in bloqueos], set()
    while pendientes:
        actual = pendientes.pop()
        if actual == tarea.pk:
            return True
        if actual in vistas:
            continue
        vistas.add(actual)
        pendientes.extend(Tareas.objects.filter(pk=actual).values_list('bloqueada_por', flat=True))
    return False


class TareasWriteSerializer(ModelSerializer):
    class Meta:
        model = Tareas
        fields = '__all__'

    def validate_etiquetas(self, valor):
        if not isinstance(valor, list) or len(valor) > 10:
            raise ValidationError('Use hasta 10 etiquetas.')
        return sorted({str(e).strip()[:30] for e in valor if str(e).strip()})

    def validate(self, datos):
        proyecto = datos.get('proyecto_ID') or getattr(self.instance, 'proyecto_ID', None)
        bloqueos = datos.get('bloqueada_por')
        if bloqueos:
            if any(b.proyecto_ID_id != proyecto.pk for b in bloqueos):
                raise ValidationError({'bloqueada_por': 'Solo puede depender de tareas del mismo proyecto.'})
            if self.instance is not None and (self.instance in bloqueos or _hay_ciclo(self.instance, bloqueos)):
                raise ValidationError({'bloqueada_por': 'Esa dependencia forma un círculo: una tarea terminaría esperándose a sí misma.'})
        horas = [datos.get('horas_estimadas'), datos.get('horas_reales')]
        if any(h is not None and h < 0 for h in horas):
            raise ValidationError({'horas_reales': 'Las horas no pueden ser negativas.'})
        # Los campos de tarea dependen del tipo del proyecto.
        if self.instance is None or 'campos_extra' in datos:
            datos['campos_extra'] = campos_personalizados.validar(
                CampoPersonalizado.TAREA, datos.get('campos_extra', {}), campos_personalizados.tipos_de(proyecto),
                getattr(self.instance, 'campos_extra', None), al_crear=self.instance is None,
            )
        return datos


class ChecklistItemSerializer(ModelSerializer):
    hecho_por_nombre = SerializerMethodField()

    class Meta:
        model = ChecklistItem
        fields = ['item_ID', 'tarea', 'texto', 'hecho', 'orden', 'hecho_por_nombre', 'hecho_en']
        read_only_fields = ['hecho_en']

    def get_hecho_por_nombre(self, obj):
        u = obj.hecho_por
        return f'{u.first_name} {u.last_name}'.strip() if u else ''


class ComentarioTareaSerializer(ModelSerializer):
    autor = UsuarioResumenSerializer(read_only=True)

    class Meta:
        model = ComentarioTarea
        fields = ['comentario_ID', 'tarea', 'autor', 'texto', 'creado_en']
        read_only_fields = ['creado_en']


class RecursoSerializer(ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = Recurso
        fields = ['recurso_ID', 'nombre', 'tipo', 'tipo_display', 'codigo', 'descripcion', 'activo']


class AsignacionRecursoSerializer(ModelSerializer):
    recurso_info = RecursoSerializer(source='recurso', read_only=True)

    class Meta:
        model = AsignacionRecurso
        fields = ['asignacion_ID', 'tarea', 'recurso', 'recurso_info', 'cantidad', 'desde', 'hasta', 'nota']

    def validate(self, datos):
        if datos.get('cantidad') is not None and datos['cantidad'] <= 0:
            raise ValidationError({'cantidad': 'La cantidad tiene que ser mayor que cero.'})
        if datos.get('desde') and datos.get('hasta') and datos['hasta'] < datos['desde']:
            raise ValidationError({'hasta': '«Hasta» no puede ser antes de «desde».'})
        if not datos['recurso'].activo:
            raise ValidationError({'recurso': 'Ese recurso está dado de baja.'})
        return datos


class TareaResumenSerializer(ModelSerializer):
    estado_ID = EstadoSerializer(read_only=True)

    class Meta:
        model = Tareas
        fields = ['tareas_ID', 'name', 'estado_ID']


class TareasReadSerializer(ModelSerializer):
    images = TaskImageSerializer(many=True, read_only=True)
    asignado_a = UsuarioResumenSerializer(read_only=True)
    colaboradores = UsuarioResumenSerializer(many=True, read_only=True)
    bloqueada_por = TareaResumenSerializer(many=True, read_only=True)
    checklist = ChecklistItemSerializer(many=True, read_only=True)
    recursos = AsignacionRecursoSerializer(many=True, read_only=True)
    # El front agrupa y colorea por estado y prioridad: los necesita como objetos, no como ids.
    estado_ID = EstadoSerializer(read_only=True)
    prioridad_ID = PrioridadSerializer(read_only=True)
    bloqueada = SerializerMethodField()
    documentos = SerializerMethodField()
    comentarios = SerializerMethodField()

    class Meta:
        model = Tareas
        fields = '__all__'

    def get_bloqueada(self, obj):
        return any(b.estado_ID.categoria != 'finalizado' for b in obj.bloqueada_por.all())

    def get_documentos(self, obj):
        return len(obj.documentos.all())

    def get_comentarios(self, obj):
        return len(obj.comentarios.all())
