"""Ley 8968: lo que se entrega a la persona («Mis datos»), la exportación de usuarios y la anonimización."""
import csv
import io
import logging
import uuid

from django.contrib.auth.hashers import make_password
from django.utils import timezone

from .models import Users

logger = logging.getLogger(__name__)
CAMPOS_PERSONALES = ['first_name', 'last_name', 'email', 'tipo_identificacion', 'cedula', 'phone_number', 'birthday', 'puesto', 'user_photo',
                     'numero_empleado', 'extension', 'fecha_ingreso']


def _fecha(valor):
    return valor.isoformat() if valor else None


def datos_de(p):
    """Todo lo que el sistema guarda de la persona, en un solo documento."""
    from Auditoria.models import RegistroAuditoria, SesionUsuario
    from Auditoria.servicios import describir_agente
    from Feedback.models import Feedback
    from Projects.models import MiembroProyecto, Proyectos
    from Solicitudes.models import Solicitud
    from Task.models import Tareas

    return {
        'generado_en': timezone.now().isoformat(),
        'persona': {
            'nombre': p.first_name, 'apellidos': p.last_name,
            'tipo_identificacion': p.get_tipo_identificacion_display(), 'identificacion': p.cedula,
            'correo': p.email, 'telefono': p.phone_number, 'puesto': p.puesto, 'nacimiento': _fecha(p.birthday),
            'rol': p.role.name if p.role_id else '', 'departamento': p.departamento_ID.name if p.departamento_ID_id else '',
            'foto': p.user_photo or '', 'cuenta_activa': p.is_active,
            'numero_empleado': p.numero_empleado or '', 'extension': p.extension, 'ingreso': _fecha(p.fecha_ingreso),
            'especialidades': [e.name for e in p.especialidades.all()],
            'aviso_de_privacidad': {'version_aceptada': p.privacidad_version, 'aceptado_el': _fecha(p.privacidad_aceptada_en)},
        },
        'ausencias': [
            {'tipo': a.get_tipo_display(), 'desde': _fecha(a.desde), 'hasta': _fecha(a.hasta)} for a in p.ausencias.all()
        ],
        'proyectos_a_cargo': [
            {'nombre': x.name, 'estado': x.estado_ID.name, 'entrega': _fecha(x.fecha_entrega)}
            for x in Proyectos.objects.filter(user_ID=p).select_related('estado_ID')
        ],
        'tareas_asignadas': [
            {'nombre': t.name, 'proyecto': t.proyecto_ID.name, 'estado': t.estado_ID.name, 'entrega': _fecha(t.fecha_entrega)}
            for t in Tareas.objects.filter(asignado_a=p).select_related('proyecto_ID', 'estado_ID')
        ],
        'equipos': [
            {'proyecto': m.proyecto.name, 'rol': m.rol.nombre, 'desde': _fecha(m.desde), 'hasta': _fecha(m.hasta), 'activo': m.activo}
            for m in MiembroProyecto.objects.filter(usuario=p).select_related('proyecto', 'rol')
        ],
        'comentarios': [
            {'proyecto': c.proyecto_ID.name, 'texto': c.info, 'fecha': _fecha(c.created_at)}
            for c in Feedback.objects.filter(user_ID=p).select_related('proyecto_ID')
        ],
        'solicitudes': [
            {'numero': s.numero, 'tipo': s.tipo.nombre, 'proyecto': s.proyecto.name, 'estado': s.get_estado_display(), 'fecha': _fecha(s.creada_en)}
            for s in Solicitud.objects.filter(solicitante=p).select_related('tipo', 'proyecto')
        ],
        'sesiones': [
            {'inicio': _fecha(s.iniciada_en), 'ultima_actividad': _fecha(s.ultima_actividad), 'cierre': _fecha(s.cerrada_en),
             'ip': s.ip, 'dispositivo': describir_agente(s.agente)}
            for s in SesionUsuario.objects.filter(usuario=p)[:100]
        ],
        'acciones': [
            {'fecha': _fecha(r.creado_en), 'modulo': r.get_modulo_display(), 'accion': r.get_accion_display(),
             'sobre': r.objeto_repr, 'resultado': r.get_resultado_display()}
            for r in RegistroAuditoria.objects.filter(usuario=p)[:500]
        ],
    }


def _celda(valor):
    texto = '' if valor is None else str(valor)
    return "'" + texto if texto[:1] in ('=', '+', '-', '@', '\t', '\r') else texto


def csv_de_usuarios(qs):
    salida = io.StringIO()
    salida.write('﻿')
    escritor = csv.writer(salida)
    escritor.writerow(['Nombre', 'Apellidos', 'Tipo de identificación', 'Identificación', 'Correo', 'Teléfono', 'Puesto',
                       'Rol', 'Departamento', 'Activa', 'Última conexión'])
    total = 0
    for u in qs:
        ultima = getattr(u, 'ultima_conexion', None)
        escritor.writerow([_celda(v) for v in (
            u.first_name, u.last_name, u.get_tipo_identificacion_display(), u.cedula, u.email, u.phone_number, u.puesto,
            u.role.name if u.role_id else '', u.departamento_ID.name if u.departamento_ID_id else '',
            'Sí' if u.is_active else 'No', timezone.localtime(ultima).strftime('%d/%m/%Y %H:%M') if ultima else '',
        )])
        total += 1
    return salida.getvalue(), total


def anonimizar(persona, motivo):
    """Borra los datos personales sin tocar lo que hizo. Se escribe con update(), para que la auditoría
    no guarde los valores anteriores (el registro dice qué campos se borraron, no su contenido)."""
    from Auditoria import servicios as auditoria
    from Auditoria.models import SesionUsuario
    from MuniServer.subidas import borrar_imagen_por_url

    try:
        borrar_imagen_por_url(persona.user_photo)
    except Exception:
        logger.exception('No se pudo borrar la foto al anonimizar')
    marca = uuid.uuid4().hex[:12]
    Users.objects.filter(pk=persona.pk).update(
        first_name='Persona', last_name='anonimizada', email=f'anonimizada-{marca}@anonimo.invalid',
        tipo_identificacion='pasaporte', cedula=f'ANON{marca}'.upper(), phone_number='', birthday=None,
        puesto='', user_photo=None, password=make_password(None),
        numero_empleado=None, extension='', fecha_ingreso=None,
    )
    # Ya anonimizada: si la auditoría registra estos borrados, dice «Persona anonimizada».
    persona.refresh_from_db()
    persona.especialidades.clear()
    persona.ausencias.all().delete()
    SesionUsuario.objects.filter(usuario=persona).delete()
    auditoria.registrar(
        'usuarios', 'anonimizar', objeto_tipo='Users.Users', objeto_id=str(persona.pk), objeto_repr='Persona anonimizada',
        cambios={c: ['•••', None] for c in CAMPOS_PERSONALES}, motivo=motivo or 'A pedido de la persona',
    )
