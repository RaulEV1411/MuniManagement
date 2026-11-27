import csv
import io
import re

from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.permissions import AllowAny
from rest_framework.serializers import ModelSerializer, SerializerMethodField, CharField, IntegerField, DateTimeField
from rest_framework import filters
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from django.conf import settings
from django.db.models import DateTimeField as CampoFechaHora, F, Max, OuterRef, Prefetch, Subquery
from django.db.models.functions import Coalesce
from django.http import Http404, HttpResponse, JsonResponse
from django.utils import timezone
from django.utils.cache import patch_vary_headers
from django.utils.html import format_html, format_html_join

from Configuracion.models import Configuracion
from Historial.models import HistorialCambios
from .consultas import con_presupuesto
from .models import CierreProyecto, Proyectos, Estado, Prioridad, FINALIZADO
from .serializers import ProjectImageSerializer
from Task.models import Tareas


class _EstadoPublicoSerializer(ModelSerializer):
    class Meta:
        model = Estado
        fields = ['name', 'color', 'categoria']


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
    presupuesto = IntegerField(source='presupuesto_total', read_only=True)
    ejecutado = IntegerField(source='costo_ejecutado_total', read_only=True)
    actualizado = DateTimeField(read_only=True)
    cierre = SerializerMethodField()

    class Meta:
        model = Proyectos
        fields = [
            'proyect_ID', 'name', 'descripcion', 'fecha_inicio', 'fecha_entrega',
            'estado', 'prioridad', 'departamento', 'direccion', 'images', 'avance',
            'numero_sicop', 'distrito', 'latitud', 'longitud', 'presupuesto', 'ejecutado', 'actualizado', 'cierre',
        ]

    def get_avance(self, obj):
        # Un proyecto completado está al 100 % aunque no tenga tareas; las canceladas no cuentan.
        if obj.estado_ID and obj.estado_ID.name == 'Completado':
            return 100
        tareas = [t for t in obj.tareas_set.all() if t.estado_ID.name != 'Cancelado']
        if not tareas:
            return 0
        completadas = sum(1 for t in tareas if t.estado_ID.name == 'Completado')
        return round((completadas / len(tareas)) * 100)

    def get_cierre(self, obj):
        # Solo el cierre vigente de un proyecto finalizado. Las lecciones aprendidas son internas.
        if not obj.estado_ID or obj.estado_ID.categoria != FINALIZADO or not obj.cierres_vigentes:
            return None
        c = obj.cierres_vigentes[0]
        return {'estado': c.estado.name, 'fecha': c.fecha_fin_real, 'costo_final': c.costo_real, 'motivo': c.motivo}


class ProyectoPublicoDetailSerializer(ProyectoPublicoSerializer):
    tareas = _TareaPublicaSerializer(source='tareas_set', many=True, read_only=True)

    class Meta(ProyectoPublicoSerializer.Meta):
        fields = ProyectoPublicoSerializer.Meta.fields + ['tareas']


class PublicAnonThrottle(AnonRateThrottle):
    scope = 'public'


def proyectos_publicos():
    """Los proyectos que la institución publica, también los cancelados (con su cierre): el portal rinde
    cuentas de todo lo que mostró. La fecha de actualización es el último cambio del historial."""
    tareas_qs = Tareas.objects.select_related('estado_ID')
    ultimo_cambio = HistorialCambios.objects.filter(proyecto_ID=OuterRef('pk')).values('proyecto_ID').annotate(
        v=Max('created_at')).values('v')
    return con_presupuesto(
        Proyectos.objects
        .filter(es_publico=True)
        .select_related('estado_ID', 'prioridad_ID', 'departamento_ID__direccion')
        .prefetch_related(
            'images', Prefetch('tareas_set', queryset=tareas_qs),
            Prefetch('cierres', queryset=CierreProyecto.objects.filter(reabierto_en__isnull=True)
                     .select_related('estado').order_by('-cerrado_en'), to_attr='cierres_vigentes'),
        )
    ).annotate(
        actualizado=Coalesce(Subquery(ultimo_cambio), F('created_at'), output_field=CampoFechaHora()),
    ).order_by('-created_at', 'pk')


class ProyectoPublicoViewSet(ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'descripcion', 'departamento_ID__name']
    throttle_classes = [PublicAnonThrottle]

    def get_queryset(self):
        return proyectos_publicos()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProyectoPublicoDetailSerializer
        return ProyectoPublicoSerializer


def enlace_publico(proyecto_id=None):
    return f'{settings.FRONTEND_URL}/publico' + (f'/proyectos/{proyecto_id}' if proyecto_id else '')


def absoluta(url):
    return url if not url or url.startswith(('http://', 'https://')) else f'{settings.FRONTEND_URL}{url}'


COLUMNAS_ABIERTAS = [
    'id', 'nombre', 'descripcion', 'estado', 'departamento', 'direccion', 'distrito', 'latitud', 'longitud',
    'fecha_inicio', 'fecha_entrega', 'moneda', 'presupuesto_aprobado', 'ejecutado', 'avance', 'numero_sicop',
    'estado_final', 'fecha_cierre', 'costo_final', 'motivo_cierre', 'actualizado', 'enlace',
]


def _filas_abiertas(moneda):
    for p in ProyectoPublicoSerializer(proyectos_publicos(), many=True).data:
        cierre = p['cierre'] or {}
        yield {
            'id': p['proyect_ID'], 'nombre': p['name'], 'descripcion': p['descripcion'],
            'estado': (p['estado'] or {}).get('name', ''), 'departamento': p['departamento'] or '',
            'direccion': p['direccion'] or '', 'distrito': p['distrito'],
            'latitud': float(p['latitud']) if p['latitud'] is not None else None,
            'longitud': float(p['longitud']) if p['longitud'] is not None else None,
            'fecha_inicio': p['fecha_inicio'], 'fecha_entrega': p['fecha_entrega'], 'moneda': moneda,
            'presupuesto_aprobado': p['presupuesto'], 'ejecutado': p['ejecutado'], 'avance': p['avance'],
            'numero_sicop': p['numero_sicop'], 'estado_final': cierre.get('estado', ''),
            'fecha_cierre': str(cierre['fecha']) if cierre else '', 'costo_final': cierre.get('costo_final'),
            'motivo_cierre': cierre.get('motivo', ''), 'actualizado': p['actualizado'],
            'enlace': enlace_publico(p['proyect_ID']),
        }


# Un texto que empieza con =, +, - o @ (o con tabulación o retorno) lo ejecuta Excel como fórmula al abrir el CSV.
# También después de ; o de una tabulación: un Excel con ; como separador de lista parte ahí la celda.
_FORMULA = re.compile(r'(^|[;\t])(?=[=+\-@\t\r])')
# Solo el texto libre: los montos y las fechas salen como texto, y un monto negativo no es una fórmula.
_TEXTO_LIBRE = {'nombre', 'descripcion', 'estado', 'departamento', 'direccion', 'distrito', 'numero_sicop',
                'estado_final', 'motivo_cierre'}


def _sin_formula(columna, valor):
    return _FORMULA.sub(r"\1'", valor) if columna in _TEXTO_LIBRE and isinstance(valor, str) else valor


class DatosAbiertosView(APIView):
    """Los proyectos públicos como datos abiertos (CSV o JSON), con la licencia que elige la institución."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [PublicAnonThrottle]

    def get(self, request, formato):
        if formato not in ('csv', 'json'):
            raise Http404
        config = Configuracion.actual()
        licencia = config.licencia
        filas = list(_filas_abiertas(config.moneda))
        if formato == 'json':
            respuesta = JsonResponse({
                'institucion': config.nombre, 'licencia': licencia['nombre'], 'url_licencia': licencia['url'],
                'generado': timezone.now().isoformat(), 'columnas': COLUMNAS_ABIERTAS, 'proyectos': filas,
            }, json_dumps_params={'ensure_ascii': False})
        else:
            salida = io.StringIO()
            # BOM: sin él, Excel abre el UTF-8 como Latin-1 y rompe las tildes.
            salida.write('﻿')
            escritor = csv.DictWriter(salida, fieldnames=COLUMNAS_ABIERTAS)
            escritor.writeheader()
            for fila in filas:
                escritor.writerow({k: _sin_formula(k, v) for k, v in fila.items()})
            respuesta = HttpResponse(salida.getvalue(), content_type='text/csv; charset=utf-8')
        respuesta['Content-Disposition'] = f'attachment; filename="proyectos.{formato}"'
        respuesta['Link'] = f'<{licencia["url"]}>; rel="license"'
        return respuesta


def vista_previa(request, pk=None):
    """HTML corto con Open Graph para los robots que arman la vista previa al compartir un enlace del portal
    (Caddy les manda solo a ellos; las personas reciben la aplicación). Sin JavaScript: esos robots no lo corren."""
    config = Configuracion.actual()
    estado = 200
    proyecto = None
    if pk is not None:
        proyecto = proyectos_publicos().filter(pk=pk).first()
        if proyecto is None:
            estado = 404
    if proyecto:
        datos = ProyectoPublicoSerializer(proyecto).data
        titulo = f'{proyecto.name} · {config.nombre}'
        partes = [proyecto.descripcion, datos['estado']['name'] if datos['estado'] else '', f'Avance {datos["avance"]} %']
        descripcion = ' · '.join(x for x in partes if x)
        imagen = absoluta(datos['images'][0]['url']) if datos['images'] else absoluta(config.logo)
        url = enlace_publico(proyecto.pk)
    else:
        titulo = f'Portal de proyectos · {config.nombre}'
        descripcion = f'Proyectos públicos de {config.nombre}: avance, presupuesto, ubicación y datos abiertos.'
        imagen = absoluta(config.logo)
        url = enlace_publico()
    metas = [('og:type', 'website'), ('og:site_name', config.nombre), ('og:title', titulo),
             ('og:description', descripcion), ('og:url', url)]
    if imagen:
        metas.append(('og:image', imagen))
    html = format_html(
        '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>{}</title>'
        '<meta name="description" content="{}">{}<meta name="twitter:card" content="{}">'
        '<link rel="canonical" href="{}"></head><body><h1><a href="{}">{}</a></h1><p>{}</p></body></html>',
        titulo, descripcion,
        format_html_join('', '<meta property="{}" content="{}">', metas),
        'summary_large_image' if imagen else 'summary', url, url, titulo, descripcion,
    )
    respuesta = HttpResponse(html, status=estado, content_type='text/html; charset=utf-8')
    respuesta['Cache-Control'] = 'public, max-age=600'
    # La misma URL es la aplicación para las personas: una caché compartida no puede servirles esta.
    patch_vary_headers(respuesta, ('User-Agent',))
    return respuesta
