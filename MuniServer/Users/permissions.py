"""Permisos para módulo Users."""
from rest_framework.permissions import BasePermission, SAFE_METHODS


def _role_name(user):
    return getattr(getattr(user, 'role', None), 'name', '') or ''


def _role_flag(user, flag):
    role = getattr(user, 'role', None)
    return bool(role and getattr(role, flag, False))


ROLES_ADMIN = {'Administrador', 'Alcalde', 'Vicealcalde'}
ROLES_JEFES = {'Jefe de Dirección', 'Jefe de Departamento'}

CAMPOS_PROTEGIDOS_AUTO_EDIT = {'role', 'departamento_ID', 'cedula', 'email'}


class UsersPermission(BasePermission):
    """
    Reglas para UsersViewSet:
    - list/retrieve:
        * Admin/alcaldía/jefes → todos
        * Resto → solo self
    - create: solo admin/alcaldía
    - update / partial_update:
        * Admin/alcaldía → cualquier user, cualquier campo
        * Self → cualquier campo EXCEPTO role, departamento_ID, cedula, email
        * Resto → 403
    - destroy: solo admin/alcaldía; NUNCA permitir borrarse a sí mismo.
    """

    message = 'No tienes permisos para esta operación sobre usuarios.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        rol = _role_name(request.user)
        ver_todo = _role_flag(request.user, 'puede_ver_todo')

        if view.action in ('list',):
            # Cualquier authenticated puede listar pero filtramos en get_queryset.
            return True
        if view.action == 'create':
            return rol in ROLES_ADMIN or ver_todo
        # Para retrieve/update/destroy: validamos por objeto.
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        rol = _role_name(user)
        ver_todo = _role_flag(user, 'puede_ver_todo')
        es_admin = rol in ROLES_ADMIN or ver_todo
        es_jefe = rol in ROLES_JEFES
        es_self = obj.user_ID == user.user_ID

        if request.method in SAFE_METHODS:
            # retrieve: admin/jefes ven a todos; resto solo self
            return es_admin or es_jefe or es_self

        if view.action == 'destroy':
            if es_self:
                self.message = 'No puedes eliminar tu propia cuenta.'
                return False
            return es_admin

        # update / partial_update
        if es_admin:
            return True
        if es_self:
            # Self solo puede editar campos no críticos.
            campos = set(request.data.keys() if hasattr(request.data, 'keys') else [])
            invalidos = campos & CAMPOS_PROTEGIDOS_AUTO_EDIT
            if invalidos:
                self.message = (
                    f"No puedes modificar tus propios campos: {', '.join(sorted(invalidos))}. "
                    'Solicítalo a un Administrador.'
                )
                return False
            return True
        return False


class RolesPermission(BasePermission):
    """RolesViewSet: solo admin/alcaldía pueden CRUD. Lectura libre para authenticated."""

    message = 'Solo administradores pueden gestionar roles.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        rol = _role_name(request.user)
        ver_todo = _role_flag(request.user, 'puede_ver_todo')
        return rol in ROLES_ADMIN or ver_todo
