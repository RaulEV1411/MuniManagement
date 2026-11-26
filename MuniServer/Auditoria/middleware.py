from . import contexto
from .servicios import registrar_denegado


class AuditoriaMiddleware:
    """Deja la petición a mano para la auditoría y anota cada 403 de la API."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = contexto.iniciar(request)
        try:
            respuesta = self.get_response(request)
            if respuesta.status_code == 403 and request.path.startswith('/api/'):
                registrar_denegado(request, respuesta)
            return respuesta
        finally:
            contexto.terminar(token)
