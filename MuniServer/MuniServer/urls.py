"""Rutas: la API vive bajo /api/v1/ para no chocar con las rutas del front en el mismo dominio."""
from django.contrib import admin
from django.urls import include, path

from .salud import salud

api_v1 = [
    path('health/', salud, name='salud'),
    path('departments/', include('Departments.urls')),
    path('users/', include('Users.urls')),
    path('projects/', include('Projects.urls')),
    path('task/', include('Task.urls')),
    path('feedback/', include('Feedback.urls')),
    path('historial/', include('Historial.urls')),
    path('notifications/', include('Notifications.urls')),
    path('public/', include('Projects.public_urls')),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include(api_v1)),
]
