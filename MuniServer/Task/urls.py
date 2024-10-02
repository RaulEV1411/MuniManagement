from django.urls import path, include
from .router import router_task

urlpatterns = [
    path('', include(router_task.urls)),
]