#!/bin/bash
# Respaldo de la base: uno al arrancar y después cada 24 horas, en /respaldos (carpeta
# ./respaldos del servidor). Se conservan los últimos RESPALDO_DIAS días (14 por defecto).
set -uo pipefail
# Los respaldos tienen datos personales (Ley 8968): solo los puede leer el dueño.
umask 077
chmod 700 /respaldos 2>/dev/null || echo "Aviso: no se pudo restringir /respaldos a 700" >&2
DIAS="${RESPALDO_DIAS:-14}"
CONF=$(mktemp)
chmod 600 "$CONF"
printf '[client]\nhost=%s\nuser=%s\npassword=%s\n' "${DB_HOST:-mysql}" "$DB_USER" "$DB_PASSWORD" > "$CONF"

while true; do
    archivo="/respaldos/muni-$(date +%Y-%m-%d-%H%M).sql.gz"
    if mysqldump --defaults-extra-file="$CONF" --single-transaction --no-tablespaces --routines "$DB_NAME" | gzip > "$archivo.tmp"; then
        mv "$archivo.tmp" "$archivo"
        echo "Respaldo listo: $archivo"
    else
        rm -f "$archivo.tmp"
        echo "ERROR: falló el respaldo de $(date)" >&2
    fi
    find /respaldos -name 'muni-*.sql.gz' -mtime +"$DIAS" -delete
    sleep 86400
done
