"""Autorización: una sola regla, `puede(usuario, permiso, proyecto)`.

Un permiso llega por dos caminos:
- el rol de la institución (`Roles.permisos`: `{permiso: alcance}`), con alcance propio, departamento,
  dirección o todos, medido contra el departamento del proyecto;
- el rol dentro del proyecto: la membresía vigente (`MiembroProyecto`, con desde y hasta), y además,
  de forma implícita, el dueño cuenta como Responsable y quien tiene tareas asignadas como Colaborador.
El Administrador siempre tiene todo (no se puede editar, para que nadie quede afuera).

Suplencia: mientras el jefe de un departamento o de una dirección tiene una ausencia vigente, su suplente
toma esa jefatura: los permisos de proyecto que el rol del jefe da con alcance de jefatura, recortados a
la zona (el departamento o los departamentos de la dirección). Nunca los permisos generales (usuarios,
estructura, catálogos, roles, configuración, auditoría) ni el nivel de alcaldía (ver `suplencias`).
"""
from django.db.models import Q
from django.utils import timezone
from rest_framework.permissions import BasePermission, SAFE_METHODS

from . import catalogo_permisos as cat


def _autenticado(user):
    return bool(user and getattr(user, 'is_authenticated', False))


def _role_name(user):
    return getattr(getattr(user, 'role', None), 'name', '') or ''


def es_administrador(user):
    return _autenticado(user) and _role_name(user) == 'Administrador'


def permisos_del_rol(user):
    """{permiso: alcance} del rol de la institución (el Administrador, todo en «todos»)."""
    if not _autenticado(user):
        return {}
    if es_administrador(user):
        return {c: cat.TODOS for c in cat.PERMISOS}
    return dict(getattr(getattr(user, 'role', None), 'permisos', None) or {})


def alcance_de(user, codigo):
    return permisos_del_rol(user).get(codigo)


def tiene_vision_global(user):
    """Ve todos los proyectos (antes: la bandera puede_ver_todo)."""
    return alcance_de(user, 'proyectos.ver') == cat.TODOS


# ── Alcance respecto de un departamento ──────────────────────────────────────

def _direccion_propia(user):
    depto = getattr(user, 'departamento_ID', None)
    return getattr(depto, 'direccion_id', None)


def en_alcance_de_departamento(user, alcance, departamento):
    """¿El departamento cae dentro del alcance? (no considera «propio», que depende del objeto)."""
    if alcance == cat.TODOS:
        return True
    if departamento is None or alcance not in (cat.DEPARTAMENTO, cat.DIRECCION):
        return False
    if departamento.pk == user.departamento_ID_id or departamento.jefe_id == user.pk:
        return True
    if alcance == cat.DIRECCION:
        direccion = departamento.direccion
        if direccion and (direccion.pk == _direccion_propia(user) or direccion.jefe_id == user.pk):
            return True
    return False


def _q_departamentos_en_alcance(user, alcance, campo='departamento_ID'):
    """Filtro de queryset equivalente a en_alcance_de_departamento (None = sin restricción)."""
    if alcance == cat.TODOS:
        return None
    if alcance not in (cat.DEPARTAMENTO, cat.DIRECCION):
        return Q(pk__in=[])
    q = Q(**{campo: user.departamento_ID_id}) | Q(**{f'{campo}__jefe': user})
    if alcance == cat.DIRECCION:
        q |= Q(**{f'{campo}__direccion__jefe': user})
        if _direccion_propia(user):
            q |= Q(**{f'{campo}__direccion': _direccion_propia(user)})
    return q


# ── Suplencias ───────────────────────────────────────────────────────────────

def _jefaturas_suplidas_qs(hoy):
    from Departments.models import Departamentos, Direccion
    from Users.models import Ausencia
    ausentes = Ausencia.objects.filter(desde__lte=hoy, hasta__gte=hoy).values('usuario')
    deptos = Departamentos.objects.filter(suplente__isnull=False, jefe__in=ausentes, jefe__is_active=True)
    dirs = Direccion.objects.filter(suplente__isnull=False, jefe__in=ausentes, jefe__is_active=True)
    return deptos, dirs


def suplencias(user):
    """Jefaturas que la persona cubre hoy: es la suplente y el jefe está ausente.

    Devuelve [(jefe, {ids de los departamentos de la zona}, nivel)], con nivel DEPARTAMENTO o DIRECCION.
    No hay cadenas: el suplente de un suplente no hereda nada. Se guarda en el objeto del usuario, que
    dura lo que la petición."""
    if not _autenticado(user):
        return []
    hoy = timezone.localdate()
    guardado = getattr(user, '_suplencias', None)
    if guardado and guardado[0] == hoy:
        return guardado[1]
    from Departments.models import Departamentos
    deptos, dirs = _jefaturas_suplidas_qs(hoy)
    zonas = {}
    for d in deptos.filter(suplente=user).exclude(jefe=user).select_related('jefe__role', 'jefe__departamento_ID'):
        zonas.setdefault((d.jefe_id, cat.DEPARTAMENTO), (d.jefe, set()))[1].add(d.pk)
    for dr in dirs.filter(suplente=user).exclude(jefe=user).select_related('jefe__role', 'jefe__departamento_ID'):
        ids = Departamentos.objects.filter(direccion=dr).values_list('pk', flat=True)
        zonas.setdefault((dr.jefe_id, cat.DIRECCION), (dr.jefe, set()))[1].update(ids)
    resultado = [(jefe, frozenset(ids), nivel) for (_id, nivel), (jefe, ids) in zonas.items()]
    user._suplencias = (hoy, resultado)
    return resultado


# Lo único que toma la suplencia: permisos de proyecto. La aprobación de solicitudes va aparte
# (Solicitudes/servicios.puede_decidir), con el nivel de la jefatura.
DELEGABLES = frozenset([*cat.PERMISOS_DE_PROYECTO, 'proyectos.reabrir', 'proyectos.crear'])
_ALCANCES_DE_JEFATURA = (cat.DEPARTAMENTO, cat.DIRECCION, cat.TODOS)


def jefatura_alcanza(jefe, zona, codigo, departamento):
    """¿La jefatura suplida da `codigo` sobre este departamento? Se usa el alcance del rol del jefe (el
    Administrador cuenta como «todos»), recortado a la zona; las membresías y lo propio del jefe no pasan."""
    if codigo not in DELEGABLES or departamento is None or departamento.pk not in zona:
        return False
    alcance = alcance_de(jefe, codigo)
    return alcance in _ALCANCES_DE_JEFATURA and en_alcance_de_departamento(jefe, alcance, departamento)


def suplentes_en_funciones():
    """Ids de quienes hoy cubren alguna jefatura (para no consultar persona por persona)."""
    deptos, dirs = _jefaturas_suplidas_qs(timezone.localdate())
    return set(deptos.values_list('suplente', flat=True)) | set(dirs.values_list('suplente', flat=True))


# ── Membresías ───────────────────────────────────────────────────────────────

def membresia_vigente(prefijo=''):
    """Activa, ya empezada y sin vencer (hasta vacío o desde hoy en adelante)."""
    hoy = timezone.localdate()
    return (
        Q(**{f'{prefijo}activo': True}) & Q(**{f'{prefijo}desde__lte': hoy})
        & (Q(**{f'{prefijo}hasta__isnull': True}) | Q(**{f'{prefijo}hasta__gte': hoy}))
    )


def _permisos_rol_proyecto(nombre):
    from .models import RolProyecto
    rol = RolProyecto.objects.filter(nombre=nombre).first()
    return set(rol.permisos) if rol else set()


def es_dueno(user, proyecto):
    return proyecto.user_ID_id == user.user_ID


def es_asignado(user, proyecto):
    """Responde por una tarea del proyecto o colabora en una."""
    return proyecto.tareas_set.filter(Q(asignado_a=user) | Q(colaboradores=user)).exists()


def permisos_en_proyecto(user, proyecto):
    """Permisos que el usuario tiene dentro de este proyecto por su rol en él (explícito o implícito).

    Se guardan en el objeto del proyecto (vive lo que dura la petición): puede() los consulta varias veces."""
    if not _autenticado(user) or proyecto is None:
        return set()
    cache = proyecto.__dict__.setdefault('_permisos_por_usuario', {})
    if user.pk not in cache:
        cache[user.pk] = _calcular_permisos_en_proyecto(user, proyecto)
    return cache[user.pk]


def _calcular_permisos_en_proyecto(user, proyecto):
    from .models import MiembroProyecto
    permisos = set()
    for m in MiembroProyecto.objects.filter(membresia_vigente(), proyecto=proyecto, usuario=user).select_related('rol'):
        permisos |= set(m.rol.permisos)
    if es_dueno(user, proyecto):
        permisos |= _permisos_rol_proyecto(cat.RESPONSABLE)
    if es_asignado(user, proyecto):
        permisos |= _permisos_rol_proyecto(cat.COLABORADOR)
    return permisos


# ── La regla ─────────────────────────────────────────────────────────────────

# Un proyecto cerrado (estado finalizado) o archivado no se modifica: hay que reabrirlo. Las fotos y
# los comentarios siguen abiertos (la evidencia final y las consultas llegan después del cierre).
BLOQUEADOS_AL_CERRAR = {'proyectos.editar', 'tareas.gestionar', 'presupuesto.ajustar', 'equipo.gestionar'}


def esta_cerrado(proyecto):
    return proyecto.archivado or proyecto.estado_ID.categoria == 'finalizado'


def puede(user, codigo, proyecto=None, aunque_cerrado=False):
    """¿Puede hacer `codigo`? Sin proyecto: si lo tiene con algún alcance (para acciones generales)."""
    if not _autenticado(user):
        return False
    if proyecto is not None and not aunque_cerrado and codigo in BLOQUEADOS_AL_CERRAR and esta_cerrado(proyecto):
        return False
    if _puede_por_si(user, codigo, proyecto):
        return True
    # Suplencia: solo sobre un proyecto de la zona. Sin proyecto (acciones generales) no se delega nada.
    if proyecto is None:
        return False
    return any(jefatura_alcanza(jefe, zona, codigo, proyecto.departamento_ID) for jefe, zona, _nivel in suplencias(user))


def _puede_por_si(user, codigo, proyecto):
    if es_administrador(user):
        return True
    alcance = alcance_de(user, codigo)
    if proyecto is None:
        return alcance is not None
    if alcance:
        if alcance == cat.PROPIO and es_dueno(user, proyecto):
            return True
        if en_alcance_de_departamento(user, alcance, proyecto.departamento_ID):
            return True
    return codigo in permisos_en_proyecto(user, proyecto)


def mis_permisos_en(user, proyecto):
    """Lista de permisos de proyecto que tiene el usuario en este proyecto (para el front)."""
    return sorted(c for c in [*cat.PERMISOS_DE_PROYECTO, 'proyectos.reabrir'] if puede(user, c, proyecto))


def puede_ver(user, proyecto):
    return puede(user, 'proyectos.ver', proyecto)


def puede_editar(user, proyecto):
    return puede(user, 'proyectos.editar', proyecto)


def puede_despublicar(user, proyecto):
    """Quitarlo del portal: quien edita el proyecto, aunque esté cerrado. Lo demás del proyecto sigue bloqueado."""
    return puede(user, 'proyectos.editar', proyecto, aunque_cerrado=True)


def puede_delegar(user, proyecto):
    return puede(user, 'equipo.gestionar', proyecto)


def _puede_crear_por_si(user, departamento):
    if es_administrador(user):
        return True
    alcance = alcance_de(user, 'proyectos.crear')
    if not alcance or departamento is None:
        return False
    if alcance == cat.PROPIO:
        return departamento.pk == user.departamento_ID_id
    return en_alcance_de_departamento(user, alcance, departamento)


def puede_crear_proyecto_en(user, departamento):
    """Crear un proyecto (o moverlo) en este departamento. «Lo propio» es su propio departamento."""
    if _puede_crear_por_si(user, departamento):
        return True
    return any(jefatura_alcanza(jefe, zona, 'proyectos.crear', departamento) for jefe, zona, _nivel in suplencias(user))


def puede_sobre_usuario(user, codigo, objetivo):
    """Permisos de usuarios (gestionar, ver datos): el alcance se mide contra el departamento del otro."""
    if not _autenticado(user):
        return False
    if es_administrador(user):
        return True
    alcance = alcance_de(user, codigo)
    if not alcance:
        return False
    if alcance == cat.PROPIO:
        return objetivo.pk == user.pk
    return en_alcance_de_departamento(user, alcance, objetivo.departamento_ID)


def rol_no_supera(rol, user):
    """¿Cada permiso del rol está también en el usuario, con un alcance igual o menor?"""
    if es_administrador(user):
        return True
    if rol.name == 'Administrador':
        return False
    propios = permisos_del_rol(user)
    orden = {a: i for i, a in enumerate(cat.ALCANCES)}
    for codigo, alcance in (rol.permisos or {}).items():
        if codigo not in propios or orden.get(alcance, 99) > orden.get(propios[codigo], -1):
            return False
    return True


def puede_gestionar_a(user, objetivo):
    """Editar, dar de baja o reenviar el acceso a otra persona: con usuarios.gestionar sobre su
    departamento y sin que su rol supere al propio (si no, un jefe tomaría la cuenta de un Alcalde
    cambiándole el correo y reenviando el enlace)."""
    if not puede_sobre_usuario(user, 'usuarios.gestionar', objetivo):
        return False
    if es_administrador(user):
        return True
    return objetivo.role_id is not None and rol_no_supera(objetivo.role, user)


# ── Querysets ────────────────────────────────────────────────────────────────

def proyectos_visibles(user):
    """Los proyectos que puede ver: es la misma regla que puede_ver(), con la suplencia incluida."""
    qs = _proyectos_visibles_por_si(user)
    sup = suplencias(user)
    if not sup:
        return qs
    from .models import Proyectos
    q = Q(pk__in=qs.values('pk'))
    for jefe, zona, _nivel in sup:
        # La misma regla que jefatura_alcanza: el alcance del rol del jefe, dentro de la zona.
        alcance = alcance_de(jefe, 'proyectos.ver')
        if alcance not in _ALCANCES_DE_JEFATURA:
            continue
        de_la_zona = Proyectos.objects.filter(departamento_ID__in=zona)
        q_jefe = _q_departamentos_en_alcance(jefe, alcance)
        if q_jefe is not None:
            de_la_zona = de_la_zona.filter(q_jefe)
        q |= Q(pk__in=de_la_zona.values('pk'))
    return Proyectos.objects.filter(q)


def _proyectos_visibles_por_si(user):
    from .models import Proyectos
    qs = Proyectos.objects.all()
    if not _autenticado(user):
        return qs.none()
    alcance = alcance_de(user, 'proyectos.ver')
    q_alcance = _q_departamentos_en_alcance(user, alcance) if alcance else Q(pk__in=[])
    if q_alcance is None:
        return qs
    from .models import RolProyecto
    # Sin lookups sobre JSON (SQLite no los tiene): los roles de proyecto son pocos.
    roles_que_ven = [r.pk for r in RolProyecto.objects.all() if 'proyectos.ver' in (r.permisos or [])]
    q = q_alcance | (Q(miembros__usuario=user) & Q(miembros__rol__in=roles_que_ven) & membresia_vigente('miembros__'))
    if alcance == cat.PROPIO or 'proyectos.ver' in _permisos_rol_proyecto(cat.RESPONSABLE):
        q |= Q(user_ID=user)
    if 'proyectos.ver' in _permisos_rol_proyecto(cat.COLABORADOR):
        q |= Q(tareas__asignado_a=user) | Q(tareas__colaboradores=user)
    return qs.filter(q).distinct()


def usuarios_visibles(user):
    """A quién puede ver una persona (decisiones de Raúl del 25/11):

    - por la jerarquía: quien ve todos los proyectos, a todos; el jefe de una dirección, a los
      departamentos de esa dirección; el jefe de un departamento, a ese departamento; el resto, a su departamento;
      el suplente en funciones, además, a la zona de la jefatura que cubre;
    - por el trabajo: a todo el equipo de los proyectos donde participa (dueño, personas con tareas
      asignadas y miembros vigentes), sin importar la jerarquía.
    Siempre a sí mismo. Ver a alguien no permite editarlo, y los datos personales los filtra el serializer.
    """
    from Users.models import Users
    from .models import Proyectos
    qs = Users.objects.all()
    if tiene_vision_global(user):
        return qs
    mis_proyectos = Proyectos.objects.filter(
        Q(user_ID=user)
        | Q(tareas__asignado_a=user)
        | Q(tareas__colaboradores=user)
        | (Q(miembros__usuario=user) & membresia_vigente('miembros__'))
    ).values('pk')
    q_suplencia = Q(pk__in=[])
    for _jefe, zona, _nivel in suplencias(user):
        q_suplencia |= Q(departamento_ID__in=zona)
    return qs.filter(
        Q(pk=user.pk)
        | Q(departamento_ID=user.departamento_ID_id)
        | Q(departamento_ID__jefe=user)
        | Q(departamento_ID__direccion__jefe=user)
        | q_suplencia
        | Q(proyectos__in=mis_proyectos)
        | Q(tareas_asignadas__proyecto_ID__in=mis_proyectos)
        | Q(tareas_colaboracion__proyecto_ID__in=mis_proyectos)
        | (Q(membresias__proyecto__in=mis_proyectos) & membresia_vigente('membresias__'))
    ).distinct()


def es_supervisor_jerarquico(user, proyecto):
    """Jefe del departamento o de la dirección del proyecto."""
    depto = proyecto.departamento_ID
    if depto and depto.jefe_id == user.user_ID:
        return True
    if depto and depto.direccion and depto.direccion.jefe_id == user.user_ID:
        return True
    return False


class ProyectoVisible(BasePermission):
    """Permiso a nivel objeto: el usuario debe poder ver el proyecto subyacente."""

    message = 'No tiene acceso a este proyecto.'

    def has_object_permission(self, request, view, obj):
        proyecto = getattr(obj, 'proyecto', None) or getattr(obj, 'proyecto_ID', None) or obj
        if request.method in SAFE_METHODS:
            return puede_ver(request.user, proyecto)
        return puede_editar(request.user, proyecto)
