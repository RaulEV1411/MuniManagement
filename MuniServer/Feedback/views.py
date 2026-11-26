from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from Projects import authz
from Notifications.servicios import interesados_del_proyecto, nombre, notificar
from .models import Feedback
from .serializers import FeedbackReadSerializer, FeedbackWriteSerializer


class FeedbackViewSet(ModelViewSet):
    queryset = Feedback.objects.select_related('user_ID').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return FeedbackWriteSerializer
        return FeedbackReadSerializer

    def get_queryset(self):
        queryset = super().get_queryset().filter(
            proyecto_ID__in=authz.proyectos_visibles(self.request.user).values('pk')
        )
        proyecto_ID = self.request.query_params.get('proyecto_ID')
        if proyecto_ID:
            queryset = queryset.filter(proyecto_ID=proyecto_ID)
        return queryset

    def perform_create(self, serializer):
        if not authz.puede_ver(self.request.user, serializer.validated_data['proyecto_ID']):
            raise PermissionDenied('No tiene acceso a este proyecto.')
        comentario = serializer.save(user_ID=self.request.user)
        proyecto = comentario.proyecto_ID
        notificar(
            interesados_del_proyecto(proyecto), self.request.user, 'comentario',
            f'Nuevo comentario en "{nombre(proyecto.name)}"',
            f'{self.request.user.first_name} {self.request.user.last_name}: {comentario.info[:200]}',
            f'/projects/{proyecto.proyect_ID}',
        )

    def perform_update(self, serializer):
        comentario = serializer.instance
        if comentario.user_ID_id != self.request.user.user_ID:
            raise PermissionDenied('Solo el autor puede editar su comentario.')
        if serializer.validated_data.get('proyecto_ID', comentario.proyecto_ID) != comentario.proyecto_ID:
            raise ValidationError({'proyecto_ID': 'Un comentario no se puede mover a otro proyecto.'})
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if instance.user_ID_id != user.user_ID and not authz.tiene_vision_global(user):
            raise PermissionDenied('Solo el autor o la alcaldía pueden borrar este comentario.')
        instance.delete()
