from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from .router import router_users
from .views import LoginView, change_password, upload_user_photo

urlpatterns = [
    path('', include(router_users.urls)),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('change-password/', change_password, name='change_password'),
    path('upload-photo/<uuid:user_id>/', upload_user_photo, name='upload_user_photo'),
]
