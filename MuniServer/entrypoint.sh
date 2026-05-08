#!/bin/bash
set -e

echo "Waiting for MySQL..."
until python -c "
import MySQLdb
MySQLdb.connect(host='mysql', user='root', passwd='root', db='MuniManagement')
" 2>/dev/null; do
    echo "MySQL not ready, retrying in 2s..."
    sleep 2
done

echo "MySQL is ready."
python manage.py makemigrations --noinput
python manage.py migrate --noinput
exec python manage.py runserver 0.0.0.0:8000
