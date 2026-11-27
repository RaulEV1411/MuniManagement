"""Alta de personas desde la terminal (instalar y crear_admin), con la misma validación que la aplicación."""
from django.db import transaction
from rest_framework.exceptions import ValidationError

from Users.acceso import encolar_correo_de_acceso
from Users.models import Users


def validar_persona(datos):
    """Los datos como los manda la aplicación (rol y departamento por id). Devuelve los validados o lanza
    ValidationError con el detalle por campo."""
    from Users.serializers import UsersSerializer
    datos = {**datos, 'email': str(datos.get('email', '')).strip().lower()}
    serializer = UsersSerializer(data=datos)
    serializer.is_valid(raise_exception=True)
    return dict(serializer.validated_data)


def crear_persona(validados):
    """Sin contraseña usable: la define con el enlace del correo, que sale solo si la transacción se confirma
    (UsersSerializer.create lo manda en el acto, y una carga que se deshace no puede dejar correos enviados)."""
    especialidades = validados.pop('especialidades', None)
    user = Users(**validados)
    user.set_unusable_password()
    user.save()
    if especialidades:
        user.especialidades.set(especialidades)
    transaction.on_commit(lambda: encolar_correo_de_acceso(user, 'bienvenida'))
    return user


def errores_en_texto(error, nombres=None):
    """{'cedula': ['…']} → «cedula: …», con el nombre de campo que se le muestre a quien instala."""
    nombres = nombres or {}
    detalle = error.detail if isinstance(error, ValidationError) else error
    if isinstance(detalle, dict):
        return '; '.join(f'{nombres.get(campo, campo)}: {errores_en_texto(m, nombres)}' for campo, m in detalle.items())
    if isinstance(detalle, (list, tuple)):
        return ' '.join(errores_en_texto(m, nombres) for m in detalle)
    return str(detalle)
