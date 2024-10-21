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
        project_id = self.request.query_params.get('proyecto_ID')

        if project_id:
            queryset = queryset.filter(project__id=project_id)

        return queryset