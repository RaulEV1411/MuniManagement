"""Permisos para módulo Users: salen del catálogo (Projects/catalogo_permisos.py), no del nombre del rol."""
from rest_framework.permissions import BasePermission, SAFE_METHODS

from Projects import authz


CAMPOS_PROTEGIDOS_AUTO_EDIT = {'role', 'departamento_ID', 'tipo_identificacion', 'cedula', 'email', 'is_active'}


class UsersPermission(BasePermission):
    """
    Reglas para UsersViewSet:
    - list/retrieve: lo que permite la jerarquía (authz.usuarios_visibles, en get_queryset);
      los datos personales los filtra el serializer según usuarios.ver_datos;
    - create: quien tiene usuarios.gestionar (el departamento elegido se valida en la vista);
    - update / partial_update:
        * con usuarios.gestionar sobre esa persona → cualquier campo (el rol, además, pide roles.gestionar);
        * la propia persona → cualquier campo EXCEPTO role, departamento_ID, cedula, email e is_active;
        * resto → 403;
    - destroy (dar de baja): usuarios.gestionar sobre esa persona; NUNCA a sí mismo.
    """

    message = 'No tiene permisos para esta operación sobre usuarios.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if view.action == 'create':
            return authz.puede(request.user, 'usuarios.gestionar')
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        es_self = obj.user_ID == user.user_ID

        if request.method in SAFE_METHODS:
            return True

        if view.action == 'destroy':
            if es_self:
                self.message = 'No puede eliminar su propia cuenta.'
                return False
            return authz.puede_gestionar_a(user, obj)

        if authz.puede_gestionar_a(user, obj):
            return True
        if es_self:
            # La propia persona solo edita campos no críticos.
            datos = request.data if hasattr(request.data, 'keys') else {}
            actuales = {
                'role': obj.role_id, 'departamento_ID': obj.departamento_ID_id,
                'tipo_identificacion': obj.tipo_identificacion, 'cedula': obj.cedula, 'email': obj.email, 'is_active': obj.is_active,
            }
            invalidos = {
                campo for campo in CAMPOS_PROTEGIDOS_AUTO_EDIT & set(datos.keys())
                if str(datos[campo]).strip().lower() != str(actuales[campo]).strip().lower()
            }
            if invalidos:
                self.message = (
                    f"No puede modificar sus propios campos: {', '.join(sorted(invalidos))}. "
                    'Solicítelo a un Administrador.'
                )
                return False
            return True
        return False


class RolesPermission(BasePermission):
    """RolesViewSet: leen todos los que tienen sesión; crean y editan quienes tienen roles.gestionar."""

    message = 'No tiene permisos para gestionar roles.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return authz.puede(request.user, 'roles.gestionar')
