from django.urls import path, include
from .router import router_notifications


urlpatterns = [
    path('', include(router_notifications.urls)),
]
