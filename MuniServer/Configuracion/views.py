from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from MuniServer.subidas import borrar_imagen_por_url, error_de_imagen, subir_imagen
from Projects import authz
from Users.autenticacion import JWTCookieAuthentication

from .models import Configuracion
from .serializers import ConfiguracionSerializer

SOLO_ADMIN = {'error': 'Solo un administrador puede cambiar los datos de la institución.'}


class ConfiguracionView(APIView):
    """GET es público: el login y el portal muestran el nombre, el logo y los colores sin sesión.
    No lee la cookie, para que una sesión vencida o inválida no devuelva 401 (el front lo tomaría
    como sesión caída y mandaría al login a quien está en el portal)."""

    def get_authenticators(self):
        return [] if self.request.method == 'GET' else [JWTCookieAuthentication()]

    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'GET' else [IsAuthenticated()]

    def get(self, request):
        return Response(ConfiguracionSerializer(Configuracion.actual()).data)

    def patch(self, request):
        if not authz.es_administrador(request.user):
            return Response(SOLO_ADMIN, status=403)
        serializer = ConfiguracionSerializer(Configuracion.actual(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def logo(request):
    if not authz.es_administrador(request.user):
        return Response(SOLO_ADMIN, status=403)
    actual = Configuracion.actual()
    if request.method == 'DELETE':
        borrar_imagen_por_url(actual.logo)
        actual.logo = ''
        actual.save()
        return Response(ConfiguracionSerializer(actual).data)
    archivo = request.FILES.get('image')
    if not archivo:
        return Response({'error': 'No se proporcionó ninguna imagen.'}, status=400)
    error = error_de_imagen(archivo)
    if error:
        return Response({'error': error}, status=400)
    anterior = actual.logo
    actual.logo = subir_imagen(archivo, 'munimanagement/institucion')['secure_url']
    actual.save()
    borrar_imagen_por_url(anterior)
    return Response(ConfiguracionSerializer(actual).data)
