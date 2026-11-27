from datetime import timedelta
from django.utils import timezone
from django.utils.html import escape
from django.conf import settings
from django.db import IntegrityError
from .models import Tareas
from Projects.authz import membresia_vigente
from Projects.catalogo_permisos import TODOS
from Projects.models import MiembroProyecto, Proyectos
from Users.models import Ausencia, Users
from Notifications.models import Notificacion


DIAS_AVISO = 4
# Lo terminado o cancelado ya no necesita avisos.
MAX_NOMBRE = 80


def _hoy_cr():
    return timezone.localdate()


def _alcaldia_cache():
    """Quienes ven toda la institución (salvo el Administrador, que es técnico) reciben los avisos de vencimiento."""
    usuarios = Users.objects.filter(is_active=True).exclude(role__name='Administrador').select_related('role')
    return [u for u in usuarios if (u.role.permisos or {}).get('proyectos.ver') == TODOS]


def _delegaciones_por_proyecto(proyecto_ids):
    """Mapa {proyecto_id: [miembros vigentes del equipo]} en una sola query."""
    rows = (
        MiembroProyecto.objects
        .filter(membresia_vigente(), proyecto_id__in=proyecto_ids)
        .select_related('usuario')
    )
    mapping = {}
    for r in rows:
        mapping.setdefault(r.proyecto_id, []).append(r.usuario)
    return mapping


def _ausentes_hoy(hoy):
    return set(Ausencia.objects.filter(desde__lte=hoy, hasta__gte=hoy).values_list('usuario_id', flat=True))


def _jefatura(unidad, ausentes):
    """El jefe, y su suplente mientras el jefe está ausente."""
    personas = []
    if unidad and unidad.jefe_id:
        personas.append(unidad.jefe)
        if unidad.jefe_id in ausentes and unidad.suplente_id:
            personas.append(unidad.suplente)
    return personas


def _destinatarios_proyecto(proyecto, alcaldia, delegados_map, ausentes=frozenset()):
    destinatarios = set()
    if proyecto.user_ID_id:
        destinatarios.add(proyecto.user_ID)
    depto = proyecto.departamento_ID
    destinatarios.update(_jefatura(depto, ausentes))
    if depto:
        destinatarios.update(_jefatura(depto.direccion, ausentes))
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


def _urgencia(dias):
    if dias > 0:
        return f'faltan {dias} día(s)'
    if dias == 0:
        return 'HOY vence'
    return f'venció hace {-dias} día(s)'


DIAS_AVISO_ACCESO = 3


def desactivar_delegaciones_vencidas(hoy):
    """Los accesos al equipo de un proyecto vencen solos: pasan a inactivos al día siguiente de su fin."""
    from Auditoria.servicios import registrar
    vencidos = list(MiembroProyecto.objects.filter(activo=True, hasta__lt=hoy).select_related('usuario', 'proyecto'))
    MiembroProyecto.objects.filter(pk__in=[m.pk for m in vencidos]).update(activo=False)
    for m in vencidos:
        registrar('equipo', 'vencer', objeto=m, motivo=f'Su acceso terminaba el {m.hasta:%d/%m/%Y}', cambios={'activo': [True, False]})
    return len(vencidos)


def avisar_accesos_por_vencer(hoy):
    """Una vez, 3 días antes del fin: a la persona y a quien le dio el acceso, para que lo extienda si hace falta."""
    limite = hoy + timedelta(days=DIAS_AVISO_ACCESO)
    for m in MiembroProyecto.objects.filter(activo=True, hasta__gte=hoy, hasta__lte=limite).select_related('usuario', 'otorgado_por', 'proyecto', 'rol'):
        titulo = f'Su acceso a "{m.proyecto.name[:MAX_NOMBRE]}" vence el {m.hasta:%d/%m/%Y}'
        mensaje = f'Rol {m.rol.nombre}. Si necesita seguir, pida que se lo extiendan.'
        for u in {m.usuario, m.otorgado_por} - {None}:
            texto = titulo if u == m.usuario else f'El acceso de {m.usuario.first_name} {m.usuario.last_name} a "{m.proyecto.name[:MAX_NOMBRE]}" vence el {m.hasta:%d/%m/%Y}'
            try:
                Notificacion.objects.get_or_create(
                    usuario=u, clave_dedupe=f'acceso-vence:{m.miembro_ID}:{m.hasta}',
                    defaults={'tipo': 'delegacion', 'titulo': texto[:120], 'mensaje': mensaje, 'link': f'/projects/{m.proyecto_id}'},
                )
            except IntegrityError:
                pass


def send_due_date_warnings():
    """Avisos diarios desde 4 días antes del vencimiento y cada día mientras siga vencido,
    salvo lo completado o cancelado. Idempotente por (usuario, dedupe)."""
    hoy = _hoy_cr()
    limite = hoy + timedelta(days=DIAS_AVISO)
    desactivar_delegaciones_vencidas(hoy)
    avisar_accesos_por_vencer(hoy)
    from Solicitudes.servicios import escalar_vencidas
    escalar_vencidas(hoy)

    proyectos = list(
        Proyectos.objects
        .filter(fecha_entrega__lte=limite)
        .exclude(estado_ID__categoria='finalizado').filter(archivado=False)
        .select_related('user_ID', 'departamento_ID__direccion__jefe', 'departamento_ID__jefe',
                        'departamento_ID__suplente', 'departamento_ID__direccion__suplente')
    )
    alcaldia = _alcaldia_cache()
    ausentes = _ausentes_hoy(hoy)
    delegados_map = _delegaciones_por_proyecto([p.proyect_ID for p in proyectos])

    for p in proyectos:
        urgencia = _urgencia((p.fecha_entrega - hoy).days)
        titulo = f'Proyecto "{p.name[:MAX_NOMBRE]}" — {urgencia}'
        mensaje = (
            f'El proyecto "{p.name[:MAX_NOMBRE]}" tiene fecha de entrega el {p.fecha_entrega} ({urgencia}). '
            'Revise el avance y avise al equipo si requiere ajustes.'
        )
        link = f'/projects/{p.proyect_ID}'
        dedupe = f'venc-proy:{p.proyect_ID}:{hoy.isoformat()}'
        for u in _destinatarios_proyecto(p, alcaldia, delegados_map, ausentes):
            _enviar(u, f'[Muni] {titulo}', titulo, mensaje, 'vencimiento_proyecto', link, dedupe)

    tareas = list(
        Tareas.objects
        .filter(fecha_entrega__lte=limite)
        .exclude(estado_ID__categoria='finalizado')
        .exclude(proyecto_ID__estado_ID__categoria='finalizado')
        .select_related(
            'proyecto_ID__user_ID',
            'proyecto_ID__departamento_ID__direccion__jefe',
            'proyecto_ID__departamento_ID__jefe',
            'proyecto_ID__departamento_ID__suplente',
            'proyecto_ID__departamento_ID__direccion__suplente',
            'asignado_a',
        )
    )
    proyecto_ids_tareas = {t.proyecto_ID_id for t in tareas if t.proyecto_ID_id}
    delegados_map_t = _delegaciones_por_proyecto(proyecto_ids_tareas)

    for t in tareas:
        urgencia = _urgencia((t.fecha_entrega - hoy).days)
        titulo = f'Tarea "{t.name[:MAX_NOMBRE]}" — {urgencia}'
        mensaje = (
            f'La tarea "{t.name[:MAX_NOMBRE]}" del proyecto "{t.proyecto_ID.name[:MAX_NOMBRE]}" '
            f'tiene fecha de entrega el {t.fecha_entrega} ({urgencia}).'
        )
        link = f'/projects/{t.proyecto_ID_id}'
        dedupe = f'venc-tarea:{t.tareas_ID}:{hoy.isoformat()}'
        destinatarios = _destinatarios_proyecto(t.proyecto_ID, alcaldia, delegados_map_t, ausentes)
        if t.asignado_a_id:
            destinatarios.add(t.asignado_a)
        for u in destinatarios:
            _enviar(u, f'[Muni] {titulo}', titulo, mensaje, 'vencimiento_tarea', link, dedupe)

