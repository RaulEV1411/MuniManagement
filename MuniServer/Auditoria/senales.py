"""Cambios en los modelos que importan: se registran solos, con el antes y el después de cada campo.

Se usan señales (y no cada vista) para que nada se escape: vistas, comandos y tareas programadas.
Las actualizaciones masivas (`QuerySet.update`) no pasan por acá; las que existen se anotan a mano.
"""
import uuid
from datetime import date, datetime
from decimal import Decimal

from django.apps import apps
from django.db.models.signals import post_delete, post_save, pre_save

# modelo: módulo de la auditoría
AUDITADOS = {
    'Projects.Proyectos': 'proyectos',
    'Projects.ProjectImage': 'fotos',
    'Projects.MiembroProyecto': 'equipo',
    'Projects.RolProyecto': 'roles',
    'Projects.AjustePresupuesto': 'presupuesto',
    'Projects.CierreProyecto': 'proyectos',
    'Projects.DocumentoProyecto': 'proyectos',
    'Projects.Estado': 'catalogos',
    'Projects.Prioridad': 'catalogos',
    'Projects.Tipos': 'catalogos',
    'Projects.TareaPlantilla': 'catalogos',
    'Projects.FuenteFinanciamiento': 'catalogos',
    'Projects.HitoProyecto': 'proyectos',
    'Projects.RiesgoProyecto': 'proyectos',
    'Task.Tareas': 'tareas',
    'Task.TaskImage': 'fotos',
    'Task.ChecklistItem': 'tareas',
    'Task.ComentarioTarea': 'comentarios',
    'Task.Recurso': 'catalogos',
    'Task.AsignacionRecurso': 'tareas',
    'Users.Users': 'usuarios',
    'Users.Roles': 'roles',
    'Users.Ausencia': 'usuarios',
    'Users.Especialidad': 'catalogos',
    'Departments.Direccion': 'estructura',
    'Departments.Departamentos': 'estructura',
    'Configuracion.Configuracion': 'configuracion',
    'Feedback.Feedback': 'comentarios',
    'Solicitudes.Solicitud': 'solicitudes',
    'Solicitudes.PasoAprobacion': 'solicitudes',
    'Solicitudes.TipoSolicitud': 'catalogos',
    'Solicitudes.ReglaAprobacion': 'catalogos',
}
SECRETOS = {'password'}
OCULTO = '•••'
# Datos sensibles (Ley 8968): la auditoría guarda que el registro existió, no su valor.
SENSIBLES = {'Users.Ausencia': {'tipo'}}
IGNORADOS = {'last_login'}
# (modelo, campo booleano): (acción al pasar a True, acción al pasar a False)
BANDERAS = {
    ('Users.Users', 'is_active'): ('reactivar', 'baja'),
    ('Projects.MiembroProyecto', 'activo'): ('reactivar', 'revocar'),
}


def _valor(v):
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, (uuid.UUID, Decimal)):
        return str(v)
    return v


def _campos(modelo):
    return [
        f for f in modelo._meta.concrete_fields
        if not f.primary_key and f.name not in IGNORADOS and not getattr(f, 'auto_now', False)
    ]


def instantanea(obj):
    datos = {f.name: _valor(getattr(obj, f.attname)) for f in _campos(type(obj))}
    for campo in SENSIBLES.get(f'{obj._meta.app_label}.{obj.__class__.__name__}', ()):
        if datos.get(campo) not in (None, ''):
            datos[campo] = OCULTO
    return datos


def representar(obj):
    """Un nombre legible para el objeto (sin consultas de más cuando se puede)."""
    if obj is None:
        return ''
    tipo = f'{obj._meta.app_label}.{obj.__class__.__name__}'
    if tipo == 'Users.Users':
        return f'{obj.first_name} {obj.last_name}'.strip() or obj.email
    if tipo == 'Projects.MiembroProyecto':
        return f'{representar(obj.usuario)} en «{obj.proyecto.name}»'
    if tipo == 'Projects.AjustePresupuesto':
        return f'{obj.get_tipo_display()} de {obj.monto} en «{obj.proyecto.name}»'
    if tipo == 'Solicitudes.Solicitud':
        return f'N.º {obj.numero} · {obj.tipo.nombre} («{obj.proyecto.name}»)'
    if tipo == 'Solicitudes.PasoAprobacion':
        return f'Paso {obj.orden} ({obj.get_nivel_display()}) de la solicitud N.º {obj.solicitud_id}'
    if tipo == 'Solicitudes.ReglaAprobacion':
        return f'{obj.tipo.nombre}: {obj.get_nivel_display()} desde {obj.desde}'
    if tipo == 'Projects.CierreProyecto':
        return f'Cierre de «{obj.proyecto.name}»'
    if tipo == 'Task.ChecklistItem':
        return f'«{obj.texto[:60]}» en la tarea «{obj.tarea.name}»'
    if tipo == 'Task.ComentarioTarea':
        return f'{obj.texto[:60]} (tarea «{obj.tarea.name}»)'
    if tipo == 'Task.AsignacionRecurso':
        return f'{obj.recurso.nombre} en la tarea «{obj.tarea.name}»'
    if tipo == 'Projects.TareaPlantilla':
        return f'«{obj.nombre}» en la plantilla de «{obj.tipo.name}»'
    if tipo == 'Users.Ausencia':
        return f'Ausencia de {representar(obj.usuario)} del {obj.desde:%d/%m/%Y} al {obj.hasta:%d/%m/%Y}'
    if tipo == 'Projects.HitoProyecto':
        return f'Hito «{obj.nombre}» de «{obj.proyecto.name}»'
    if tipo == 'Projects.RiesgoProyecto':
        return f'Riesgo «{obj.descripcion[:60]}» de «{obj.proyecto.name}»'
    if tipo == 'Projects.DocumentoProyecto':
        return f'{obj.nombre} («{obj.proyecto.name}»)'
    if tipo == 'Projects.ProjectImage':
        return f'Foto de «{obj.proyecto.name}»'
    if tipo == 'Task.TaskImage':
        return f'Foto de la tarea «{obj.tarea.name}»'
    if tipo == 'Feedback.Feedback':
        return (obj.info or '')[:80]
    for atributo in ('name', 'nombre'):
        valor = getattr(obj, atributo, None)
        if valor:
            return str(valor)
    return str(obj.pk)


def _legible(campo, valor):
    """En los campos que apuntan a otro objeto, su nombre en lugar del id."""
    if valor in (None, '') or not campo.is_relation:
        return valor
    relacionado = campo.related_model.objects.filter(pk=valor).first()
    return representar(relacionado) if relacionado is not None else valor


def _ocultar_secretos(cambios):
    for campo in SECRETOS & set(cambios):
        antes, despues = cambios[campo]
        cambios[campo] = [OCULTO if antes else None, OCULTO if despues else None]
    return cambios


def _tipo(sender):
    return f'{sender._meta.app_label}.{sender.__name__}'


def _antes_de_guardar(sender, instance, raw=False, **kwargs):
    if raw or instance._state.adding:
        return
    anterior = sender.objects.filter(pk=instance.pk).first()
    instance._auditoria_antes = instantanea(anterior) if anterior is not None else None


def _despues_de_guardar(sender, instance, created, raw=False, **kwargs):
    if raw:
        return
    from .servicios import registrar

    tipo = _tipo(sender)
    campos = {f.name: f for f in _campos(sender)}
    despues = instantanea(instance)
    if created:
        accion = 'crear'
        cambios = {k: [None, v] for k, v in despues.items() if v not in (None, '', [], {})}
    else:
        antes = getattr(instance, '_auditoria_antes', None)
        instance._auditoria_antes = None
        if antes is None:
            return
        cambios = {k: [antes.get(k), v] for k, v in despues.items() if antes.get(k) != v}
        if not cambios:
            return
        accion = 'editar'
        if set(cambios) == {'password'}:
            accion = 'cambiar_clave'
        for (modelo, campo), (al_activar, al_desactivar) in BANDERAS.items():
            if modelo == tipo and campo in cambios:
                accion = al_activar if cambios[campo][1] else al_desactivar
    for k in list(cambios):
        if campos[k].is_relation:
            cambios[k] = [_legible(campos[k], v) for v in cambios[k]]
    registrar(AUDITADOS[tipo], accion, objeto=instance, cambios=_ocultar_secretos(cambios))


def _despues_de_borrar(sender, instance, **kwargs):
    from .servicios import registrar

    datos = {k: [v, None] for k, v in instantanea(instance).items() if v not in (None, '', [], {})}
    try:
        nombre = representar(instance)
    except Exception:  # el objeto relacionado ya se borró en cascada
        nombre = str(instance.pk)
    registrar(AUDITADOS[_tipo(sender)], 'eliminar', objeto=instance, objeto_repr=nombre, cambios=_ocultar_secretos(datos))


def conectar():
    for etiqueta in AUDITADOS:
        modelo = apps.get_model(etiqueta)
        uid = f'auditoria-{etiqueta}'
        pre_save.connect(_antes_de_guardar, sender=modelo, dispatch_uid=f'{uid}-pre')
        post_save.connect(_despues_de_guardar, sender=modelo, dispatch_uid=f'{uid}-post')
        post_delete.connect(_despues_de_borrar, sender=modelo, dispatch_uid=f'{uid}-del')
