"""Para las pruebas de punta a punta (Playwright, MuniClient-v2/e2e): Django real con SQLite en un
archivo, correos guardados como archivos y un access corto para probar la renovación de sesión."""
import os
from datetime import timedelta

from .settings_test import *  # noqa: F401,F403
from .settings_test import CSRF_TRUSTED_ORIGINS, SIMPLE_JWT

E2E = True
DEBUG = True
DATABASES = {
    'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': os.environ.get('E2E_DB', '/tmp/muni-e2e.sqlite3')},
}
EMAIL_BACKEND = 'django.core.mail.backends.filebased.EmailBackend'
EMAIL_FILE_PATH = os.environ.get('E2E_CORREOS', '/tmp/muni-e2e-correos')
MEDIA_ROOT = os.environ.get('E2E_MEDIA', '/tmp/muni-e2e-media')
# El front de las pruebas (otro puerto si el de desarrollo está ocupado): enlaces de los correos y CSRF.
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
CSRF_TRUSTED_ORIGINS = [*CSRF_TRUSTED_ORIGINS, FRONTEND_URL]
# La suite entra muchas veces con las mismas cuentas; el límite real se prueba en Users/tests.py.
LOGIN_LIMITE_POR_CORREO = '1000/m'
LOGIN_LIMITE_POR_IP = '1000/m'
SIMPLE_JWT = {**SIMPLE_JWT, 'ACCESS_TOKEN_LIFETIME': timedelta(seconds=int(os.environ.get('E2E_ACCESS_SEGUNDOS', '10')))}
