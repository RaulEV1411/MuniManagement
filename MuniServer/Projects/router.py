from rest_framework.routers import DefaultRouter
from .views import (
    EstadoViewSet, PrioridadViewSet, TiposViewSet,
    ProyectosWriteViewSet, ProyectosReadViewSet,
    ProyectosTiposViewSet, ProjectImageViewSet,
    MiembroProyectoViewSet, RolProyectoViewSet, AjustePresupuestoViewSet, DocumentoProyectoViewSet,
    TareaPlantillaViewSet, FuenteFinanciamientoViewSet, HitoProyectoViewSet, RiesgoProyectoViewSet,
    CampoPersonalizadoViewSet,
)

router_projects = DefaultRouter()
router_projects.register(r'estados', EstadoViewSet, basename='estado')
router_projects.register(r'prioridades', PrioridadViewSet, basename='prioridad')
router_projects.register(r'tipos', TiposViewSet, basename='tipo')
router_projects.register(r'proyectosWrite', ProyectosWriteViewSet, basename='proyectosWrite')
router_projects.register(r'proyectosRead', ProyectosReadViewSet, basename='proyectosRead')
router_projects.register(r'proyectos-tipos', ProyectosTiposViewSet, basename='proyectos-tipos')
router_projects.register(r'project-images', ProjectImageViewSet, basename='project-images')
router_projects.register(r'miembros', MiembroProyectoViewSet, basename='miembros')
router_projects.register(r'roles-proyecto', RolProyectoViewSet, basename='roles-proyecto')
router_projects.register(r'ajustes-presupuesto', AjustePresupuestoViewSet, basename='ajustes-presupuesto')
router_projects.register(r'documentos', DocumentoProyectoViewSet, basename='documentos')
router_projects.register(r'plantillas', TareaPlantillaViewSet, basename='plantillas')
router_projects.register(r'fuentes', FuenteFinanciamientoViewSet, basename='fuentes')
router_projects.register(r'hitos', HitoProyectoViewSet, basename='hitos')
router_projects.register(r'riesgos', RiesgoProyectoViewSet, basename='riesgos')
router_projects.register(r'campos', CampoPersonalizadoViewSet, basename='campos')
