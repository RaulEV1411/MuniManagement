from django.urls import path, include
from .router import router_users  # Asegúrate de estar importando correctamente el router
from .views import LoginView

urlpatterns = [
    path('', include(router_users.urls)),
    path('login/', LoginView.as_view(), name='login'),
]
