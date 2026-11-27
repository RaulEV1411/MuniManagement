from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from MuniServer.borrado import ProtegidoAlBorrarMixin
from Projects import authz

from . import servicios
from .models import PERSONAL, PasoAprobacion, ReglaAprobacion, Solicitud, TipoSolicitud
from .serializers import (
    CrearSolicitudSerializer, ReglaAprobacionSerializer, SolicitudSerializer, TipoSolicitudSerializer,
)


class LeerTodosEscribeCatalogos(BasePermission):
    message = 'Su rol no permite configurar las solicitudes.'

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or authz.puede(request.user, 'catalogos.gestionar')


class TipoSolicitudViewSet(ProtegidoAlBorrarMixin, ModelViewSet):
    queryset = TipoSolicitud.objects.prefetch_related('reglas')
    serializer_class = TipoSolicitudSerializer
    permission_classes = [IsAuthenticated, LeerTodosEscribeCatalogos]
    pagination_class = None

    def perform_destroy(self, instance):
        if instance.is_system:
            raise PermissionDenied('Los tipos del sistema no se borran: se pueden desactivar.')
        super().perform_destroy(instance)


class ReglaAprobacionViewSet(ModelViewSet):
    queryset = ReglaAprobacion.objects.all()
    serializer_class = ReglaAprobacionSerializer
    permission_classes = [IsAuthenticated, LeerTodosEscribeCatalogos]
    pagination_class = None


def _abiertas_por_aprobar(user, qs):
    """Las abiertas cuyo paso en turno puede decidir esta persona (la bandeja «Por aprobar»)."""
    abiertas = qs.filter(estado__in=Solicitud.ABIERTAS).prefetch_related('pasos')
    return [s.numero for s in abiertas if servicios.puede_decidir(user, servicios.paso_en_turno(s), s)]


class SolicitudViewSet(ModelViewSet):
    http_method_names = ['get', 'post', 'head', 'options']
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return CrearSolicitudSerializer if self.action == 'create' else SolicitudSerializer

    def _visibles(self):
        user = self.request.user
        return Solicitud.objects.filter(
            Q(proyecto__in=authz.proyectos_visibles(user).values('pk')) | Q(solicitante=user)
        ).select_related(
            'proyecto__departamento_ID__direccion', 'tarea', 'tipo', 'solicitante', 'persona', 'rol_proyecto',
        ).prefetch_related('pasos__decidido_por').distinct()

    def get_queryset(self):
        qs = self._visibles()
        if self.action != 'list':
            return qs
        p = self.request.query_params
        bandeja = p.get('bandeja', 'todas')
        if bandeja == 'por_aprobar':
            qs = qs.filter(numero__in=_abiertas_por_aprobar(self.request.user, qs))
        elif bandeja == 'mias':
            qs = qs.filter(solicitante=self.request.user)
        if p.get('proyecto'):
            qs = qs.filter(proyecto=p['proyecto'])
        if p.get('estado') == 'abiertas':
            qs = qs.filter(estado__in=Solicitud.ABIERTAS)
        elif p.get('estado'):
            qs = qs.filter(estado=p['estado'])
        return qs

    def create(self, request, *args, **kwargs):
        datos = CrearSolicitudSerializer(data=request.data)
        datos.is_valid(raise_exception=True)
        v = datos.validated_data
        user = request.user
        proyecto = v['proyecto']
        if not authz.proyectos_visibles(user).filter(pk=proyecto.pk).exists():
            raise PermissionDenied('No tiene acceso a este proyecto.')
        if authz.esta_cerrado(proyecto):
            raise ValidationError({'proyecto': 'El proyecto está cerrado: no admite solicitudes.'})
        if not authz.puede(user, 'solicitudes.crear', proyecto):
            raise PermissionDenied('Su rol no permite hacer solicitudes en este proyecto.')
        persona = v.get('persona')
        if persona is not None and not authz.usuarios_visibles(user).filter(pk=persona.pk).exists():
            raise ValidationError({'persona': 'Elija a una persona de su alcance.'})
        if v['tipo'].efecto == PERSONAL and not authz.puede(persona, 'equipo.integrar'):
            raise ValidationError({'persona': 'El rol de esa persona no le permite integrar equipos de otros.'})
        solicitud = servicios.crear(v, user)
        return Response(SolicitudSerializer(self._visibles().get(pk=solicitud.pk), context={'request': request}).data, status=201)

    @action(detail=True, methods=['post'])
    def decidir(self, request, pk=None):
        solicitud = get_object_or_404(self._visibles(), pk=pk)
        paso = servicios.paso_en_turno(solicitud)
        if not servicios.puede_decidir(request.user, paso, solicitud):
            raise PermissionDenied('No le toca decidir esta solicitud.')
        aprobar = request.data.get('aprobar') in (True, 'true', '1', 1)
        comentario = str(request.data.get('comentario', '')).strip()[:2000]
        if not aprobar and not comentario:
            raise ValidationError({'comentario': 'Para rechazar, explique el motivo.'})
        servicios.decidir(solicitud, request.user, aprobar, comentario)
        return Response(SolicitudSerializer(self._visibles().get(pk=pk), context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def retirar(self, request, pk=None):
        solicitud = get_object_or_404(self._visibles(), pk=pk)
        if solicitud.solicitante_id != request.user.pk or solicitud.estado not in Solicitud.ABIERTAS:
            raise PermissionDenied('Solo quien la pidió retira una solicitud abierta.')
        servicios.retirar(solicitud, request.user)
        return Response(SolicitudSerializer(self._visibles().get(pk=pk), context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def conteo(self, request):
        """Para el menú: cuántas esperan una decisión de esta persona."""
        return Response({'por_aprobar': len(_abiertas_por_aprobar(request.user, self._visibles()))})
