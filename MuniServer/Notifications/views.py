from datetime import date, timedelta
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from .models import Notificacion
from .serializers import NotificacionSerializer
from Projects.models import Proyectos
from Task.models import Tareas


class EsDestinatario(BasePermission):
    """La notificación solo puede leerse/modificarse por su dueño."""

    def has_object_permission(self, request, view, obj):
        return obj.usuario_id == getattr(request.user, 'user_ID', None)


class NotificacionViewSet(ModelViewSet):
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated, EsDestinatario]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']
    pagination_class = None  # usa default global, expuesto explícitamente

    def get_queryset(self):
        qs = Notificacion.objects.filter(usuario=self.request.user)
        solo_no_leidas = self.request.query_params.get('no_leidas')
        if solo_no_leidas in ('1', 'true', 'True'):
            qs = qs.filter(leida=False)
        return qs.order_by('-created_at')

    @action(detail=False, methods=['post'])
    def marcar_todas_leidas(self, request):
        Notificacion.objects.filter(usuario=request.user, leida=False).update(leida=True)
        return Response({'ok': True})

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        hoy = date.today()
        limite = hoy + timedelta(days=4)
        user = request.user
        proyectos = list(
            Proyectos.objects.filter(
                user_ID=user,
                fecha_entrega__gte=hoy,
                fecha_entrega__lte=limite,
            )
            .order_by('fecha_entrega')
            .values('proyect_ID', 'name', 'fecha_entrega')[:50]
        )
        tareas = list(
            Tareas.objects.filter(
                asignado_a=user,
                fecha_entrega__gte=hoy,
                fecha_entrega__lte=limite,
            )
            .order_by('fecha_entrega')
            .values('tareas_ID', 'name', 'fecha_entrega', 'proyecto_ID')[:50]
        )
        return Response({
            'hoy': hoy.isoformat(),
            'proyectos_por_vencer': proyectos,
            'tareas_por_vencer': tareas,
            'no_leidas': Notificacion.objects.filter(usuario=user, leida=False).count(),
        })
