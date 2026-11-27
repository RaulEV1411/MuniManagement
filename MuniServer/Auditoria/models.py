"""Auditoría: qué pasó, quién lo hizo, cuándo, desde dónde y con qué resultado.

Los registros solo se agregan: no se editan ni se borran desde la aplicación (vencen según la
retención configurada). Cada uno guarda el hash del anterior, así que si alguien edita o borra uno
directo en la base, la verificación de la cadena lo detecta.
"""
import uuid

from django.db import models
from django.utils import timezone

MODULOS = [
    ('sesion', 'Sesión'),
    ('proyectos', 'Proyectos'),
    ('tareas', 'Tareas'),
    ('presupuesto', 'Presupuesto'),
    ('fotos', 'Fotos'),
    ('equipo', 'Equipo del proyecto'),
    ('comentarios', 'Comentarios'),
    ('usuarios', 'Usuarios'),
    ('roles', 'Roles y permisos'),
    ('estructura', 'Direcciones y departamentos'),
    ('catalogos', 'Estados, prioridades y tipos'),
    ('configuracion', 'Configuración'),
    ('reportes', 'Reportes'),
    ('solicitudes', 'Solicitudes'),
    ('auditoria', 'Auditoría'),
    ('otros', 'Otros'),
]

ACCIONES = [
    ('crear', 'Creó'),
    ('editar', 'Editó'),
    ('eliminar', 'Eliminó'),
    ('ver', 'Consultó'),
    ('baja', 'Dio de baja'),
    ('reactivar', 'Reactivó'),
    ('revocar', 'Revocó'),
    ('vencer', 'Venció'),
    ('cambiar_clave', 'Cambió la contraseña'),
    ('enviar_acceso', 'Envió el enlace de acceso'),
    ('iniciar_sesion', 'Inició sesión'),
    ('cerrar_sesion', 'Cerró sesión'),
    ('cerrar_sesion_remota', 'Cerró una sesión a distancia'),
    ('fallo_inicio', 'Intento fallido de inicio'),
    ('exportar', 'Exportó'),
    ('depurar', 'Depuró registros vencidos'),
    ('anonimizar', 'Anonimizó'),
]

RESULTADOS = [
    ('exito', 'Éxito'),
    ('fallo', 'Fallo'),
    ('denegado', 'Sin permiso'),
]


class RegistroInmutable(Exception):
    pass


class RegistroAuditoria(models.Model):
    id = models.BigAutoField(primary_key=True)
    creado_en = models.DateTimeField(default=timezone.now, db_index=True)
    # Sin restricción en la base: borrar o cambiar a alguien nunca toca sus registros (y su hash).
    usuario = models.ForeignKey(
        'Users.Users', on_delete=models.DO_NOTHING, db_constraint=False,
        null=True, blank=True, related_name='registros_auditoria',
    )
    usuario_email = models.CharField(max_length=254, blank=True, default='')
    rol = models.CharField(max_length=60, blank=True, default='')
    ip = models.CharField(max_length=45, blank=True, default='')
    agente = models.CharField(max_length=255, blank=True, default='')
    sesion = models.UUIDField(null=True, blank=True)
    modulo = models.CharField(max_length=20, choices=MODULOS, db_index=True)
    accion = models.CharField(max_length=24, choices=ACCIONES)
    objeto_tipo = models.CharField(max_length=60, blank=True, default='')
    objeto_id = models.CharField(max_length=64, blank=True, default='', db_index=True)
    objeto_repr = models.CharField(max_length=200, blank=True, default='')
    # {campo: [antes, después]}
    cambios = models.JSONField(null=True, blank=True)
    resultado = models.CharField(max_length=10, choices=RESULTADOS, default='exito', db_index=True)
    motivo = models.CharField(max_length=255, blank=True, default='')
    hash_anterior = models.CharField(max_length=64, blank=True, default='')
    hash = models.CharField(max_length=64, unique=True)

    class Meta:
        ordering = ['-id']
        indexes = [
            models.Index(fields=['usuario', '-creado_en'], name='auditoria_usuario_fecha'),
            models.Index(fields=['accion', '-creado_en'], name='auditoria_accion_fecha'),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise RegistroInmutable('Los registros de auditoría no se editan.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise RegistroInmutable('Los registros de auditoría no se borran: vencen según la retención configurada.')


class CadenaAuditoria(models.Model):
    """Una sola fila con el último hash: se bloquea al escribir, para encadenar sin carreras."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1)
    ultimo_hash = models.CharField(max_length=64, blank=True, default='')


class SesionUsuario(models.Model):
    """Una sesión, desde el inicio hasta el cierre. El refresh y el access llevan su id (claim `sid`)."""

    MOTIVOS = [
        ('cierre', 'Cerró sesión'),
        ('remota', 'Cerrada a distancia'),
        ('vencida', 'Venció por inactividad'),
        ('clave', 'Cambio de contraseña'),
        ('baja', 'Cuenta dada de baja'),
    ]

    sesion_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey('Users.Users', on_delete=models.CASCADE, related_name='sesiones')
    iniciada_en = models.DateTimeField(default=timezone.now)
    ultima_actividad = models.DateTimeField(default=timezone.now, db_index=True)
    # Tiempo con actividad real: se suman los intervalos entre peticiones de hasta 15 minutos.
    segundos_activos = models.PositiveIntegerField(default=0)
    ip = models.CharField(max_length=45, blank=True, default='')
    agente = models.CharField(max_length=255, blank=True, default='')
    cerrada_en = models.DateTimeField(null=True, blank=True)
    motivo_cierre = models.CharField(max_length=10, choices=MOTIVOS, blank=True, default='')
    cerrada_por = models.ForeignKey(
        'Users.Users', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )

    class Meta:
        ordering = ['-iniciada_en']
        indexes = [models.Index(fields=['usuario', '-ultima_actividad'], name='sesion_usuario_actividad')]
