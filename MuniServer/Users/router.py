from rest_framework.routers import DefaultRouter
from .views import RolesViewSet, UsersViewSet

router_users = DefaultRouter()
router_users.register(r'roles', RolesViewSet, basename='roles')
router_users.register(r'users', UsersViewSet, basename='users')
