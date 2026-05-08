from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import Feedback
from .serializers import FeedbackReadSerializer, FeedbackWriteSerializer


class FeedbackViewSet(ModelViewSet):
    queryset = Feedback.objects.select_related('user_ID').all()
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return FeedbackWriteSerializer
        return FeedbackReadSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        proyecto_ID = self.request.query_params.get('proyecto_ID')
        if proyecto_ID:
            queryset = queryset.filter(proyecto_ID=proyecto_ID)
        return queryset
