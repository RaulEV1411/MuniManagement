from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response


class ProtegidoAlBorrarMixin:
    """Si el registro tiene datos que dependen de él, responde 409 en lugar de un error 500."""

    mensaje_protegido = 'No se puede borrar porque hay registros que dependen de este.'

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response({'error': self.mensaje_protegido}, status=status.HTTP_409_CONFLICT)
