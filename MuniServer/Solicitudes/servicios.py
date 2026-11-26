"""Reglas de las solicitudes: cadena de aprobación, quién decide cada paso, aplicar y escalar."""
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from Historial.models import HistorialCambios
from Notifications.servicios import nombre, notificar
from Projects import authz
from Projects import catalogo_permisos as cat

from .models import (
    AUMENTO, ORDEN_DE_NIVELES, PERSONAL, PLAZO, REBAJO, RESPONSABLE, PasoAprobacion, Solicitud,
)

ALCANCE_DE_NIVEL = {'departamento': cat.DEPARTAMENTO, 'direccion': cat.DIRECCION, 'alcaldia': cat.TODOS}


def fecha_actual(solicitud):
    objetivo = solicitud.tarea or solicitud.proyecto
    return objetivo.fecha_entrega


def impacto(solicitud):
    """Lo que se compara con los umbrales: el monto, o los días de prórroga."""
    efecto = solicitud.tipo.efecto
    if efecto in (AUMENTO, REBAJO):
        return solicitud.monto or 0
    if efecto == PLAZO and solicitud.nueva_fecha:
        return max(0, (solicitud.nueva_fecha - fecha_actual(solicitud)).days)
    return 0


def niveles_de(solicitud):
    """Los pasos que aplican, de menor a mayor; siempre al menos la jefatura del departamento."""
    valor = impacto(solicitud)
    niveles = {r.nivel for r in solicitud.tipo.reglas.all() if valor >= r.desde}
    return [n for n in ORDEN_DE_NIVELES if n in niveles] or ['departamento']


def paso_en_turno(solicitud):
    return next((p for p in solicitud.pasos.all() if p.estado == 'pendiente'), None)


def nivel_efectivo(paso):
    if not paso.escalado:
        return paso.nivel
    i = ORDEN_DE_NIVELES.index(paso.nivel)
    return ORDEN_DE_NIVELES[min(i + 1, len(ORDEN_DE_NIVELES) - 1)]


def puede_decidir(user, paso, solicitud=None):
    """Cada paso lo decide su nivel: quien tiene solicitudes.aprobar con ese alcance exacto, sobre el
    departamento del proyecto. Si el paso venció sin respuesta (escalado), también el nivel siguiente.
    Así una jefatura de dirección no aprueba por el departamento y después por sí misma. Nadie decide
    su propia solicitud ni dos pasos de la misma. El Administrador puede decidir cualquiera."""
    if paso is None:
        return False
    solicitud = solicitud or paso.solicitud
    if solicitud.estado not in Solicitud.ABIERTAS or paso.estado != 'pendiente':
        return False
    if not getattr(user, 'is_authenticated', False) or solicitud.solicitante_id == user.pk:
        return False
    if authz.es_administrador(user):
        return True
    alcance = authz.alcance_de(user, 'solicitudes.aprobar')
    if alcance not in {ALCANCE_DE_NIVEL[paso.nivel], ALCANCE_DE_NIVEL[nivel_efectivo(paso)]}:
        return False
    if any(p.decidido_por_id == user.pk for p in solicitud.pasos.all()):
        return False
    return authz.en_alcance_de_departamento(user, alcance, solicitud.proyecto.departamento_ID)


def aprobadores(paso, solicitud):
    """A quiénes avisar cuando un paso queda en turno."""
    from Users.models import Users
    candidatos = Users.objects.filter(is_active=True).select_related('role', 'departamento_ID__direccion')
    return [u for u in candidatos if (authz.es_administrador(u) or authz.alcance_de(u, 'solicitudes.aprobar'))
            and puede_decidir(u, paso, solicitud)]


def _avisar_turno(solicitud, paso, actor):
    t = solicitud.tipo.nombre.lower()
    notificar(
        aprobadores(paso, solicitud), actor, 'solicitud',
        f'Por aprobar: {t} en "{nombre(solicitud.proyecto.name)}"',
        f'Solicitud N.º {solicitud.numero}. Responder antes del {paso.vence:%d/%m/%Y}.',
        f'/solicitudes?abrir={solicitud.numero}',
    )


def _poner_en_turno(solicitud, paso, actor):
    paso.vence = timezone.localdate() + timedelta(days=solicitud.tipo.dias_respuesta)
    paso.save(update_fields=['vence'])
    _avisar_turno(solicitud, paso, actor)


@transaction.atomic
def crear(datos, solicitante):
    solicitud = Solicitud.objects.create(solicitante=solicitante, **datos)
    for i, nivel in enumerate(niveles_de(solicitud), start=1):
        PasoAprobacion.objects.create(solicitud=solicitud, orden=i, nivel=nivel)
    _poner_en_turno(solicitud, paso_en_turno(solicitud), solicitante)
    return solicitud


def _avisar_solicitante(solicitud, actor, titulo, mensaje):
    notificar([solicitud.solicitante], actor, 'solicitud', titulo, mensaje, f'/solicitudes?abrir={solicitud.numero}')


@transaction.atomic
def decidir(solicitud, user, aprobar, comentario):
    paso = paso_en_turno(solicitud)
    paso.estado = 'aprobado' if aprobar else 'rechazado'
    paso.decidido_por, paso.decidido_en, paso.comentario = user, timezone.now(), comentario
    paso.save(update_fields=['estado', 'decidido_por', 'decidido_en', 'comentario'])
    t = f'{solicitud.tipo.nombre} en "{nombre(solicitud.proyecto.name)}"'
    if not aprobar:
        solicitud.pasos.filter(estado='pendiente').update(estado='omitido')
        _cerrar(solicitud, 'rechazada')
        _avisar_solicitante(solicitud, user, f'Rechazada: {t}', comentario or 'Sin comentario.')
        return solicitud
    siguiente = paso_en_turno(solicitud)
    if siguiente is not None:
        solicitud.estado = 'en_revision'
        solicitud.save(update_fields=['estado'])
        _poner_en_turno(solicitud, siguiente, user)
        _avisar_solicitante(solicitud, user, f'Aprobado un paso: {t}', f'Sigue: {siguiente.get_nivel_display()}.')
        return solicitud
    _cerrar(solicitud, 'aprobada')
    aplicar(solicitud, user)
    _avisar_solicitante(solicitud, user, f'Aprobada: {t}', solicitud.resultado)
    return solicitud


def retirar(solicitud, user):
    solicitud.pasos.filter(estado='pendiente').update(estado='omitido')
    _cerrar(solicitud, 'retirada')


def _cerrar(solicitud, estado):
    solicitud.estado, solicitud.resuelta_en = estado, timezone.now()
    solicitud.save(update_fields=['estado', 'resuelta_en'])


def aplicar(solicitud, aprobador):
    """La orden de cambio: el cambio pedido se hace solo, y queda en el historial del proyecto."""
    from Projects.models import AjustePresupuesto, MiembroProyecto

    proyecto = solicitud.proyecto
    efecto = solicitud.tipo.efecto
    if authz.esta_cerrado(proyecto):
        solicitud.resultado = 'No se aplicó: el proyecto ya está cerrado.'
    elif efecto == PLAZO:
        objetivo = solicitud.tarea or proyecto
        anterior = objetivo.fecha_entrega
        objetivo.fecha_entrega = solicitud.nueva_fecha
        objetivo.save(update_fields=['fecha_entrega'])
        solicitud.aplicada = True
        solicitud.resultado = f'Entrega del {anterior:%d/%m/%Y} al {solicitud.nueva_fecha:%d/%m/%Y}.'
    elif efecto in (AUMENTO, REBAJO):
        AjustePresupuesto.objects.create(
            proyecto=None if solicitud.tarea else proyecto, tarea=solicitud.tarea, tipo=efecto,
            monto=solicitud.monto, motivo=f'Solicitud N.º {solicitud.numero}: {solicitud.justificacion}'[:2000],
            usuario=solicitud.solicitante or aprobador, aprobado_por=aprobador,
        )
        solicitud.aplicada = True
        solicitud.resultado = f'{"Aumento" if efecto == AUMENTO else "Rebajo"} de {solicitud.monto} registrado.'
    elif efecto == PERSONAL:
        ya = MiembroProyecto.objects.filter(authz.membresia_vigente(), proyecto=proyecto, usuario=solicitud.persona).exists()
        if ya:
            solicitud.resultado = 'No se aplicó: la persona ya estaba en el equipo.'
        else:
            MiembroProyecto.objects.create(
                proyecto=proyecto, usuario=solicitud.persona, rol=solicitud.rol_proyecto, hasta=solicitud.hasta,
                motivo=f'Solicitud N.º {solicitud.numero}', otorgado_por=aprobador,
            )
            solicitud.aplicada = True
            solicitud.resultado = f'{solicitud.persona.first_name} {solicitud.persona.last_name} se sumó al equipo como {solicitud.rol_proyecto.nombre}.'
    elif efecto == RESPONSABLE:
        proyecto.user_ID = solicitud.persona
        proyecto.save(update_fields=['user_ID'])
        solicitud.aplicada = True
        solicitud.resultado = f'Responsable nuevo: {solicitud.persona.first_name} {solicitud.persona.last_name}.'
    else:
        solicitud.resultado = 'Aprobada; no cambia datos del proyecto.'
    solicitud.save(update_fields=['aplicada', 'resultado'])
    HistorialCambios.objects.create(
        tipo='orden_cambio', proyecto_ID=proyecto, tarea_ID=str(solicitud.tarea_id or ''), usuario=aprobador,
        razon=solicitud.justificacion[:1000],
        datos_nuevos={'solicitud': solicitud.numero, 'tipo': solicitud.tipo.nombre, 'resultado': solicitud.resultado},
    )


def escalar_vencidas(hoy=None):
    """Paso vencido sin respuesta: lo puede decidir también el nivel siguiente, y se avisa de nuevo."""
    hoy = hoy or timezone.localdate()
    vencidos = PasoAprobacion.objects.filter(
        estado='pendiente', escalado=False, vence__lt=hoy, solicitud__estado__in=Solicitud.ABIERTAS,
    ).select_related('solicitud__tipo', 'solicitud__proyecto__departamento_ID__direccion', 'solicitud__solicitante')
    n = 0
    for paso in vencidos:
        if paso != paso_en_turno(paso.solicitud):
            continue
        paso.escalado = True
        paso.vence = hoy + timedelta(days=paso.solicitud.tipo.dias_respuesta)
        paso.save(update_fields=['escalado', 'vence'])
        _avisar_turno(paso.solicitud, paso, None)
        n += 1
    return n
