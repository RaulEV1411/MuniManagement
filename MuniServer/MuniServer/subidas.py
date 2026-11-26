"""Fotos subidas: validación (tamaño y tipo real por los primeros bytes) y dónde se guardan.

ALMACENAMIENTO_FOTOS elige el destino:
- 'local' (por defecto): el disco del servidor (MEDIA_ROOT), servido en MEDIA_URL. Las fotos se
  quedan en la instalación de la municipalidad y entran en los respaldos.
- 'cloudinary': el servicio externo, con las credenciales CLOUDINARY_*.
"""
import uuid

from django.conf import settings
from django.core.files.storage import default_storage

MAX_BYTES = 5 * 1024 * 1024
FORMATOS_CLOUDINARY = ['jpg', 'png', 'webp', 'heic', 'heif']
# En disco local solo lo que todos los navegadores muestran (HEIC no se ve en Chrome).
FORMATOS_LOCALES = {'jpg', 'png', 'webp'}


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


def _formato_de(archivo):
    cabecera = archivo.read(16)
    archivo.seek(0)
    return _formato(cabecera)


MAX_BYTES_DOCUMENTO = 10 * 1024 * 1024
FORMATOS_DOCUMENTO = {'pdf', 'jpg', 'png', 'webp'}


def _formato_documento(archivo):
    cabecera = archivo.read(16)
    archivo.seek(0)
    return 'pdf' if cabecera.startswith(b'%PDF-') else _formato(cabecera)


def error_de_documento(archivo):
    """Actas y documentos: PDF o imagen, hasta 10 MB (el tipo se mira en los primeros bytes)."""
    if archivo.size > MAX_BYTES_DOCUMENTO:
        return 'El documento pesa más de 10 MB.'
    if _formato_documento(archivo) not in FORMATOS_DOCUMENTO:
        return 'Solo se aceptan documentos PDF o imágenes JPG, PNG o WebP.'
    return None


def subir_documento(archivo, carpeta):
    """Como subir_imagen, pero admite PDF. Devuelve {'secure_url', 'public_id'}."""
    formato = _formato_documento(archivo)
    if _es_local():
        ruta = default_storage.save(f'{carpeta}/{uuid.uuid4().hex}.{formato}', archivo)
        return {'secure_url': f'{settings.MEDIA_URL}{ruta}', 'public_id': ruta}
    import cloudinary.uploader
    return cloudinary.uploader.upload(archivo, folder=carpeta, resource_type='raw' if formato == 'pdf' else 'image')


def _es_local():
    return getattr(settings, 'ALMACENAMIENTO_FOTOS', 'local') != 'cloudinary'


def error_de_imagen(archivo):
    """Devuelve el motivo del rechazo, o None si la imagen se puede subir."""
    if archivo.size > MAX_BYTES:
        return 'La imagen pesa más de 5 MB.'
    formato = _formato_de(archivo)
    if _es_local():
        if formato not in FORMATOS_LOCALES:
            return 'Solo se aceptan imágenes JPG, PNG o WebP.'
    elif formato is None:
        return 'Solo se aceptan imágenes JPG, PNG, WebP o HEIC.'
    return None


def subir_imagen(archivo, carpeta):
    """Guarda la imagen y devuelve {'secure_url', 'public_id'} (el id sirve para borrarla)."""
    if _es_local():
        ruta = default_storage.save(f'{carpeta}/{uuid.uuid4().hex}.{_formato_de(archivo)}', archivo)
        return {'secure_url': f'{settings.MEDIA_URL}{ruta}', 'public_id': ruta}
    import cloudinary.uploader
    return cloudinary.uploader.upload(
        archivo, folder=carpeta, resource_type='image', allowed_formats=FORMATOS_CLOUDINARY,
    )


def borrar_imagen(public_id):
    """Borra una imagen guardada con subir_imagen. Si ya no existe, no hace nada."""
    if not public_id:
        return
    if _es_local():
        if default_storage.exists(public_id):
            default_storage.delete(public_id)
    else:
        import cloudinary.uploader
        cloudinary.uploader.destroy(public_id)


def borrar_imagen_por_url(url):
    """Para la foto de usuario, que solo guarda la URL."""
    if not url:
        return
    if url.startswith(settings.MEDIA_URL):
        borrar_imagen(url[len(settings.MEDIA_URL):])
    elif 'res.cloudinary.com' in url and not _es_local():
        import cloudinary.uploader
        nombre = url.split('/')[-1].split('.')[0]
        cloudinary.uploader.destroy(f'munimanagement/usuarios/{nombre}')
