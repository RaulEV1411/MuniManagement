from rest_framework.routers import DefaultRouter
from .views import TareasViewSet, TaskImageViewSet

router_task = DefaultRouter()
router_task.register(r'tareas', TareasViewSet, basename='tareas')
router_task.register(r'task-images', TaskImageViewSet, basename='task-images')
