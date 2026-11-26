#!/bin/bash
# Arranque de la API en producción: migra, siembra los catálogos fijos, junta los estáticos
# del admin en el volumen que sirve Caddy y deja corriendo gunicorn.
set -e
python esperar_servicios.py --redis
python manage.py migrate --noinput
python manage.py seed_system
python manage.py collectstatic --noinput
exec gunicorn MuniServer.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --timeout "${GUNICORN_TIMEOUT:-60}" \
    --access-logfile - \
    --forwarded-allow-ips "*"
