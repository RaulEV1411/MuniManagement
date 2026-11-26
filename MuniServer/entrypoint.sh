#!/bin/bash
# Arranque de la API en desarrollo (docker-compose.dev.yaml).
set -e
python esperar_servicios.py
python manage.py migrate --noinput
python manage.py seed_system
exec python manage.py runserver 0.0.0.0:8000
