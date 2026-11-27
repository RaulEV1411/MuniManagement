"""Identificación y teléfono como texto, validados según el tipo (Ley 8968: datos exactos y pertinentes).

- Cédula física: 9 dígitos, el primero de 1 a 9 (se acepta con guiones: 1-1234-5678).
- DIMEX: 11 o 12 dígitos.
- NITE: 10 dígitos.
- Pasaporte: de 5 a 20 letras y números.
"""
import re

from rest_framework.exceptions import ValidationError

TIPOS = [
    ('fisica', 'Cédula física'),
    ('dimex', 'DIMEX'),
    ('nite', 'NITE'),
    ('pasaporte', 'Pasaporte'),
]
_FORMATOS = {
    'fisica': (r'[1-9]\d{8}', 'La cédula física tiene 9 dígitos (por ejemplo 1-1234-5678).'),
    'dimex': (r'[1-9]\d{10,11}', 'El DIMEX tiene 11 o 12 dígitos.'),
    'nite': (r'\d{10}', 'El NITE tiene 10 dígitos.'),
    'pasaporte': (r'[A-Z0-9]{5,20}', 'El pasaporte tiene de 5 a 20 letras y números.'),
}


def normalizar_identificacion(tipo, numero):
    """Devuelve el número sin guiones ni espacios (y en mayúsculas), o un error que dice qué se espera."""
    if tipo not in _FORMATOS:
        raise ValidationError({'tipo_identificacion': 'Elija el tipo de identificación.'})
    limpio = re.sub(r'[\s.\-]', '', str(numero or '')).upper()
    patron, mensaje = _FORMATOS[tipo]
    if not re.fullmatch(patron, limpio):
        raise ValidationError({'cedula': mensaje})
    return limpio


def normalizar_telefono(numero):
    """Dígitos y un + inicial opcional: de 8 a 15 dígitos (8 en Costa Rica, más con código de país)."""
    texto = re.sub(r'[\s()\-]', '', str(numero or ''))
    if not re.fullmatch(r'\+?\d{8,15}', texto):
        raise ValidationError({'phone_number': 'Escriba el teléfono con 8 a 15 dígitos (puede empezar con +).'})
    return texto
