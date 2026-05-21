"""Helpers de autorización a nivel de proyecto."""
from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import DelegacionSupervision


def _role_name(user):
    return getattr(getattr(user, 'role', None), 'name', '') or ''


def _role_flag(user, flag):
    role = getattr(user, 'role', None)
    return bool(role and getattr(role, flag, False))


def es_alcaldia(user):
    """Alcalde/Vicealcalde: visibilidad global (legacy alias)."""
    return tiene_vision_global(user)


def tiene_vision_global(user):
    """True si el rol tiene flag puede_ver_todo, o pertenece a la lista de alcaldía/admin."""
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if _role_flag(user, 'puede_ver_todo'):
        return True
    return _role_name(user) in {'Administrador', 'Alcalde', 'Vicealcalde'}


def es_supervisor_jerarquico(user, proyecto):
    """Jefe de departamento/dirección del proyecto."""
    depto = proyecto.departamento_ID
    if depto and depto.jefe_id == user.user_ID:
        return True
    if depto and depto.direccion and depto.direccion.jefe_id == user.user_ID:
        return True
    return False


def es_dueno(user, proyecto):
    return proyecto.user_ID_id == user.user_ID


def delegaciones_activas(proyecto, supervisor=None):
    qs = DelegacionSupervision.objects.filter(proyecto=proyecto, activa=True)
    if supervisor is not None:
        qs = qs.filter(supervisor=supervisor)
    return qs


def es_delegado(user, proyecto, requiere_edicion=False):
    qs = delegaciones_activas(proyecto, supervisor=user)
    if requiere_edicion:
        qs = qs.filter(puede_editar=True)
    return qs.exists()


def puede_ver(user, proyecto):
    if not user or not user.is_authenticated:
        return False
    if tiene_vision_global(user) or es_dueno(user, proyecto):
        return True
    if es_supervisor_jerarquico(user, proyecto):
        return True
    if es_delegado(user, proyecto, requiere_edicion=False):
        return True
    return False


def puede_editar(user, proyecto):
    if not user or not user.is_authenticated:
        return False
    if tiene_vision_global(user) or es_dueno(user, proyecto):
        return True
    if es_supervisor_jerarquico(user, proyecto):
        return True
    if es_delegado(user, proyecto, requiere_edicion=True):
        return True
    return False


def puede_delegar(user, proyecto):
    """Solo alcaldía, jefes (depto/dirección) o quien tiene rol con flag."""
    if not user or not user.is_authenticated:
        return False
    if tiene_vision_global(user):
        return True
    if es_supervisor_jerarquico(user, proyecto):
        return True
    if _role_flag(user, 'puede_delegar'):
        return True
    return False


class ProyectoVisible(BasePermission):
    """Permiso a nivel objeto: el usuario debe poder ver el proyecto subyacente."""

    message = 'No tienes acceso a este proyecto.'

    def has_object_permission(self, request, view, obj):
        proyecto = getattr(obj, 'proyecto', None) or getattr(obj, 'proyecto_ID', None) or obj
        if request.method in SAFE_METHODS:
            return puede_ver(request.user, proyecto)
        return puede_editar(request.user, proyecto)
