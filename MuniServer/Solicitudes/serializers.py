from rest_framework import serializers

from Projects.models import RolProyecto
from Task.models import Tareas
from Users.models import Users

from . import servicios
from .models import AUMENTO, PERSONAL, PLAZO, REBAJO, RESPONSABLE, PasoAprobacion, ReglaAprobacion, Solicitud, TipoSolicitud


def _nombre(u):
    return f'{u.first_name} {u.last_name}'.strip() if u else ''


class TipoSolicitudSerializer(serializers.ModelSerializer):
    efecto_display = serializers.CharField(source='get_efecto_display', read_only=True)

    class Meta:
        model = TipoSolicitud
        fields = ['tipo_ID', 'nombre', 'descripcion', 'efecto', 'efecto_display', 'dias_respuesta', 'is_system', 'activo', 'orden']
        read_only_fields = ['is_system']

    def validate(self, datos):
        # Los del sistema solo ajustan el plazo de respuesta, la descripción y si se ofrecen.
        if self.instance is not None and self.instance.is_system:
            for campo in ('nombre', 'efecto'):
                if campo in datos and datos[campo] != getattr(self.instance, campo):
                    raise serializers.ValidationError({campo: 'Los tipos del sistema no cambian de nombre ni de efecto.'})
        return datos


class ReglaAprobacionSerializer(serializers.ModelSerializer):
    nivel_display = serializers.CharField(source='get_nivel_display', read_only=True)

    class Meta:
        model = ReglaAprobacion
        fields = ['regla_ID', 'tipo', 'nivel', 'nivel_display', 'desde']


class PasoSerializer(serializers.ModelSerializer):
    nivel_display = serializers.CharField(source='get_nivel_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    decidido_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = PasoAprobacion
        fields = ['orden', 'nivel', 'nivel_display', 'estado', 'estado_display', 'vence', 'escalado',
                  'decidido_por_nombre', 'decidido_en', 'comentario']

    def get_decidido_por_nombre(self, obj):
        return _nombre(obj.decidido_por)


class SolicitudSerializer(serializers.ModelSerializer):
    proyecto_nombre = serializers.CharField(source='proyecto.name', read_only=True)
    tarea_nombre = serializers.SerializerMethodField()
    tipo_nombre = serializers.CharField(source='tipo.nombre', read_only=True)
    efecto = serializers.CharField(source='tipo.efecto', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    solicitante_nombre = serializers.SerializerMethodField()
    persona_nombre = serializers.SerializerMethodField()
    rol_proyecto_nombre = serializers.SerializerMethodField()
    fecha_actual = serializers.SerializerMethodField()
    impacto = serializers.SerializerMethodField()
    pasos = PasoSerializer(many=True, read_only=True)
    vence = serializers.SerializerMethodField()
    puedo_decidir = serializers.SerializerMethodField()
    puedo_retirar = serializers.SerializerMethodField()

    class Meta:
        model = Solicitud
        fields = [
            'numero', 'proyecto', 'proyecto_nombre', 'tarea', 'tarea_nombre', 'tipo', 'tipo_nombre', 'efecto',
            'justificacion', 'nueva_fecha', 'fecha_actual', 'monto', 'persona', 'persona_nombre', 'rol_proyecto',
            'rol_proyecto_nombre', 'hasta', 'impacto', 'estado', 'estado_display', 'solicitante', 'solicitante_nombre',
            'creada_en', 'resuelta_en', 'aplicada', 'resultado', 'pasos', 'vence', 'puedo_decidir', 'puedo_retirar',
        ]

    def _user(self):
        return self.context['request'].user

    def get_tarea_nombre(self, obj):
        return obj.tarea.name if obj.tarea else ''

    def get_solicitante_nombre(self, obj):
        return _nombre(obj.solicitante)

    def get_persona_nombre(self, obj):
        return _nombre(obj.persona)

    def get_rol_proyecto_nombre(self, obj):
        return obj.rol_proyecto.nombre if obj.rol_proyecto else ''

    def get_fecha_actual(self, obj):
        return servicios.fecha_actual(obj) if obj.tipo.efecto == PLAZO else None

    def get_impacto(self, obj):
        return servicios.impacto(obj)

    def get_vence(self, obj):
        paso = servicios.paso_en_turno(obj)
        return paso.vence if paso and obj.estado in Solicitud.ABIERTAS else None

    def get_puedo_decidir(self, obj):
        return servicios.puede_decidir(self._user(), servicios.paso_en_turno(obj), obj)

    def get_puedo_retirar(self, obj):
        return obj.solicitante_id == self._user().pk and obj.estado in Solicitud.ABIERTAS


class CrearSolicitudSerializer(serializers.ModelSerializer):
    tipo = serializers.PrimaryKeyRelatedField(queryset=TipoSolicitud.objects.filter(activo=True))
    tarea = serializers.PrimaryKeyRelatedField(queryset=Tareas.objects.all(), required=False, allow_null=True)
    persona = serializers.PrimaryKeyRelatedField(queryset=Users.objects.filter(is_active=True), required=False, allow_null=True)
    rol_proyecto = serializers.PrimaryKeyRelatedField(queryset=RolProyecto.objects.all(), required=False, allow_null=True)
    justificacion = serializers.CharField(max_length=4000)

    class Meta:
        model = Solicitud
        fields = ['proyecto', 'tarea', 'tipo', 'justificacion', 'nueva_fecha', 'monto', 'persona', 'rol_proyecto', 'hasta']

    def validate(self, d):
        efecto = d['tipo'].efecto
        proyecto, tarea = d['proyecto'], d.get('tarea')
        if tarea is not None:
            if tarea.proyecto_ID_id != proyecto.pk:
                raise serializers.ValidationError({'tarea': 'La tarea no es de este proyecto.'})
            if efecto not in (PLAZO, AUMENTO, REBAJO):
                raise serializers.ValidationError({'tarea': 'Este tipo de solicitud es para el proyecto, no para una tarea.'})
        if efecto == PLAZO:
            actual = (tarea or proyecto).fecha_entrega
            if not d.get('nueva_fecha') or d['nueva_fecha'] <= actual:
                raise serializers.ValidationError({'nueva_fecha': f'Indique una fecha posterior a la entrega actual ({actual:%d/%m/%Y}).'})
        if efecto in (AUMENTO, REBAJO) and not d.get('monto'):
            raise serializers.ValidationError({'monto': 'Indique el monto.'})
        if efecto in (PERSONAL, RESPONSABLE) and not d.get('persona'):
            raise serializers.ValidationError({'persona': 'Elija a la persona.'})
        if efecto == PERSONAL and not d.get('rol_proyecto'):
            raise serializers.ValidationError({'rol_proyecto': 'Elija el rol en el proyecto.'})
        if efecto == RESPONSABLE and d['persona'].pk == proyecto.user_ID_id:
            raise serializers.ValidationError({'persona': 'Esa persona ya es la responsable.'})
        # Solo se guarda lo que el tipo usa.
        for campo, usa in (('nueva_fecha', efecto == PLAZO), ('monto', efecto in (AUMENTO, REBAJO)),
                           ('persona', efecto in (PERSONAL, RESPONSABLE)), ('rol_proyecto', efecto == PERSONAL),
                           ('hasta', efecto == PERSONAL)):
            if not usa:
                d.pop(campo, None)
        return d
