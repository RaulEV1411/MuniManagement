from rest_framework.routers import DefaultRouter
from .views import AusenciaViewSet, EspecialidadViewSet, RolesViewSet, UsersViewSet

router_users = DefaultRouter()
router_users.register(r'roles', RolesViewSet, basename='roles')
router_users.register(r'users', UsersViewSet, basename='users')
router_users.register(r'especialidades', EspecialidadViewSet, basename='especialidades')
router_users.register(r'ausencias', AusenciaViewSet, basename='ausencias')
