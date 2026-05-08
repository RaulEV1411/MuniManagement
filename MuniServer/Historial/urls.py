from django.urls import path, include
from .router import router_historial

urlpatterns = [
    path('', include(router_historial.urls)),
]
