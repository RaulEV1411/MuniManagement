"""Campos personalizados: cuáles aplican a un proyecto o una tarea y la validación de sus valores."""
import math
import re
from datetime import date

from django.db.models import Q
from rest_framework.exceptions import ValidationError

from .models import CampoPersonalizado as Campo

LARGO_TEXTO = 500


def aplicables(aplica_a, tipos_ids):
    """Los campos activos para ese destino: los de todos los tipos y los de alguno de estos tipos."""
    return list(
        Campo.objects.filter(aplica_a=aplica_a, activo=True)
        .filter(Q(tipos__isnull=True) | Q(tipos__in=list(tipos_ids))).distinct()
    )


def tipos_de(proyecto):
    return [] if proyecto is None else list(proyecto.proyectos_tipos_set.values_list('tipo_id', flat=True))


def en_uso(campo):
    from Task.models import Tareas
    from .models import Proyectos
    modelo = Proyectos if campo.aplica_a == Campo.PROYECTO else Tareas
    return modelo.objects.filter(campos_extra__has_key=str(campo.pk)).exists()


def _limpiar(campo, valor):
    nombre = f'«{campo.nombre}»'
    if campo.tipo_dato == Campo.TEXTO:
        if not isinstance(valor, (str, int, float)) or isinstance(valor, bool):
            raise ValidationError(f'{nombre}: escriba un texto.')
        texto = str(valor).strip()
        if len(texto) > LARGO_TEXTO:
            raise ValidationError(f'{nombre}: use hasta {LARGO_TEXTO} caracteres.')
        return texto or None
    if campo.tipo_dato == Campo.NUMERO:
        try:
            if isinstance(valor, bool) or (isinstance(valor, str) and '_' in valor):
                raise TypeError
            numero = float(valor)
        except (TypeError, ValueError, OverflowError):
            numero = math.nan
        if not math.isfinite(numero):
            raise ValidationError(f'{nombre}: tiene que ser un número.')
        return int(numero) if numero.is_integer() and abs(numero) < 2 ** 53 else numero
    if campo.tipo_dato == Campo.FECHA:
        try:
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(valor)):
                raise ValueError
            return date.fromisoformat(str(valor)).isoformat()
        except ValueError:
            raise ValidationError(f'{nombre}: indique una fecha válida.')
    if campo.tipo_dato == Campo.LISTA:
        if valor not in campo.opciones:
            raise ValidationError(f'{nombre}: elija una de las opciones.')
        return valor
    if not isinstance(valor, bool):
        raise ValidationError(f'{nombre}: indique sí o no.')
    return valor


def validar(aplica_a, entrada, tipos_ids, actuales, al_crear):
    """Combina lo enviado con lo que ya había: solo cambian las claves enviadas y None o vacío borra.

    Una clave de un campo que ya no aplica (inactivo, de otro tipo) se puede borrar, y si no, solo se acepta
    sin cambios. Un valor de lista que quitaron de las opciones se conserva. Los obligatorios se exigen al
    crear; al editar no se pueden vaciar, pero lo que ya estaba vacío (un registro anterior al campo, una
    tarea de plantilla) no impide guardar lo demás."""
    if not isinstance(entrada, dict):
        raise ValidationError({'campos_extra': 'Envíe los datos adicionales como un objeto.'})
    campos = {str(c.pk): c for c in aplicables(aplica_a, tipos_ids)}
    resultado = dict(actuales or {})
    errores = []
    for clave, valor in entrada.items():
        clave = str(clave)
        campo = campos.get(clave)
        if valor is None or valor == '':
            if campo is not None and campo.obligatorio:
                errores.append(f'«{campo.nombre}»: es obligatorio.')
            resultado.pop(clave, None)
            continue
        if campo is None:
            if valor != resultado.get(clave):
                errores.append('Hay un dato adicional que no corresponde: recargue la página.')
            continue
        if campo.tipo_dato == Campo.LISTA and valor == resultado.get(clave):
            continue
        try:
            limpio = _limpiar(campo, valor)
        except ValidationError as e:
            errores.append(str(e.detail[0]))
            continue
        if limpio is None:
            if campo.obligatorio:
                errores.append(f'«{campo.nombre}»: es obligatorio.')
            resultado.pop(clave, None)
        else:
            resultado[clave] = limpio
    if al_crear:
        for clave, campo in campos.items():
            if campo.obligatorio and clave not in resultado:
                errores.append(f'«{campo.nombre}»: es obligatorio.')
    if errores:
        raise ValidationError({'campos_extra': errores})
    return resultado
