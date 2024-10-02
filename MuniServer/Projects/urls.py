from django.urls import path, include
from .router import router_projects

urlpatterns = [
    path('', include(router_projects.urls)),
]