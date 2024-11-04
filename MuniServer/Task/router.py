from rest_framework.routers import DefaultRouter
from .views import TareasViewSet

router_task = DefaultRouter()

router_task.register(r'tareas', TareasViewSet, basename='tareas')