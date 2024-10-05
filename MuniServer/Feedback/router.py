from rest_framework.routers import DefaultRouter
from .views import FeedbackViewSet

router_feedback = DefaultRouter()

router_feedback.register(r'feedback', FeedbackViewSet, basename='feedback')  # Registro del feedback
