from datetime import timedelta
import pytz
from django.utils import timezone
from django.utils.html import escape
from django.conf import settings
from django.db import IntegrityError
from .models import Tareas
from Projects.models import Proyectos, DelegacionSupervision
from Users.models import Users
from Notifications.models import Notificacion


CR_TZ = pytz.timezone('America/Costa_Rica')
DIAS_AVISO = 4
MAX_NOMBRE = 80


def _hoy_cr():
    return timezone.now().astimezone(CR_TZ).date()


def _alcaldia_cache():
    return list(Users.objects.filter(role__name__in=['Alcalde', 'Vicealcalde']))


def _delegaciones_por_proyecto(proyecto_ids):
    """Mapa {proyecto_id: [supervisores]} en una sola query."""
    rows = (
        DelegacionSupervision.objects
        .filter(proyecto_id__in=proyecto_ids, activa=True)
        .select_related('supervisor')
    )
    mapping = {}
    for r in rows:
        mapping.setdefault(r.proyecto_id, []).append(r.supervisor)
    return mapping


def _destinatarios_proyecto(proyecto, alcaldia, delegados_map):
    destinatarios = set()
    if proyecto.user_ID_id:
        destinatarios.add(proyecto.user_ID)
    depto = proyecto.departamento_ID
    if depto and depto.jefe_id:
        destinatarios.add(depto.jefe)
    if depto and depto.direccion and depto.direccion.jefe_id:
        destinatarios.add(depto.direccion.jefe)
    destinatarios.update(alcaldia)
    for s in delegados_map.get(proyecto.proyect_ID, []):
        destinatarios.add(s)
    return destinatarios


def _enviar(usuario, asunto, titulo, mensaje, tipo, link, dedupe):
    """Crea notificación in-app idempotente y encola email asíncrono (Celery).

    Idempotencia portable: usa get_or_create para evitar duplicar por (usuario, dedupe),
    sin depender de un UniqueConstraint condicional (no soportado en MySQL).
    """
    _, creada = Notificacion.objects.get_or_create(
        usuario=usuario,
        clave_dedupe=dedupe,
        defaults={
            'tipo': tipo,
            'titulo': titulo,
            'mensaje': mensaje,
            'link': link,
        },
    )
    if not creada:
        return
    if usuario.email and settings.EMAIL_HOST_USER:
        titulo_e = escape(titulo[:MAX_NOMBRE])
        mensaje_e = escape(mensaje[:1000])
        html = f"""
        <div style='font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:24px;'>
          <div style='max-width:560px;margin:0 auto;background:white;border-radius:12px;padding:32px;'>
            <h2 style='color:#0C3857;margin:0 0 12px;'>{titulo_e}</h2>
            <p style='color:#334155;line-height:1.6;'>{mensaje_e}</p>
            <p style='color:#64748b;font-size:12px;margin-top:24px;'>MuniManagement · Sistema de gestión municipal</p>
          </div>
        </div>
        """
        # Import perezoso para evitar ciclo (tasks.py importa cron en el beat).
        from .tasks import enviar_email_async
        enviar_email_async.delay(asunto, mensaje, html, [usuario.email])


def send_due_date_warnings():
    """Avisos diarios a 0-4 días del vencimiento. Idempotente por (usuario, dedupe)."""
    hoy = _hoy_cr()
    limite = hoy + timedelta(days=DIAS_AVISO)

    proyectos = list(
        Proyectos.objects
        .filter(fecha_entrega__gte=hoy, fecha_entrega__lte=limite)
        .select_related('user_ID', 'departamento_ID__direccion__jefe', 'departamento_ID__jefe')
    )
    alcaldia = _alcaldia_cache()
    delegados_map = _delegaciones_por_proyecto([p.proyect_ID for p in proyectos])

    for p in proyectos:
        dias = (p.fecha_entrega - hoy).days
        urgencia = 'HOY vence' if dias == 0 else f'faltan {dias} día(s)'
        titulo = f'Proyecto "{p.name[:MAX_NOMBRE]}" — {urgencia}'
        mensaje = (
            f'El proyecto "{p.name[:MAX_NOMBRE]}" tiene fecha de entrega el {p.fecha_entrega} ({urgencia}). '
            'Revisa el avance y notifica al equipo si requiere ajuste.'
        )
        link = f'/projects/{p.proyect_ID}'
        dedupe = f'venc-proy:{p.proyect_ID}:{hoy.isoformat()}'
        for u in _destinatarios_proyecto(p, alcaldia, delegados_map):
            _enviar(u, f'[Muni] {titulo}', titulo, mensaje, 'vencimiento_proyecto', link, dedupe)

    tareas = list(
        Tareas.objects
        .filter(fecha_entrega__gte=hoy, fecha_entrega__lte=limite)
        .select_related(
            'proyecto_ID__user_ID',
            'proyecto_ID__departamento_ID__direccion__jefe',
            'proyecto_ID__departamento_ID__jefe',
            'asignado_a',
        )
    )
    proyecto_ids_tareas = {t.proyecto_ID_id for t in tareas if t.proyecto_ID_id}
    delegados_map_t = _delegaciones_por_proyecto(proyecto_ids_tareas)

    for t in tareas:
        dias = (t.fecha_entrega - hoy).days
        urgencia = 'HOY vence' if dias == 0 else f'faltan {dias} día(s)'
        titulo = f'Tarea "{t.name[:MAX_NOMBRE]}" — {urgencia}'
        mensaje = (
            f'La tarea "{t.name[:MAX_NOMBRE]}" del proyecto "{t.proyecto_ID.name[:MAX_NOMBRE]}" '
            f'vence el {t.fecha_entrega} ({urgencia}).'
        )
        link = f'/projects/{t.proyecto_ID_id}'
        dedupe = f'venc-tarea:{t.tareas_ID}:{hoy.isoformat()}'
        destinatarios = _destinatarios_proyecto(t.proyecto_ID, alcaldia, delegados_map_t)
        if t.asignado_a_id:
            destinatarios.add(t.asignado_a)
        for u in destinatarios:
            _enviar(u, f'[Muni] {titulo}', titulo, mensaje, 'vencimiento_tarea', link, dedupe)


def send_due_date_reminder():
    """Alias retro-compatible."""
    send_due_date_warnings()
