"""Escribir y verificar la auditoría. Nunca se guardan contraseñas, tokens ni enlaces de acceso."""
import hashlib
import ipaddress
import json
from datetime import timedelta, timezone as dt_timezone

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from . import contexto
from .models import CadenaAuditoria, RegistroAuditoria


def ip_de(request):
    """La misma IP que usa el límite de intentos (detrás de Caddy, la que él informa)."""
    if request is None:
        return ''
    valor = request.META.get(getattr(settings, 'RATELIMIT_IP_META_KEY', 'REMOTE_ADDR')) or request.META.get('REMOTE_ADDR') or ''
    valor = valor.split(',')[0].strip()
    try:
        ipaddress.ip_address(valor)
    except ValueError:
        return ''
    return valor


def agente_de(request):
    return (request.META.get('HTTP_USER_AGENT', '') if request is not None else '')[:255]


def describir_agente(agente):
    """«Chrome en Windows»: lo justo para reconocer el dispositivo."""
    a = agente or ''
    navegador = next((n for clave, n in (
        ('Edg/', 'Edge'), ('OPR/', 'Opera'), ('Firefox/', 'Firefox'), ('Chrome/', 'Chrome'),
        ('Safari/', 'Safari'),
    ) if clave in a), '')
    sistema = next((n for clave, n in (
        ('Android', 'Android'), ('iPhone', 'iPhone'), ('iPad', 'iPad'), ('Windows', 'Windows'),
        ('Mac OS X', 'macOS'), ('Linux', 'Linux'),
    ) if clave in a), '')
    if navegador and sistema:
        return f'{navegador} en {sistema}'
    return navegador or sistema or ('Otro cliente' if a else 'Desconocido')


def _cortar(valor, largo):
    return (valor or '')[:largo]


def _json_plano(valor):
    """Lo que se guarda tiene que ser igual a lo que se lee de la base, para que el hash coincida."""
    return json.loads(json.dumps(valor, default=str)) if valor is not None else None


def _contenido(reg):
    return {
        'creado_en': reg.creado_en.astimezone(dt_timezone.utc).isoformat(timespec='microseconds'),
        'usuario': str(reg.usuario_id or ''),
        'usuario_email': reg.usuario_email,
        'rol': reg.rol,
        'ip': reg.ip,
        'agente': reg.agente,
        'sesion': str(reg.sesion or ''),
        'modulo': reg.modulo,
        'accion': reg.accion,
        'objeto_tipo': reg.objeto_tipo,
        'objeto_id': reg.objeto_id,
        'objeto_repr': reg.objeto_repr,
        'cambios': reg.cambios,
        'resultado': reg.resultado,
        'motivo': reg.motivo,
    }


def calcular_hash(reg):
    texto = json.dumps([reg.hash_anterior, _contenido(reg)], sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    return hashlib.sha256(texto.encode('utf-8')).hexdigest()


def tipo_de(obj):
    return f'{obj._meta.app_label}.{obj.__class__.__name__}' if obj is not None else ''


def registrar(modulo, accion, *, objeto=None, objeto_tipo='', objeto_id='', objeto_repr='',
              cambios=None, resultado='exito', motivo='', usuario=None, usuario_email=None, sesion=None):
    """Agrega un registro encadenado. Por defecto, el actor y el origen son los de la petición en curso."""
    from .senales import representar

    req = contexto.request()
    actor = usuario if usuario is not None else contexto.actor()
    if objeto is not None:
        objeto_tipo = objeto_tipo or tipo_de(objeto)
        objeto_id = objeto_id or str(objeto.pk)
        objeto_repr = objeto_repr or representar(objeto)
    reg = RegistroAuditoria(
        creado_en=timezone.now(),
        usuario_id=actor.pk if actor is not None else None,
        usuario_email=_cortar(usuario_email if usuario_email is not None else getattr(actor, 'email', ''), 254),
        rol=_cortar(getattr(getattr(actor, 'role', None), 'name', '') if actor is not None else '', 60),
        ip=ip_de(req),
        agente=agente_de(req),
        sesion=sesion or contexto.sesion(),
        modulo=modulo,
        accion=accion,
        objeto_tipo=_cortar(objeto_tipo, 60),
        objeto_id=_cortar(str(objeto_id or ''), 64),
        objeto_repr=_cortar(objeto_repr, 200),
        cambios=_json_plano(cambios),
        resultado=resultado,
        motivo=_cortar(motivo, 255),
    )
    with transaction.atomic():
        cadena = CadenaAuditoria.objects.select_for_update().filter(pk=1).first()
        if cadena is None:
            cadena, _ = CadenaAuditoria.objects.get_or_create(pk=1)
        reg.hash_anterior = cadena.ultimo_hash
        reg.hash = calcular_hash(reg)
        reg.save()
        cadena.ultimo_hash = reg.hash
        cadena.save(update_fields=['ultimo_hash'])
    return reg


def verificar_cadena():
    """Recalcula cada hash y su enlace con el anterior. El primero que queda (los más viejos
    vencen por retención) se toma como punto de partida."""
    anterior = None
    revisados = 0
    for reg in RegistroAuditoria.objects.order_by('id').iterator(chunk_size=2000):
        if anterior is not None and reg.hash_anterior != anterior:
            return {'ok': False, 'revisados': revisados, 'registro': reg.id, 'fecha': reg.creado_en,
                    'motivo': 'Falta un registro anterior a este, o se cambió el orden.'}
        if calcular_hash(reg) != reg.hash:
            return {'ok': False, 'revisados': revisados, 'registro': reg.id, 'fecha': reg.creado_en,
                    'motivo': 'El contenido de este registro cambió después de guardarse.'}
        anterior = reg.hash
        revisados += 1
    cadena = CadenaAuditoria.objects.filter(pk=1).first()
    if cadena is not None and cadena.ultimo_hash and cadena.ultimo_hash != (anterior or ''):
        return {'ok': False, 'revisados': revisados, 'registro': None, 'fecha': None,
                'motivo': 'Se borraron los registros más recientes.'}
    return {'ok': True, 'revisados': revisados, 'registro': None, 'fecha': None, 'motivo': ''}


def depurar(ahora=None):
    """Borra lo que pasó la retención de Configuración (registros y sesiones cerradas) y lo anota."""
    from Configuracion.models import Configuracion
    from .models import SesionUsuario

    ahora = ahora or timezone.now()
    dias = Configuracion.actual().retencion_auditoria_dias
    corte = ahora - timedelta(days=dias)
    # QuerySet.delete() no pasa por RegistroAuditoria.delete(): es el único camino de borrado.
    borrados, _ = RegistroAuditoria.objects.filter(creado_en__lt=corte).delete()
    SesionUsuario.objects.filter(cerrada_en__lt=corte).delete()
    if borrados:
        registrar('auditoria', 'depurar', motivo=f'{borrados} registros anteriores al {corte.date().isoformat()} (retención de {dias} días).')
    return borrados


def registrar_denegado(request, respuesta):
    """Cualquier 403 de la API: quién intentó qué y por qué se rechazó."""
    accion = {'GET': 'ver', 'HEAD': 'ver', 'POST': 'crear', 'PUT': 'editar', 'PATCH': 'editar', 'DELETE': 'eliminar'}.get(request.method, 'ver')
    datos = getattr(respuesta, 'data', None)
    motivo = ''
    if isinstance(datos, dict):
        motivo = str(datos.get('detail') or datos.get('error') or '')
    registrar(modulo_de_ruta(request.path), accion, resultado='denegado', motivo=motivo,
              objeto_repr=f'{request.method} {request.path}')


_POR_RUTA = {
    'departments': 'estructura', 'users': 'usuarios', 'projects': 'proyectos', 'task': 'tareas',
    'feedback': 'comentarios', 'historial': 'proyectos', 'configuracion': 'configuracion',
    'auditoria': 'auditoria', 'solicitudes': 'solicitudes',
}
_POR_SUBRUTA = {
    'roles': 'roles', 'miembros': 'equipo', 'roles-proyecto': 'roles', 'ajustes-presupuesto': 'presupuesto',
    'estados': 'catalogos', 'prioridades': 'catalogos', 'tipos': 'catalogos',
    'project-images': 'fotos', 'task-images': 'fotos', 'upload-photo': 'usuarios',
}


def modulo_de_ruta(ruta):
    partes = [p for p in ruta.split('/') if p]
    if len(partes) >= 3 and partes[0] == 'api':
        if len(partes) >= 4 and partes[3] in _POR_SUBRUTA:
            return _POR_SUBRUTA[partes[3]]
        return _POR_RUTA.get(partes[2], 'otros')
    return 'otros'
