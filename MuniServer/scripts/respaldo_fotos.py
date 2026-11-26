"""Respaldo de las fotos guardadas en disco: un .tar.gz al arrancar y después cada 24 horas en
/respaldos, junto a los de la base. Se conservan los últimos RESPALDO_DIAS días (14 por defecto).
Lo corre el servicio `respaldo_fotos` de docker-compose.yaml."""
import os
import tarfile
import time
from datetime import datetime
from pathlib import Path

ORIGEN = Path(os.environ.get('MEDIOS', '/medios'))
DESTINO = Path(os.environ.get('RESPALDOS', '/respaldos'))
DIAS = int(os.environ.get('RESPALDO_DIAS', '14'))

# Tienen fotos de personas: solo las lee el dueño.
os.umask(0o077)


def respaldar():
    DESTINO.mkdir(parents=True, exist_ok=True)
    final = DESTINO / f"fotos-{datetime.now():%Y-%m-%d-%H%M}.tar.gz"
    temporal = final.with_suffix('.tmp')
    with tarfile.open(temporal, 'w:gz') as tar:
        tar.add(ORIGEN, arcname='media')
    temporal.rename(final)
    print(f'Respaldo de fotos listo: {final}', flush=True)
    limite = time.time() - DIAS * 86400
    for viejo in DESTINO.glob('fotos-*.tar.gz'):
        if viejo.stat().st_mtime < limite:
            viejo.unlink()


if __name__ == '__main__':
    while True:
        try:
            respaldar()
        except Exception as e:
            print(f'ERROR: falló el respaldo de fotos: {e}', flush=True)
        time.sleep(86400)
