from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .public_views import ProyectoPublicoViewSet


router_public = DefaultRouter()
router_public.register(r'projects', ProyectoPublicoViewSet, basename='public-projects')


urlpatterns = [
    path('', include(router_public.urls)),
]
