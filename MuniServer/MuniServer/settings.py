from pathlib import Path
import os
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# Apagado por defecto: el modo de desarrollo se activa a propósito con DEBUG=True.
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# Secret key: en DEBUG permite fallback; en producción exige env.
_SECRET = os.environ.get('SECRET_KEY')
if not _SECRET:
    if DEBUG:
        _SECRET = 'fallback-dev-only-no-usar-en-produccion'
    else:
        raise ImproperlyConfigured('SECRET_KEY es obligatorio cuando DEBUG=False.')
SECRET_KEY = _SECRET

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

CORS_ALLOWED_ORIGINS_ENV = os.environ.get('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [o for o in CORS_ALLOWED_ORIGINS_ENV.split(',') if o]
if DEBUG:
    CORS_ALLOWED_ORIGINS += [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
    ]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'Departments.apps.DepartmentsConfig',
    'Users.apps.UsersConfig',
    'Projects.apps.ProjectsConfig',
    'Task.apps.TaskConfig',
    'Feedback.apps.FeedbackConfig',
    'Historial.apps.HistorialConfig',
    'Notifications.apps.NotificationsConfig',
    'Configuracion.apps.ConfiguracionConfig',
    'Auditoria.apps.AuditoriaConfig',
    'Solicitudes.apps.SolicitudesConfig',
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt.token_blacklist',
    'django_celery_beat',
    'anymail',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'Auditoria.middleware.AuditoriaMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'MuniServer.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'MuniServer.wsgi.application'

_DB_PASSWORD = os.environ.get('DB_PASSWORD')
if not _DB_PASSWORD:
    if DEBUG:
        _DB_PASSWORD = 'root'
    else:
        raise ImproperlyConfigured('DB_PASSWORD es obligatorio cuando DEBUG=False.')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'MuniManagement'),
        'USER': os.environ.get('DB_USER', 'root'),
        'PASSWORD': _DB_PASSWORD,
        'HOST': os.environ.get('DB_HOST', 'mysql'),
        'PORT': os.environ.get('DB_PORT', '3306'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Email: prioriza Resend → SendGrid → SMTP genérico ──
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '').strip()
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '').strip()

if RESEND_API_KEY:
    EMAIL_BACKEND = 'anymail.backends.resend.EmailBackend'
    ANYMAIL = {'RESEND_API_KEY': RESEND_API_KEY}
    EMAIL_HOST_USER = 'resend'
    DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'onboarding@resend.dev')
elif SENDGRID_API_KEY:
    EMAIL_BACKEND = 'anymail.backends.sendgrid.EmailBackend'
    ANYMAIL = {'SENDGRID_API_KEY': SENDGRID_API_KEY}
    EMAIL_HOST_USER = 'apikey'
    DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@muni.local')
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
    DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER or 'noreply@muni.local')

LANGUAGE_CODE = 'es-cr'
# Por instalación; el valor es el nombre IANA (America/Costa_Rica, America/Guatemala…).
TIME_ZONE = os.environ.get('ZONA_HORARIA', 'America/Costa_Rica')
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'Users.autenticacion.JWTCookieAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'MuniServer.paginacion.Paginacion',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/min',
        'user': '600/min',
        'public': '60/min',
    },
}

SIMPLE_JWT = {
    'USER_ID_FIELD': 'user_ID',
    'USER_ID_CLAIM': 'user_ID',
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
}

CSRF_TRUSTED_ORIGINS = [o for o in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',') if o]
if DEBUG:
    CSRF_TRUSTED_ORIGINS += ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174']
# El front manda las cookies de sesión en cada petición a la API.
CORS_ALLOW_CREDENTIALS = True

# URL pública del frontend, para los enlaces de los correos (activar cuenta, recuperar contraseña).
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')

# En producción: solo HTTPS, detrás de un proxy (nginx) que fija X-Forwarded-Proto.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'True') == 'True'
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '31536000'))
    # El chequeo de salud de Docker entra por HTTP dentro de la red interna.
    SECURE_REDIRECT_EXEMPT = [r'^api/v1/health/$']
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

AUTH_USER_MODEL = 'Users.Users'

# ── Celery + Redis ──────────────────────────────────────────
REDIS_URL = os.environ.get('REDIS_URL', 'redis://redis:6379/0')

# Caché compartida entre procesos: el límite de intentos de login vive aquí.
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('CACHE_URL', REDIS_URL),
    }
}
# Detrás de un proxy, la IP real del cliente llega en un header (p. ej. HTTP_X_REAL_IP de nginx).
RATELIMIT_IP_META_KEY = os.environ.get('RATELIMIT_IP_META_KEY', 'REMOTE_ADDR')
# Intentos de login: por correo, para frenar a quien prueba claves de una cuenta; por IP, más alto,
# porque toda una oficina municipal suele salir a internet con la misma IP.
LOGIN_LIMITE_POR_CORREO = os.environ.get('LOGIN_LIMITE_POR_CORREO', '5/m')
LOGIN_LIMITE_POR_IP = os.environ.get('LOGIN_LIMITE_POR_IP', '30/m')
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL)
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
CELERY_TASK_ALWAYS_EAGER = os.environ.get('CELERY_TASK_ALWAYS_EAGER', 'False') == 'True'

from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    'avisos-vencimiento-diarios': {
        'task': 'Task.tasks.enviar_alertas_diarias',
        'schedule': crontab(hour=8, minute=0),  # 8 AM Costa Rica
    },
    'auditoria-mantenimiento-diario': {
        'task': 'Auditoria.tasks.mantenimiento_diario',
        'schedule': crontab(hour=3, minute=0),
    },
}

# ── Fotos ───────────────────────────────────────────────────
# 'local' (por defecto): disco del servidor, servido por Caddy en MEDIA_URL y dentro de los respaldos.
# 'cloudinary': el servicio externo (requiere CLOUDINARY_* y un contrato de encargado de datos).
ALMACENAMIENTO_FOTOS = os.environ.get('ALMACENAMIENTO_FOTOS', 'local').strip().lower()
MEDIA_URL = '/api/v1/media/'
MEDIA_ROOT = os.environ.get('MEDIA_ROOT', os.path.join(BASE_DIR, 'media'))

import cloudinary
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', ''),
    api_key=os.environ.get('CLOUDINARY_API_KEY', ''),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET', ''),
    secure=True,
)


# ── Logs ────────────────────────────────────────────────────
# En producción, una línea JSON por evento en la salida estándar (docker logs).
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {'()': 'MuniServer.registro.FormatoJSON'},
        'simple': {'format': '{levelname} {name}: {message}', 'style': '{'},
    },
    'handlers': {
        'consola': {'class': 'logging.StreamHandler', 'formatter': 'simple' if DEBUG else 'json'},
    },
    'root': {'handlers': ['consola'], 'level': os.environ.get('LOG_LEVEL', 'INFO')},
}

# ── Sentry (opcional) ───────────────────────────────────────
SENTRY_DSN = os.environ.get('SENTRY_DSN', '').strip()
if SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.environ.get('SENTRY_ENVIRONMENT', 'produccion'),
        traces_sample_rate=float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0')),
        # Sin datos personales (Ley 8968): ni identidad ni IP, ni cookies, ni headers, ni cuerpos,
        # ni las variables locales de las trazas (pueden tener cédulas o correos).
        data_collection={
            'user_info': False,
            'cookies': {'mode': 'off'},
            'http_headers': {'request': {'mode': 'off'}},
            'http_bodies': [],
            'url_query_params': {'mode': 'denylist'},
            'stack_frame_variables': False,
        },
    )
