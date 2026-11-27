from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .public_views import DatosAbiertosView, ProyectoPublicoViewSet, vista_previa


router_public = DefaultRouter()
router_public.register(r'projects', ProyectoPublicoViewSet, basename='public-projects')


urlpatterns = [
    path('', include(router_public.urls)),
    path('datos/proyectos.<str:formato>', DatosAbiertosView.as_view(), name='datos-abiertos'),
    # Solo para los robots de vista previa al compartir (ver el Caddyfile).
    path('vista-previa/publico', vista_previa, name='vista-previa-portal'),
    path('vista-previa/publico/', vista_previa),
    path('vista-previa/publico/proyectos/<uuid:pk>', vista_previa, name='vista-previa-proyecto'),
    path('vista-previa/publico/proyectos/<uuid:pk>/', vista_previa),
]
