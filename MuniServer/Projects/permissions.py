from rest_framework.permissions import BasePermission, SAFE_METHODS

from . import authz


class CatalogoSoloAdministrador(BasePermission):
    """Estados, prioridades y tipos: todos leen, solo el Administrador los modifica."""

    message = 'Solo un administrador puede modificar los catálogos.'

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or authz.es_administrador(request.user)


class SystemRecordReadOnly(BasePermission):
    """Bloquea modify/delete cuando el objeto tiene is_system=True."""

    message = 'Este registro es definido por el sistema y no puede modificarse.'

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return not getattr(obj, 'is_system', False)
