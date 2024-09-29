from django.urls import path, include
from .router import router_users  # Asegúrate de estar importando correctamente el router

urlpatterns = [
    path('', include(router_users.urls)),
]
