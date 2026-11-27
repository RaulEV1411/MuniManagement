"""Lo que usa `manage.py instalar`: leer los CSV de la institución y los catálogos base."""
import csv
import io
import unicodedata

# Para arrancar: la institución los cambia en Configuración. Nada de montos ni nombres de personas.
TIPOS_DE_PROYECTO = ['Infraestructura vial', 'Edificación', 'Espacio público', 'Agua y saneamiento',
                     'Gestión ambiental', 'Desarrollo social', 'Tecnología']
FUENTES_DE_FINANCIAMIENTO = ['Recursos propios', 'Ley 8114 (red vial cantonal)', 'Partidas específicas',
                             'Transferencias del Gobierno', 'Préstamo', 'Donación o convenio']
ESPECIALIDADES = ['Ingeniería civil', 'Arquitectura', 'Topografía', 'Proveeduría', 'Asesoría legal',
                  'Gestión ambiental', 'Trabajo social']


def normalizar(texto):
    """«Dirección » → «direccion»: los encabezados se comparan sin tildes, mayúsculas ni espacios."""
    sin_tildes = unicodedata.normalize('NFKD', texto or '').encode('ascii', 'ignore').decode()
    return sin_tildes.strip().lower().replace(' ', '_')


def leer_csv(ruta, obligatorias, opcionales=()):
    """UTF-8 (con BOM o sin) y separado por coma o por punto y coma, como lo guarda Excel en español.
    Devuelve [(línea, fila)] sin las filas vacías. Lanza ValueError si el archivo no está en UTF-8, si falta
    una columna obligatoria o si hay una que no se conoce (sus datos se perderían sin aviso)."""
    try:
        with open(ruta, encoding='utf-8-sig', newline='') as archivo:
            texto = archivo.read()
    except UnicodeDecodeError:
        raise ValueError(f'{ruta}: no está en UTF-8. En Excel, use «Guardar como» con el formato '
                         '«CSV UTF-8 (delimitado por comas)».')
    primera = texto.split('\n', 1)[0]
    lector = csv.DictReader(io.StringIO(texto), delimiter=';' if primera.count(';') > primera.count(',') else ',')
    lector.fieldnames = [normalizar(c) for c in (lector.fieldnames or [])]
    conocidas = [*obligatorias, *opcionales]
    faltan = [c for c in obligatorias if c not in lector.fieldnames]
    if faltan:
        raise ValueError(f'{ruta}: faltan las columnas {", ".join(faltan)}.')
    sobran = [c for c in lector.fieldnames if c and c not in conocidas]
    if sobran:
        raise ValueError(f'{ruta}: no se conocen las columnas {", ".join(sobran)}. Las columnas son: {", ".join(conocidas)}.')
    filas = []
    for fila in lector:
        limpia = {k: (v or '').strip() for k, v in fila.items() if k}
        if any(limpia.values()):
            # line_num es la última línea del registro: una celda entre comillas puede ocupar varias.
            saltos = sum(v.count('\n') for v in fila.values() if isinstance(v, str))
            filas.append((lector.line_num - saltos, limpia))
    return filas
