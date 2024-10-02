from rest_framework.viewsets import ModelViewSet
from .models import Tareas
from .serializers import TareasSerializer

class TareasViewSet(ModelViewSet):
    queryset = Tareas.objects.all()
    serializer_class = TareasSerializer
