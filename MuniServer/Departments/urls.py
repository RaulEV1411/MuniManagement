from django.urls import path, include
from .router import router_departments

urlpatterns = [
    path('', include(router_departments.urls))
]
