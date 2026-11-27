from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ReglaAprobacionViewSet, SolicitudViewSet, TipoSolicitudViewSet

router = DefaultRouter()
router.register(r'solicitudes', SolicitudViewSet, basename='solicitudes')
router.register(r'tipos', TipoSolicitudViewSet, basename='tipos-solicitud')
router.register(r'reglas', ReglaAprobacionViewSet, basename='reglas-aprobacion')

urlpatterns = [path('', include(router.urls))]
