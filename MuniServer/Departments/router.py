from rest_framework.routers import DefaultRouter
from .views import DireccionViewSet, DepartamentosViewSet

router_departments = DefaultRouter()
router_departments.register(r'direcciones', DireccionViewSet, basename='direcciones')
router_departments.register(r'departamentos', DepartamentosViewSet, basename='departamentos')