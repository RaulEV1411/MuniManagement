"""Solicitudes de cambio: prórrogas, presupuesto, personal, responsable, alcance u otros.

La solicitud es la propuesta; al aprobarse el último paso, el cambio se aplica solo (la «orden de
cambio») y queda en el historial. Mientras tanto el proyecto sigue: pedir no frena la operación.
"""
from django.db import models
from django.utils import timezone

# Qué hace una solicitud aprobada.
PLAZO = 'plazo'
AUMENTO = 'aumento'
REBAJO = 'rebajo'
PERSONAL = 'personal'
RESPONSABLE = 'responsable'
NINGUNO = 'ninguno'
EFECTOS = [
    (PLAZO, 'Cambia la fecha de entrega'),
    (AUMENTO, 'Suma al presupuesto'),
    (REBAJO, 'Resta del presupuesto'),
    (PERSONAL, 'Suma una persona al equipo'),
    (RESPONSABLE, 'Cambia el responsable'),
    (NINGUNO, 'Solo queda registrada'),
]

# Quién aprueba cada paso: se mide con el alcance de solicitudes.aprobar sobre el departamento del proyecto.
NIVELES = [
    ('departamento', 'Jefatura del departamento'),
    ('direccion', 'Jefatura de la dirección'),
    ('alcaldia', 'Alcaldía'),
]
ORDEN_DE_NIVELES = [n for n, _ in NIVELES]


class TipoSolicitud(models.Model):
    tipo_ID = models.BigAutoField(primary_key=True)
    nombre = models.CharField(max_length=60, unique=True)
    descripcion = models.CharField(max_length=255, blank=True, default='')
    efecto = models.CharField(max_length=12, choices=EFECTOS, default=NINGUNO)
    # Días para responder cada paso; vencido, se avisa y pasa al nivel siguiente.
    dias_respuesta = models.PositiveSmallIntegerField(default=5)
    is_system = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    orden = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['orden', 'nombre']


class ReglaAprobacion(models.Model):
    """Un paso de la cadena: aplica si el impacto (monto o días) llega a `desde`."""

    regla_ID = models.BigAutoField(primary_key=True)
    tipo = models.ForeignKey(TipoSolicitud, on_delete=models.CASCADE, related_name='reglas')
    nivel = models.CharField(max_length=12, choices=NIVELES)
    desde = models.PositiveBigIntegerField(default=0)

    class Meta:
        ordering = ['tipo', 'desde']
        constraints = [models.UniqueConstraint(fields=['tipo', 'nivel'], name='regla_unica_por_nivel')]


class Solicitud(models.Model):
    ESTADOS = [
        ('enviada', 'Enviada'),
        ('en_revision', 'En revisión'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
        ('retirada', 'Retirada'),
    ]
    ABIERTAS = ('enviada', 'en_revision')

    numero = models.BigAutoField(primary_key=True)
    proyecto = models.ForeignKey('Projects.Proyectos', on_delete=models.CASCADE, related_name='solicitudes')
    tarea = models.ForeignKey('Task.Tareas', on_delete=models.SET_NULL, null=True, blank=True, related_name='solicitudes')
    tipo = models.ForeignKey(TipoSolicitud, on_delete=models.PROTECT, related_name='solicitudes')
    justificacion = models.TextField()
    nueva_fecha = models.DateField(null=True, blank=True)
    monto = models.PositiveBigIntegerField(null=True, blank=True)
    persona = models.ForeignKey('Users.Users', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    rol_proyecto = models.ForeignKey('Projects.RolProyecto', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    hasta = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default='enviada', db_index=True)
    solicitante = models.ForeignKey('Users.Users', on_delete=models.SET_NULL, null=True, related_name='solicitudes')
    creada_en = models.DateTimeField(default=timezone.now)
    resuelta_en = models.DateTimeField(null=True, blank=True)
    aplicada = models.BooleanField(default=False)
    resultado = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['-numero']


class PasoAprobacion(models.Model):
    ESTADOS = [('pendiente', 'Pendiente'), ('aprobado', 'Aprobado'), ('rechazado', 'Rechazado'), ('omitido', 'Sin decisión')]

    paso_ID = models.BigAutoField(primary_key=True)
    solicitud = models.ForeignKey(Solicitud, on_delete=models.CASCADE, related_name='pasos')
    orden = models.PositiveSmallIntegerField()
    nivel = models.CharField(max_length=12, choices=NIVELES)
    estado = models.CharField(max_length=10, choices=ESTADOS, default='pendiente')
    # Empieza a correr cuando el paso queda en turno.
    vence = models.DateField(null=True, blank=True)
    # Vencido sin respuesta, lo puede decidir también el nivel siguiente.
    escalado = models.BooleanField(default=False)
    decidido_por = models.ForeignKey('Users.Users', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    decidido_en = models.DateTimeField(null=True, blank=True)
    comentario = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['solicitud', 'orden']
