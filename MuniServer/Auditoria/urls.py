from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActividadView, CatalogoView, CerrarSesionView, ExportacionesView, RegistrosViewSet, ResumenView, VerificarView,
)

router = DefaultRouter()
router.register(r'registros', RegistrosViewSet, basename='registros')

urlpatterns = [
    path('', include(router.urls)),
    path('verificar/', VerificarView.as_view(), name='auditoria_verificar'),
    path('catalogo/', CatalogoView.as_view(), name='auditoria_catalogo'),
    path('resumen/', ResumenView.as_view(), name='auditoria_resumen'),
    path('actividad/<uuid:user_id>/', ActividadView.as_view(), name='auditoria_actividad'),
    path('sesiones/<uuid:sesion_id>/cerrar/', CerrarSesionView.as_view(), name='auditoria_cerrar_sesion'),
    path('exportaciones/', ExportacionesView.as_view(), name='auditoria_exportaciones'),
]
