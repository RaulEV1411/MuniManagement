from django.urls import path, include 
from .router import router_feedback

urlpatterns = [
    path('', include(router_feedback.urls)),
]
