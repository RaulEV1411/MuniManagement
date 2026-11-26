"""Sesión con JWT en cookies HttpOnly: JavaScript no puede leer los tokens.

- El access va en una cookie para toda la API; el refresh, en otra limitada a /api/v1/users/.
- Como el navegador manda las cookies solo, las peticiones que modifican datos exigen el
  token CSRF de Django en el header X-CSRFToken. El front lo recibe en el login y en /users/me/.
- Se sigue aceptando "Authorization: Bearer" para scripts y pruebas.
"""
from django.conf import settings
from Projects import authz
from django.middleware.csrf import get_token
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication

ACCESS = 'muni_access'
REFRESH = 'muni_refresh'
RUTA_REFRESH = '/api/v1/users/'


class JWTCookieAuthentication(JWTAuthentication):
    def authenticate(self, request):
        if self.get_header(request) is not None:
            return super().authenticate(request)
        crudo = request.COOKIES.get(ACCESS)
        if not crudo:
            return None
        token = self.get_validated_token(crudo)
        user = self.get_user(token)
        self._exigir_csrf(request)
        return user, token

    @staticmethod
    def _exigir_csrf(request):
        check = CSRFCheck(lambda req: None)
        check.process_request(request)
        motivo = check.process_view(request, None, (), {})
        if motivo:
            raise exceptions.PermissionDenied(f'Falta el token CSRF o no es válido ({motivo}).')


def fijar_cookie(response, nombre, valor, max_age, path):
    response.set_cookie(
        nombre, valor, max_age=max_age, path=path, httponly=True,
        secure=not settings.DEBUG, samesite='Lax',
    )


def fijar_cookies_de_sesion(response, refresh):
    jwt = settings.SIMPLE_JWT
    fijar_cookie(response, ACCESS, str(refresh.access_token), int(jwt['ACCESS_TOKEN_LIFETIME'].total_seconds()), '/')
    fijar_cookie(response, REFRESH, str(refresh), int(jwt['REFRESH_TOKEN_LIFETIME'].total_seconds()), RUTA_REFRESH)


def borrar_cookies_de_sesion(response):
    response.delete_cookie(ACCESS, path='/', samesite='Lax')
    response.delete_cookie(REFRESH, path=RUTA_REFRESH, samesite='Lax')


def datos_de_sesion(request, user):
    """Lo que el front necesita de la persona con sesión, más el token CSRF."""
    role = user.role if user.role_id else None
    return {
        'user_ID': str(user.user_ID),
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'role': role.name if role else '',
        # {permiso: alcance}: el front muestra solo lo que el servidor va a permitir.
        'permisos': authz.permisos_del_rol(user),
        'user_photo': user.user_photo or '',
        'departamento_ID': str(user.departamento_ID_id) if user.departamento_ID_id else '',
        'onboarding_completado': bool(user.onboarding_completado),
        'csrf_token': get_token(request._request if hasattr(request, '_request') else request),
    }
