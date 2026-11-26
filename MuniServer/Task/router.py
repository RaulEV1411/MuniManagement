from rest_framework.routers import DefaultRouter
from .views import (
    AsignacionRecursoViewSet, ChecklistViewSet, ComentarioTareaViewSet, RecursoViewSet, TareasViewSet, TaskImageViewSet,
)

router_task = DefaultRouter()
router_task.register(r'tareas', TareasViewSet, basename='tareas')
router_task.register(r'task-images', TaskImageViewSet, basename='task-images')
router_task.register(r'checklist', ChecklistViewSet, basename='checklist')
router_task.register(r'comentarios', ComentarioTareaViewSet, basename='comentarios-tarea')
router_task.register(r'recursos', RecursoViewSet, basename='recursos')
router_task.register(r'asignaciones', AsignacionRecursoViewSet, basename='asignaciones-recursos')
