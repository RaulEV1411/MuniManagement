from rest_framework.viewsets import ModelViewSet
from .models import Tareas
from .serializers import TareasSerializer
# Importa TareasSerializer, que se utiliza para convertir instancias de Tareas a formatos JSON y viceversa.
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
# Importa permisos de Django Rest Framework para restringir el acceso a usuarios autenticados y a usuarios administradores.
from rest_framework_simplejwt.authentication import JWTAuthentication
# Importa JWTAuthentication, que permite la autenticación basada en tokens JWT (JSON Web Tokens).

class TareasViewSet(ModelViewSet):
    # Define la clase TareasViewSet que hereda de ModelViewSet para proporcionar operaciones CRUD al modelo Tareas.
    queryset = Tareas.objects.all()
    # Define la consulta base que obtiene todos los registros de Tareas.
    serializer_class = TareasSerializer
    # Especifica que el serializador a usar para este ViewSet es TareasSerializer.

    def get_queryset(self):
        # Sobrescribe el método get_queryset para personalizar la consulta de datos según parámetros.
        queryset = super().get_queryset()
        # Llama al método get_queryset de la clase padre para obtener la consulta base.
        proyecto_ID = self.request.query_params.get('proyecto_ID')  # Usando proyecto_ID del modelo
        # Obtiene el parámetro proyecto_ID de la solicitud si está presente en los parámetros de la URL.
        if proyecto_ID:
            queryset = queryset.filter(proyecto_ID=proyecto_ID)
            # Filtra el queryset para obtener solo las tareas que pertenecen al proyecto especificado.
        return queryset
        # Devuelve el conjunto de datos filtrado o completo, según el valor de proyecto_ID.
