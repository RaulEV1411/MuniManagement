"""Ausencias, disponibilidad y carga de trabajo de las personas."""
from django.db.models import Count, DecimalField, ExpressionWrapper, F, OuterRef, Prefetch, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from Projects import authz
from Projects import catalogo_permisos as cat
from .models import Ausencia


def es_jefatura_de(user, persona):
    """Jefe del departamento o de la dirección de la persona, o quien hoy cubre esa jefatura. Como en
    puede_gestionar_a, el rol de la persona no puede superar al de la jefatura (un jefe de departamento
    no le registra ausencias a la dirección). Quien suple no toca las ausencias de los jefes que cubre:
    si no, alargaría la ausencia del jefe y se quedaría con la jefatura."""
    from Departments.models import Departamentos, Direccion
    depto = persona.departamento_ID
    if depto is None or persona.role_id is None:
        return False
    if depto.jefe_id == user.pk or (depto.direccion_id and depto.direccion.jefe_id == user.pk):
        return authz.rol_no_supera(persona.role, user)
    zonas = [(jefe, zona) for jefe, zona, _nivel in authz.suplencias(user) if depto.pk in zona]
    if not zonas:
        return False
    if (Departamentos.objects.filter(jefe=persona, suplente=user).exists()
            or Direccion.objects.filter(jefe=persona, suplente=user).exists()):
        return False
    return any(authz.rol_no_supera(persona.role, jefe) for jefe, _zona in zonas)


def puede_registrar_ausencia(user, persona):
    return user.pk == persona.pk or authz.puede_gestionar_a(user, persona) or es_jefatura_de(user, persona)


def ve_tipo_de_ausencia(user, persona):
    """La incapacidad es dato de salud: el tipo lo ven la persona, quien le registra ausencias y
    quien ve los datos de todas las personas. El resto solo sabe que está ausente."""
    return puede_registrar_ausencia(user, persona) or authz.alcance_de(user, 'usuarios.ver_datos') == cat.TODOS


def vigentes(qs=None):
    hoy = timezone.localdate()
    return (qs if qs is not None else Ausencia.objects).filter(desde__lte=hoy, hasta__gte=hoy)


def prefetch_vigentes():
    return Prefetch('ausencias', queryset=vigentes(), to_attr='ausencias_vigentes')


def disponibilidad(persona, ve_tipo):
    actuales = getattr(persona, 'ausencias_vigentes', None)
    if actuales is None:
        actuales = list(vigentes(persona.ausencias.all()))
    if not actuales:
        return {'estado': 'disponible', 'hasta': None, 'tipo': None}
    ausencia = max(actuales, key=lambda a: a.hasta)
    return {'estado': 'ausente', 'hasta': ausencia.hasta.isoformat(), 'tipo': ausencia.tipo if ve_tipo else None}


def _contar(sub, campo):
    return Coalesce(Subquery(sub.values(campo).annotate(n=Count('pk')).values('n')[:1]), 0)


def anotar_carga(qs):
    """Tareas abiertas asignadas (y vencidas), horas estimadas que faltan y proyectos abiertos a cargo.
    Con subconsultas, para que la lista no haga una consulta por persona."""
    from Projects.models import FINALIZADO, Proyectos
    from Task.models import Tareas
    hoy = timezone.localdate()
    abiertas = (
        Tareas.objects.filter(asignado_a=OuterRef('pk'), proyecto_ID__archivado=False)
        .exclude(estado_ID__categoria=FINALIZADO).exclude(proyecto_ID__estado_ID__categoria=FINALIZADO)
    )
    restante = ExpressionWrapper(F('horas_estimadas') * (100 - F('avance')) / 100,
                                 output_field=DecimalField(max_digits=9, decimal_places=1))
    proyectos = Proyectos.objects.filter(user_ID=OuterRef('pk'), archivado=False).exclude(estado_ID__categoria=FINALIZADO)
    return qs.annotate(
        carga_tareas=_contar(abiertas, 'asignado_a'),
        carga_vencidas=_contar(abiertas.filter(fecha_entrega__lt=hoy), 'asignado_a'),
        carga_horas=Coalesce(
            Subquery(abiertas.values('asignado_a').annotate(h=Sum(restante)).values('h')[:1]),
            Value(0), output_field=DecimalField(max_digits=9, decimal_places=1),
        ),
        carga_proyectos=_contar(proyectos, 'user_ID'),
    )


def carga(persona):
    if not hasattr(persona, 'carga_tareas'):
        return None
    return {
        'tareas_abiertas': persona.carga_tareas, 'tareas_vencidas': persona.carga_vencidas,
        'horas_pendientes': round(float(persona.carga_horas or 0), 1), 'proyectos_a_cargo': persona.carga_proyectos,
    }


def proyectos_abiertos_a_cargo(persona, quien_mira):
    """Los que convendría delegar durante la ausencia: solo los que ve quien registra."""
    from Projects.models import FINALIZADO
    return list(
        authz.proyectos_visibles(quien_mira).filter(user_ID=persona, archivado=False)
        .exclude(estado_ID__categoria=FINALIZADO).order_by('fecha_entrega').values('proyect_ID', 'name')
    )
