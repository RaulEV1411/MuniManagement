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
    """Dueño y supervisores delegados activos."""
    from Projects.authz import delegacion_vigente
    personas = [proyecto.user_ID]
    personas += [d.supervisor for d in proyecto.delegaciones.filter(delegacion_vigente()).select_related('supervisor')]
    return personas


def nombre(texto):
    return texto[:MAX_NOMBRE]
