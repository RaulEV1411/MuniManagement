"""Auditoría: consulta, exportación, verificación, resumen, actividad por persona y sesiones."""
import csv
import io
import json
from datetime import datetime, time, timedelta

from django.db.models import Count, Max, OuterRef, Q, Subquery, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ReadOnlyModelViewSet

from Projects import authz
from Users.models import Users

from . import contexto, servicios, sesiones
from .models import ACCIONES, MODULOS, RESULTADOS, RegistroAuditoria, SesionUsuario
from .serializers import RegistroAuditoriaSerializer, SesionUsuarioSerializer

DIAS_INACTIVA = 90
UMBRAL_FALLIDOS = 5
MAXIMO_EXPORTACION = 50000


class PuedeVerAuditoria(BasePermission):
    message = 'Su rol no permite ver la auditoría.'

    def has_permission(self, request, view):
        return authz.puede(request.user, 'auditoria.ver')


def _inicio_del_dia(fecha):
    return timezone.make_aware(datetime.combine(fecha, time.min), timezone.get_current_timezone())


def filtrar(qs, p):
    for campo in ('modulo', 'accion', 'resultado', 'objeto_id'):
        if p.get(campo):
            qs = qs.filter(**{campo: p[campo]})
    if p.get('usuario'):
        qs = qs.filter(usuario_id=p['usuario'])
    desde, hasta = parse_date(p.get('desde') or ''), parse_date(p.get('hasta') or '')
    if desde:
        qs = qs.filter(creado_en__gte=_inicio_del_dia(desde))
    if hasta:
        qs = qs.filter(creado_en__lt=_inicio_del_dia(hasta + timedelta(days=1)))
    q = (p.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(objeto_repr__icontains=q) | Q(usuario_email__icontains=q) | Q(motivo__icontains=q) | Q(ip__icontains=q))
    return qs


def _celda(valor):
    """Evita que Excel interprete una celda como fórmula (inyección en CSV)."""
    texto = '' if valor is None else str(valor)
    return "'" + texto if texto[:1] in ('=', '+', '-', '@', '\t', '\r') else texto


COLUMNAS = ['id', 'creado_en', 'usuario_email', 'rol', 'ip', 'dispositivo', 'modulo', 'accion', 'objeto_tipo',
            'objeto_id', 'objeto_repr', 'resultado', 'motivo', 'cambios', 'hash_anterior', 'hash']


def _fila(reg):
    return {
        'id': reg.id, 'creado_en': reg.creado_en.isoformat(), 'usuario_email': reg.usuario_email, 'rol': reg.rol,
        'ip': reg.ip, 'dispositivo': servicios.describir_agente(reg.agente) if reg.agente else '',
        'modulo': reg.modulo, 'accion': reg.accion, 'objeto_tipo': reg.objeto_tipo, 'objeto_id': reg.objeto_id,
        'objeto_repr': reg.objeto_repr, 'resultado': reg.resultado, 'motivo': reg.motivo, 'cambios': reg.cambios,
        'hash_anterior': reg.hash_anterior, 'hash': reg.hash,
    }


class RegistrosViewSet(ReadOnlyModelViewSet):
    """Solo lectura: los registros los escribe el servidor y no se editan."""

    serializer_class = RegistroAuditoriaSerializer
    permission_classes = [IsAuthenticated, PuedeVerAuditoria]

    def get_queryset(self):
        return filtrar(RegistroAuditoria.objects.select_related('usuario'), self.request.query_params)

    @action(detail=False, methods=['get'])
    def exportar(self, request):
        formato = request.query_params.get('formato', 'csv')
        if formato not in ('csv', 'json'):
            return Response({'error': 'Formato no válido: use csv o json.'}, status=400)
        qs = self.get_queryset().order_by('id')
        total = qs.count()
        if total > MAXIMO_EXPORTACION:
            return Response({'error': f'Son {total} registros: acote las fechas (máximo {MAXIMO_EXPORTACION} por archivo).'}, status=400)
        filas = [_fila(r) for r in qs.iterator(chunk_size=2000)]
        filtros = {k: v for k, v in request.query_params.items() if k != 'formato' and v}
        servicios.registrar('auditoria', 'exportar', objeto_repr=f'Auditoría ({formato.upper()})',
                            motivo=f'{total} registros · filtros: {json.dumps(filtros, ensure_ascii=False)}')
        nombre = f'auditoria_{timezone.localdate().isoformat()}.{formato}'
        if formato == 'json':
            contenido = json.dumps(filas, ensure_ascii=False, indent=1, default=str)
            respuesta = HttpResponse(contenido, content_type='application/json; charset=utf-8')
        else:
            salida = io.StringIO()
            salida.write('﻿')  # para que Excel lea los acentos
            escritor = csv.writer(salida)
            escritor.writerow(COLUMNAS)
            for f in filas:
                f['cambios'] = json.dumps(f['cambios'], ensure_ascii=False) if f['cambios'] is not None else ''
                escritor.writerow([_celda(f[c]) for c in COLUMNAS])
            respuesta = HttpResponse(salida.getvalue(), content_type='text/csv; charset=utf-8')
        respuesta['Content-Disposition'] = f'attachment; filename="{nombre}"'
        return respuesta


class VerificarView(APIView):
    permission_classes = [IsAuthenticated, PuedeVerAuditoria]

    def get(self, request):
        return Response(servicios.verificar_cadena())


class CatalogoView(APIView):
    permission_classes = [IsAuthenticated, PuedeVerAuditoria]

    def get(self, request):
        return Response({
            'modulos': [{'codigo': c, 'nombre': n} for c, n in MODULOS],
            'acciones': [{'codigo': c, 'nombre': n} for c, n in ACCIONES],
            'resultados': [{'codigo': c, 'nombre': n} for c, n in RESULTADOS],
        })


def _persona(u, **extra):
    return {'user_ID': str(u.pk), 'nombre': f'{u.first_name} {u.last_name}'.strip(), 'email': u.email, **extra}


def _ultima_conexion():
    return Subquery(
        SesionUsuario.objects.filter(usuario=OuterRef('pk')).order_by('-ultima_actividad').values('ultima_actividad')[:1]
    )


class ResumenView(APIView):
    """Sesiones abiertas, cuentas sin uso e intentos fallidos: lo que conviene mirar primero."""

    permission_classes = [IsAuthenticated, PuedeVerAuditoria]

    def get(self, request):
        ahora = timezone.now()
        abiertas = SesionUsuario.objects.filter(cerrada_en__isnull=True, ultima_actividad__gte=ahora - sesiones.duracion_maxima())
        limite = ahora - timedelta(days=DIAS_INACTIVA)
        condicion = Q(ultima__lt=limite)
        primero = RegistroAuditoria.objects.order_by('id').values_list('creado_en', flat=True).first()
        # Sin sesiones registradas solo cuenta como inactiva si la auditoría ya lleva ese tiempo.
        if primero and primero < limite:
            condicion |= Q(ultima__isnull=True)
        inactivas = Users.objects.filter(is_active=True).annotate(ultima=_ultima_conexion()).filter(condicion).order_by('ultima')
        fallos = (
            RegistroAuditoria.objects.filter(accion='fallo_inicio', creado_en__gte=ahora - timedelta(hours=24))
            .exclude(objeto_id='').values('objeto_id').annotate(n=Count('id'), ultimo=Max('creado_en'))
            .filter(n__gte=UMBRAL_FALLIDOS).order_by('-n')
        )
        personas = {str(u.pk): u for u in Users.objects.filter(pk__in=[f['objeto_id'] for f in fallos])}
        hoy = _inicio_del_dia(timezone.localdate())
        return Response({
            'conectadas_ahora': abiertas.filter(ultima_actividad__gte=ahora - sesiones.INACTIVIDAD).values('usuario').distinct().count(),
            'sesiones_abiertas': abiertas.count(),
            'registros_hoy': RegistroAuditoria.objects.filter(creado_en__gte=hoy).count(),
            'denegados_24h': RegistroAuditoria.objects.filter(resultado='denegado', creado_en__gte=ahora - timedelta(hours=24)).count(),
            'fallidos_24h': RegistroAuditoria.objects.filter(accion='fallo_inicio', creado_en__gte=ahora - timedelta(hours=24)).count(),
            'dias_inactiva': DIAS_INACTIVA,
            'umbral_fallidos': UMBRAL_FALLIDOS,
            'inactivas': [_persona(u, ultima_conexion=u.ultima) for u in inactivas[:50]],
            'total_inactivas': inactivas.count(),
            'con_intentos_fallidos': [
                _persona(personas[f['objeto_id']], intentos=f['n'], ultimo=f['ultimo'])
                for f in fallos if f['objeto_id'] in personas
            ],
        })


class ActividadView(APIView):
    """Actividad de una persona: la propia, o la de cualquiera con auditoria.ver."""

    def get(self, request, user_id):
        objetivo = get_object_or_404(Users, pk=user_id)
        es_propia = objetivo.pk == request.user.pk
        if not es_propia and not authz.puede(request.user, 'auditoria.ver'):
            return Response({'error': 'Solo puede ver su propia actividad.'}, status=403)
        ahora = timezone.now()
        suyas = SesionUsuario.objects.filter(usuario=objetivo)
        abiertas = suyas.filter(cerrada_en__isnull=True, ultima_actividad__gte=ahora - sesiones.duracion_maxima())
        contexto_serializer = {'sesion_actual': contexto.sesion(), 'abierta_desde': ahora - sesiones.duracion_maxima()}
        return Response({
            'ultima_conexion': suyas.aggregate(m=Max('ultima_actividad'))['m'],
            'segundos_30_dias': suyas.filter(ultima_actividad__gte=ahora - timedelta(days=30)).aggregate(s=Sum('segundos_activos'))['s'] or 0,
            'sesiones_abiertas': abiertas.count(),
            'fallidos_24h': RegistroAuditoria.objects.filter(
                accion='fallo_inicio', objeto_id=str(objetivo.pk), creado_en__gte=ahora - timedelta(hours=24),
            ).count(),
            'puede_cerrar': es_propia or authz.puede_gestionar_a(request.user, objetivo),
            'sesiones': SesionUsuarioSerializer(suyas.select_related('cerrada_por')[:20], many=True, context=contexto_serializer).data,
            'acciones': RegistroAuditoriaSerializer(
                RegistroAuditoria.objects.filter(usuario=objetivo).select_related('usuario')[:20], many=True,
            ).data,
        })


class CerrarSesionView(APIView):
    """Cerrar una sesión a distancia: la propia, o la de alguien que se puede gestionar."""

    def post(self, request, sesion_id):
        sesion = get_object_or_404(SesionUsuario.objects.select_related('usuario'), pk=sesion_id)
        propia = sesion.usuario_id == request.user.pk
        if not propia and not authz.puede_gestionar_a(request.user, sesion.usuario):
            return Response({'error': 'No tiene permisos para cerrar las sesiones de esta persona.'}, status=403)
        if sesion.cerrada_en is not None:
            return Response({'error': 'Esa sesión ya estaba cerrada.'}, status=400)
        sesiones.cerrar(sesion.pk, 'remota', por=request.user)
        servicios.registrar(
            'sesion', 'cerrar_sesion_remota', objeto=sesion.usuario,
            motivo=f'{servicios.describir_agente(sesion.agente)}, iniciada el {timezone.localtime(sesion.iniciada_en):%d/%m/%Y %H:%M}',
        )
        return Response({'ok': True})


class ExportacionesView(APIView):
    """Los reportes se arman en el navegador: acá se anota que alguien los exportó."""

    def post(self, request):
        if not authz.puede(request.user, 'reportes.exportar'):
            return Response({'error': 'Su rol no permite exportar reportes.'}, status=403)
        formato = str(request.data.get('formato', ''))
        if formato not in ('xlsx', 'pdf'):
            return Response({'error': 'Formato no válido.'}, status=400)
        try:
            cantidad = max(0, int(request.data.get('cantidad', 0)))
        except (TypeError, ValueError):
            cantidad = 0
        filtros = request.data.get('filtros') if isinstance(request.data.get('filtros'), dict) else {}
        filtros = {str(k)[:30]: str(v)[:60] for k, v in list(filtros.items())[:10] if v not in (None, '')}
        servicios.registrar(
            'reportes', 'exportar', objeto_repr=f'Reporte de proyectos ({formato.upper()})',
            motivo=f'{cantidad} proyectos · filtros: {json.dumps(filtros, ensure_ascii=False)}',
        )
        return Response({'ok': True}, status=201)
