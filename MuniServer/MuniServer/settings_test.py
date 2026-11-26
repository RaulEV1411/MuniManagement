"""Configuración para correr las pruebas en local, sin MySQL ni Redis.

Uso: DJANGO_SETTINGS_MODULE=MuniServer.settings_test python manage.py test
"""
import os

os.environ.setdefault("SECRET_KEY", "solo-para-pruebas-no-usar-en-produccion")
os.environ.setdefault("DB_PASSWORD", "no-se-usa-en-pruebas")

from .settings import *  # noqa: E402,F401,F403

DEBUG = False
SECURE_SSL_REDIRECT = False
FRONTEND_URL = "https://muni.test"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
EMAIL_HOST_USER = "pruebas"

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
