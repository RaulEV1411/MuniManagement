#!/bin/bash
# Worker o beat de Celery en desarrollo: entrypoint-celery.sh worker|beat
set -e
MODE="${1:-worker}"
python esperar_servicios.py --redis
if [ "$MODE" = "beat" ]; then
    exec celery -A MuniServer beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
else
    exec celery -A MuniServer worker -l info --concurrency=2
fi
