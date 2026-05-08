import uuid
from django.db import models
from django.utils import timezone

TIPO_CHOICES = [
    ('creacion',              'Creación'),
    ('edicion_tarea',         'Edición de tarea'),
    ('edicion_proyecto',      'Edición de proyecto'),
    ('cambio_estado_tarea',   'Cambio de estado de tarea'),
    ('cambio_estado_proyecto','Cambio de estado de proyecto'),
    ('ampliacion_plazo',      'Ampliación de plazo'),
    ('reprogramacion',        'Reprogramación'),
    ('cancelacion',           'Cancelación'),
    ('solicitud_presupuesto', 'Solicitud de presupuesto adicional'),
    ('asignacion',            'Asignación de tarea'),
]


class HistorialCambios(models.Model):
    historial_ID     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tipo             = models.CharField(max_length=50, choices=TIPO_CHOICES)
    proyecto_ID      = models.ForeignKey('Projects.Proyectos', on_delete=models.CASCADE,
                                         related_name='historial', null=True, blank=True)
    tarea_ID         = models.CharField(max_length=36, blank=True, default='')
    usuario          = models.ForeignKey('Users.Users', on_delete=models.SET_NULL,
                                         null=True, blank=True)
    razon            = models.TextField(blank=True, default='')
    datos_anteriores = models.JSONField(null=True, blank=True)
    datos_nuevos     = models.JSONField(null=True, blank=True)
    created_at       = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']
