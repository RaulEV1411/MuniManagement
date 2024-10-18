from rest_framework.routers import DefaultRouter
from .views import EstadoViewSet, PrioridadViewSet, TiposViewSet, ProyectosWriteViewSet,ProyectosReadViewSet, ProyectosTiposViewSet

router_projects = DefaultRouter()

router_projects.register(r'estados', EstadoViewSet, basename='estado')
router_projects.register(r'prioridades', PrioridadViewSet, basename='prioridad')
router_projects.register(r'tipos', TiposViewSet, basename='tipo')
router_projects.register(r'proyectosWrite', ProyectosWriteViewSet, basename='proyectosWrite')
router_projects.register(r'proyectosRead', ProyectosReadViewSet, basename='proyectosRead')
router_projects.register(r'proyectos-tipos', ProyectosTiposViewSet, basename='proyectos-tipos')
