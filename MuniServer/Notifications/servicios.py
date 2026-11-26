"""Avisos en la campana cuando pasa algo en un proyecto. No avisa a quien hizo el cambio."""
from .models import Notificacion

MAX_NOMBRE = 80


def notificar(destinatarios, actor, tipo, titulo, mensaje, link):
    vistos = set()
    for usuario in destinatarios:
        if usuario is None or not usuario.is_active:
            continue
        if usuario.pk == getattr(actor, 'pk', None) or usuario.pk in vistos:
            continue
        vistos.add(usuario.pk)
        Notificacion.objects.create(
            usuario=usuario, tipo=tipo, titulo=titulo[:120], mensaje=mensaje, link=link,
        )


def interesados_del_proyecto(proyecto):
    """Dueño y miembros vigentes del equipo."""
    from Projects.authz import membresia_vigente
    personas = [proyecto.user_ID]
    personas += [m.usuario for m in proyecto.miembros.filter(membresia_vigente()).select_related('usuario')]
    return personas


def nombre(texto):
    return texto[:MAX_NOMBRE]
