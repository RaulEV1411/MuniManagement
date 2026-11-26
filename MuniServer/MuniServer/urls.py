"""Rutas: la API vive bajo /api/v1/ para no chocar con las rutas del front en el mismo dominio.

El admin de Django no se publica: el modelo de usuario no tiene is_staff, así que su login
daba error 500 con cualquier credencial válida, y además no tiene límite de intentos.
Todo se gestiona desde la aplicación.
"""
from django.conf import settings
from django.conf.urls.static import static
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
    path('api/v1/', include(api_v1)),
]

# En desarrollo Django sirve las fotos; en producción las sirve Caddy desde el volumen.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
