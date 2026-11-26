"""Espera a que MySQL (y, con --redis, Valkey/Redis) acepten conexiones antes de arrancar."""
import os
import sys
import time


def esperar(nombre, intento, maximo=90):
    for _ in range(maximo):
        try:
            intento()
            print(f'{nombre} listo.', flush=True)
            return
        except Exception:
            print(f'Esperando a {nombre}…', flush=True)
            time.sleep(2)
    sys.exit(f'{nombre} no respondió a tiempo.')


def mysql():
    import pymysql
    pymysql.connect(
        host=os.environ.get('DB_HOST', 'mysql'),
        port=int(os.environ.get('DB_PORT', '3306')),
        user=os.environ.get('DB_USER', 'root'),
        password=os.environ.get('DB_PASSWORD', ''),
        database=os.environ.get('DB_NAME', 'MuniManagement'),
    ).close()


def redis():
    import redis as cliente
    cliente.Redis.from_url(os.environ.get('REDIS_URL', 'redis://redis:6379/0')).ping()


if __name__ == '__main__':
    esperar('MySQL', mysql)
    if '--redis' in sys.argv:
        esperar('Redis', redis)
