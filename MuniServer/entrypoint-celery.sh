#!/bin/bash
set -e

MODE="${1:-worker}"

echo "Waiting for MySQL..."
until python -c "
import os, MySQLdb
MySQLdb.connect(
    host=os.environ.get('DB_HOST', 'mysql'),
    user=os.environ.get('DB_USER', 'root'),
    passwd=os.environ.get('DB_PASSWORD', 'root'),
    db=os.environ.get('DB_NAME', 'MuniManagement'),
)
" 2>/dev/null; do
    echo "MySQL not ready, retrying in 2s..."
    sleep 2
done

echo "Waiting for Redis..."
until python -c "
import os, redis
r = redis.Redis.from_url(os.environ.get('REDIS_URL', 'redis://redis:6379/0'))
r.ping()
" 2>/dev/null; do
    echo "Redis not ready, retrying in 2s..."
    sleep 2
done

if [ "$MODE" = "beat" ]; then
    echo "Ensuring django_celery_beat migrations are applied..."
    python manage.py migrate django_celery_beat --noinput
    echo "Starting Celery beat..."
    exec celery -A MuniServer beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
else
    echo "Starting Celery worker..."
    exec celery -A MuniServer worker -l info --concurrency=2
fi
