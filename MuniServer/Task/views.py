from rest_framework.viewsets import ModelViewSet
from .models import Tareas
from .serializers import TareasSerializer
from rest_framework.response import Response
from rest_framework import status

class TareasViewSet(ModelViewSet):
    queryset = Tareas.objects.all()
    serializer_class = TareasSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        proyecto_ID = self.request.query_params.get('proyecto_ID')  # Usando proyecto_ID del modelo

        if proyecto_ID:
            queryset = queryset.filter(proyecto_ID=proyecto_ID)

        return queryset