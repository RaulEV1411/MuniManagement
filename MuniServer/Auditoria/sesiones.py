"""Sesiones: inicio, actividad, cierre y cierre a distancia.

El refresh y el access llevan el id de la sesión (claim `sid`). En cada petición se revisa que la
sesión siga abierta, así que cerrarla a distancia corta el acceso en la petición siguiente.
"""
from datetime import timedelta

from django.conf import settings
from django.db.models import F
from django.utils import timezone

from .models import SesionUsuario
from .servicios import agente_de, ip_de

# La última actividad se escribe como mucho una vez por minuto; un hueco de más de 15 minutos
# entre peticiones no cuenta como tiempo conectado.
INTERVALO = timedelta(minutes=1)
INACTIVIDAD = timedelta(minutes=15)


def duracion_maxima():
    return settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']


def abrir(usuario, request):
    return SesionUsuario.objects.create(usuario=usuario, ip=ip_de(request), agente=agente_de(request))


def seguir_activa(sid):
    """¿La sesión sigue abierta? De paso anota la actividad (como mucho una vez por minuto)."""
    fila = SesionUsuario.objects.filter(pk=sid).values('cerrada_en', 'ultima_actividad').first()
    if fila is None or fila['cerrada_en'] is not None:
        return False
    ahora = timezone.now()
    hueco = ahora - fila['ultima_actividad']
    if hueco >= INTERVALO:
        suma = int(hueco.total_seconds()) if hueco <= INACTIVIDAD else 0
        # Condicionado a la última actividad leída: dos peticiones a la vez no suman dos veces.
        SesionUsuario.objects.filter(pk=sid, ultima_actividad=fila['ultima_actividad']).update(
            ultima_actividad=ahora, segundos_activos=F('segundos_activos') + suma,
        )
    return True


def esta_abierta(sid):
    return SesionUsuario.objects.filter(pk=sid, cerrada_en__isnull=True).exists()


def cerrar(sid, motivo, por=None):
    return SesionUsuario.objects.filter(pk=sid, cerrada_en__isnull=True).update(
        cerrada_en=timezone.now(), motivo_cierre=motivo, cerrada_por=por,
    )


def cerrar_todas(usuario, motivo, por=None):
    return SesionUsuario.objects.filter(usuario=usuario, cerrada_en__isnull=True).update(
        cerrada_en=timezone.now(), motivo_cierre=motivo, cerrada_por=por,
    )


def vencer(ahora=None):
    """Las abiertas sin actividad en lo que dura un refresh ya no pueden renovarse: se cierran."""
    ahora = ahora or timezone.now()
    return SesionUsuario.objects.filter(
        cerrada_en__isnull=True, ultima_actividad__lt=ahora - duracion_maxima(),
    ).update(cerrada_en=F('ultima_actividad'), motivo_cierre='vencida')
