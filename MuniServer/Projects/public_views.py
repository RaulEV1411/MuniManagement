from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.permissions import AllowAny
from rest_framework.serializers import ModelSerializer, SerializerMethodField, CharField
from rest_framework import filters
from rest_framework.throttling import AnonRateThrottle
from django.db.models import Prefetch

from .models import Proyectos, Estado, Prioridad
from .serializers import ProjectImageSerializer
from Task.models import Tareas


class _EstadoPublicoSerializer(ModelSerializer):
    class Meta:
        model = Estado
        fields = ['name', 'color']


class _PrioridadPublicoSerializer(ModelSerializer):
    class Meta:
        model = Prioridad
        fields = ['name', 'color']


class _TareaPublicaSerializer(ModelSerializer):
    estado = _EstadoPublicoSerializer(source='estado_ID', read_only=True)

    class Meta:
        model = Tareas
        fields = ['tareas_ID', 'name', 'estado', 'fecha_inicio', 'fecha_entrega']


class ProyectoPublicoSerializer(ModelSerializer):
    estado = _EstadoPublicoSerializer(source='estado_ID', read_only=True)
    prioridad = _PrioridadPublicoSerializer(source='prioridad_ID', read_only=True)
    departamento = CharField(source='departamento_ID.name', read_only=True)
    direccion = CharField(source='departamento_ID.direccion.name', read_only=True)
    images = ProjectImageSerializer(many=True, read_only=True)
    avance = SerializerMethodField()

    class Meta:
        model = Proyectos
        fields = [
            'proyect_ID', 'name', 'descripcion', 'fecha_inicio', 'fecha_entrega',
            'estado', 'prioridad', 'departamento', 'direccion', 'images', 'avance',
        ]

    def get_avance(self, obj):
        tareas = list(getattr(obj, 'tareas_set').all()) if hasattr(obj, 'tareas_set') else []
        if not tareas:
            return 0
        completadas = sum(1 for t in tareas if 'Completad' in (t.estado_ID.name or ''))
        return round((completadas / len(tareas)) * 100)


class ProyectoPublicoDetailSerializer(ProyectoPublicoSerializer):
    tareas = _TareaPublicaSerializer(source='tareas_set', many=True, read_only=True)

    class Meta(ProyectoPublicoSerializer.Meta):
        fields = ProyectoPublicoSerializer.Meta.fields + ['tareas']


class PublicAnonThrottle(AnonRateThrottle):
    scope = 'public'


class ProyectoPublicoViewSet(ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'descripcion', 'departamento_ID__name']
    throttle_classes = [PublicAnonThrottle]

    def get_queryset(self):
        tareas_qs = Tareas.objects.select_related('estado_ID')
        return (
            Proyectos.objects
            .filter(es_publico=True)
            .exclude(estado_ID__name__in=['Cancelado'])
            .select_related('estado_ID', 'prioridad_ID', 'departamento_ID__direccion')
            .prefetch_related('images', Prefetch('tareas_set', queryset=tareas_qs))
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProyectoPublicoDetailSerializer
        return ProyectoPublicoSerializer
