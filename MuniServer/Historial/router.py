from rest_framework.routers import DefaultRouter
from .views import HistorialCambiosViewSet

router_historial = DefaultRouter()
router_historial.register(r'cambios', HistorialCambiosViewSet, basename='historial')
