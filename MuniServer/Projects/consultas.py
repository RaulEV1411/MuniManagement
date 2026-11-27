"""Filtros, orden y totales de proyectos en el servidor. Antes el front bajaba los primeros 200
y calculaba todo en el navegador, así que con más proyectos los números quedaban incompletos."""
from django.db.models import Case, Count, IntegerField, Q, Sum, Value, When
from django.utils import timezone

from .models import AjustePresupuesto, Proyectos


ORDENES = {
    'reciente': ['-created_at'],
    'nombre': ['name'],
    'entrega': ['fecha_entrega', 'name'],
    'prioridad': ['-prioridad_ID__orden', 'fecha_entrega'],
    # Columnas de la tabla (las anotaciones vienen de views._proyectos_visibles_qs).
    'codigo': ['codigo', 'name'],
    # La celda muestra «Vencido» en los atrasados: van juntos, después de los demás.
    'estado': ['vencido_orden', 'estado_ID__orden', 'name'],
    'departamento': ['departamento_ID__name', 'name'],
    'responsable': ['user_ID__first_name', 'user_ID__last_name', 'name'],
    'avance': ['avance_calc', 'name'],
    'presupuesto': ['presupuesto_total', 'name'],
    'ejecutado': ['costo_ejecutado_total', 'name'],
}


def q_vencidos():
    return Q(fecha_entrega__lt=timezone.localdate()) & ~Q(estado_ID__categoria='finalizado')


def filtrar(qs, params, user):
    """Mismos criterios que el dashboard: search (también por código y SICOP), estado (o «Vencido»), prioridad, departamento y mios."""
    search = params.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(name__icontains=search) | Q(descripcion__icontains=search)
            | Q(departamento_ID__name__icontains=search)
            | Q(user_ID__first_name__icontains=search) | Q(user_ID__last_name__icontains=search)
            | Q(codigo__icontains=search) | Q(numero_sicop__icontains=search)
        )
    estado = params.get('estado', '').strip()
    if estado == 'Vencido':
        qs = qs.filter(q_vencidos())
    elif estado:
        # Un proyecto vencido se cuenta como «Vencido», no en su estado.
        qs = qs.filter(estado_ID__name=estado).exclude(q_vencidos())
    if params.get('prioridad'):
        qs = qs.filter(prioridad_ID__name=params['prioridad'])
    if params.get('departamento'):
        qs = qs.filter(departamento_ID=params['departamento'])
    if params.get('user_ID'):
        qs = qs.filter(user_ID=params['user_ID'])
    if params.get('mios') in ('1', 'true'):
        qs = qs.filter(user_ID=user)
    if params.get('categoria') in ('activo', 'pausado', 'finalizado'):
        qs = qs.filter(estado_ID__categoria=params['categoria'])
    # Los archivados salen de las listas; se piden aparte.
    qs = qs.filter(archivado=params.get('archivados') in ('1', 'true'))
    return qs


def por_categoria(qs):
    """Cuántos hay en cada pestaña (Activos, Pausados, Finalizados), sobre el conjunto sin esa pestaña."""
    base = Proyectos.objects.filter(pk__in=qs.values('pk'))
    totales = dict(base.values_list('estado_ID__categoria').annotate(n=Count('pk')))
    return {c: totales.get(c, 0) for c in ('activo', 'pausado', 'finalizado')}


def campos_de_orden(ordenes, pedido, por_defecto):
    """`clave` ordena como dice la tabla; `-clave`, al revés (cada campo invertido). Lo desconocido usa el por defecto."""
    pedido = str(pedido or '')
    invertir = pedido.startswith('-')
    campos = ordenes.get(pedido.lstrip('-'))
    if campos is None:
        return ordenes[por_defecto]
    return [c[1:] if c.startswith('-') else f'-{c}' for c in campos] if invertir else campos


def ordenar(qs, params):
    # El pk al final: con valores repetidos (mismo estado, mismo avance) la paginación no repite ni salta filas.
    qs = qs.annotate(vencido_orden=Case(When(q_vencidos(), then=Value(1)), default=Value(0), output_field=IntegerField()))
    return qs.order_by(*campos_de_orden(ORDENES, params.get('orden', 'reciente'), 'reciente'), 'pk')


def resumen(qs):
    """Totales del conjunto filtrado. Se agrega sobre los ids para no contar dos veces los
    proyectos que la regla de visibilidad trae repetidos por sus joins."""
    base = Proyectos.objects.filter(pk__in=qs.values('pk'))
    por_estado = list(
        base.values('estado_ID', 'estado_ID__name', 'estado_ID__color', 'estado_ID__orden')
        .annotate(total=Count('pk')).order_by('estado_ID__orden')
    )
    por_departamento = list(
        base.values('departamento_ID', 'departamento_ID__name')
        .annotate(total=Count('pk'), completados=Count('pk', filter=Q(estado_ID__name='Completado')))
        .order_by('-total')[:8]
    )
    costo = base.aggregate(s=Sum('costo'))['s'] or 0
    ajustes = AjustePresupuesto.objects.filter(proyecto__in=base).aggregate(
        aumentos=Sum('monto', filter=Q(tipo='aumento')), rebajos=Sum('monto', filter=Q(tipo='rebajo')),
    )
    total = base.count()
    completados = base.filter(estado_ID__name='Completado').count()
    return {
        'total': total,
        'completados': completados,
        'en_progreso': base.filter(estado_ID__name='En progreso').count(),
        'vencidos': base.filter(q_vencidos()).count(),
        'porcentaje_completado': round(completados * 100 / total) if total else 0,
        'costo_total': costo + (ajustes['aumentos'] or 0) - (ajustes['rebajos'] or 0),
        'por_estado': [
            {'estado_ID': str(e['estado_ID']), 'name': e['estado_ID__name'], 'color': e['estado_ID__color'], 'total': e['total']}
            for e in por_estado
        ],
        'por_departamento': [
            {'departamento_ID': str(d['departamento_ID']), 'name': d['departamento_ID__name'],
             'total': d['total'], 'completados': d['completados']}
            for d in por_departamento
        ],
    }
