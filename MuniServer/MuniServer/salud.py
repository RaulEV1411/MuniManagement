"""GET /api/v1/health/: lo usan Docker y el monitoreo para saber si la API puede atender."""
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse


def salud(request):
    partes = {}
    try:
        connection.ensure_connection()
        partes['db'] = 'ok'
    except Exception:
        partes['db'] = 'error'
    try:
        cache.set('salud', '1', 5)
        partes['cache'] = 'ok' if cache.get('salud') == '1' else 'error'
    except Exception:
        partes['cache'] = 'error'
    sano = all(v == 'ok' for v in partes.values())
    return JsonResponse({'estado': 'ok' if sano else 'degradado', **partes}, status=200 if sano else 503)
