#!/bin/bash
set -e

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

echo "MySQL is ready."
if [ "${DEBUG:-True}" = "True" ]; then
    echo "DEBUG=True → generando migraciones pendientes..."
    python manage.py makemigrations --noinput
fi
python manage.py migrate --noinput
python manage.py seed_system
exec python manage.py runserver 0.0.0.0:8000
