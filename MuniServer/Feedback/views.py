from rest_framework.viewsets import ModelViewSet
from .models import Feedback
from .serializers import FeedbackSerializer

class FeedbackViewSet(ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer

