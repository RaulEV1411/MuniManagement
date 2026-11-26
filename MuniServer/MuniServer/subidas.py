"""Validación de imágenes subidas: tamaño máximo y tipo real según los primeros bytes."""
MAX_BYTES = 5 * 1024 * 1024
FORMATOS_CLOUDINARY = ['jpg', 'png', 'webp', 'heic', 'heif']


def _formato(cabecera):
    if cabecera.startswith(b'\xff\xd8\xff'):
        return 'jpg'
    if cabecera.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png'
    if cabecera[:4] == b'RIFF' and cabecera[8:12] == b'WEBP':
        return 'webp'
    if cabecera[4:8] == b'ftyp' and cabecera[8:12] in (b'heic', b'heix', b'mif1', b'msf1', b'heif'):
        return 'heic'
    return None


def error_de_imagen(archivo):
    """Devuelve el motivo del rechazo, o None si la imagen se puede subir."""
    if archivo.size > MAX_BYTES:
        return 'La imagen pesa más de 5 MB.'
    cabecera = archivo.read(16)
    archivo.seek(0)
    if _formato(cabecera) is None:
        return 'Solo se aceptan imágenes JPG, PNG, WebP o HEIC.'
    return None


def subir_imagen(archivo, carpeta):
    import cloudinary.uploader
    return cloudinary.uploader.upload(
        archivo, folder=carpeta, resource_type='image', allowed_formats=FORMATOS_CLOUDINARY,
    )
