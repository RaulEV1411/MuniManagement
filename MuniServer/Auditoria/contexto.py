"""Quién y desde dónde, para la petición en curso (lo fija AuditoriaMiddleware)."""
from contextvars import ContextVar

_actual = ContextVar('auditoria_contexto', default=None)


def iniciar(request):
    return _actual.set({'request': request, 'usuario': None})


def terminar(token):
    _actual.reset(token)


def fijar_usuario(usuario):
    """Para las vistas sin autenticación (login, definir clave): el actor es la persona de la cuenta."""
    ctx = _actual.get()
    if ctx is not None:
        ctx['usuario'] = usuario


def request():
    ctx = _actual.get()
    return ctx['request'] if ctx else None


def actor():
    ctx = _actual.get()
    if not ctx:
        return None
    if ctx['usuario'] is not None:
        return ctx['usuario']
    # DRF copia el usuario y el token autenticados al HttpRequest de Django.
    usuario = getattr(ctx['request'], 'user', None)
    return usuario if getattr(usuario, 'is_authenticated', False) else None


def sesion():
    ctx = _actual.get()
    token = getattr(ctx['request'], 'auth', None) if ctx else None
    try:
        return token.get('sid') if token is not None else None
    except AttributeError:
        return None
