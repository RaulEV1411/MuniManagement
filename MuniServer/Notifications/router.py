from rest_framework.routers import DefaultRouter
from .views import NotificacionViewSet


router_notifications = DefaultRouter()
router_notifications.register(r'notificaciones', NotificacionViewSet, basename='notificaciones')
