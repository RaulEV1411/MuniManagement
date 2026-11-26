#!/bin/bash
# Levanta Django para las pruebas e2e: base nueva, catálogos, datos de ejemplo y runserver en :8000.
# Lo arranca Playwright (MuniClient-v2/playwright.config.ts). PYTHON elige el intérprete.
set -e
cd "$(dirname "$0")/.."
PY="${PYTHON:-python}"
export DJANGO_SETTINGS_MODULE=MuniServer.settings_e2e
rm -f "${E2E_DB:-/tmp/muni-e2e.sqlite3}"
rm -rf "${E2E_CORREOS:-/tmp/muni-e2e-correos}"
mkdir -p "${E2E_CORREOS:-/tmp/muni-e2e-correos}"
"$PY" manage.py migrate --noinput > /dev/null
"$PY" manage.py seed_system > /dev/null
"$PY" manage.py datos_e2e
exec "$PY" manage.py runserver localhost:8000 --noreload
