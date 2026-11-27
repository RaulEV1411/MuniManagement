"""Errores de la API: lo que DRF no traduce solo."""
from django.core.exceptions import ValidationError as ValidacionDeDjango
from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler


def manejar(exc, contexto):
    # Un filtro con un id mal escrito (?proyecto=abc sobre un UUID) lo rechaza Django al armar la consulta:
    # es un dato inválido (400), no una falla del servidor (500).
    if isinstance(exc, ValidacionDeDjango):
        exc = ValidationError(exc.messages)
    return exception_handler(exc, contexto)
