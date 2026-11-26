from django.urls import path

from .views import ConfiguracionView, logo

urlpatterns = [
    path('', ConfiguracionView.as_view(), name='configuracion'),
    path('logo/', logo, name='configuracion_logo'),
]
