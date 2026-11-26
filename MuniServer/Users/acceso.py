"""Enlaces para definir la contraseña: al crear la cuenta y para recuperarla."""
import logging

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

logger = logging.getLogger(__name__)


def enlace_de_acceso(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f'{settings.FRONTEND_URL}/definir-clave/{uid}/{token}'


def usuario_del_enlace(uid, token):
    """El usuario activo al que corresponde el enlace, o None si no es válido o venció."""
    from .models import Users
    try:
        user = Users.objects.get(pk=force_str(urlsafe_base64_decode(uid)), is_active=True)
    except Exception:
        return None
    return user if default_token_generator.check_token(user, token) else None


def encolar_correo_de_acceso(user, motivo):
    """motivo: 'bienvenida' (cuenta nueva) o 'recuperacion'. Si no hay broker, no rompe el flujo."""
    try:
        from Task.tasks import enviar_acceso_async
        enviar_acceso_async.delay(str(user.pk), motivo)
    except Exception:
        logger.exception('No se pudo encolar el correo de acceso')


def revocar_sesiones(user, motivo='clave'):
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
    from Auditoria import sesiones
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)
    sesiones.cerrar_todas(user, motivo)
