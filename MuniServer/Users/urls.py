from django.urls import path, include
from .router import router_users
from .views import (
    LoginView, LogoutView, DefinirClaveView, OlvideClaveView, RenovarSesionView,
    change_password, upload_user_photo, completar_onboarding, me,
)

urlpatterns = [
    path('', include(router_users.urls)),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('definir-clave/', DefinirClaveView.as_view(), name='definir_clave'),
    path('olvide-clave/', OlvideClaveView.as_view(), name='olvide_clave'),
    path('token/refresh/', RenovarSesionView.as_view(), name='token_refresh'),
    path('change-password/', change_password, name='change_password'),
    path('upload-photo/<uuid:user_id>/', upload_user_photo, name='upload_user_photo'),
    path('completar-onboarding/', completar_onboarding, name='completar_onboarding'),
    path('me/', me, name='me'),
]
