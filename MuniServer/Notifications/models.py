import uuid
from django.db import models
from Users.models import Users


class Notificacion(models.Model):
    TIPO_CHOICES = [
        ('vencimiento_proyecto', 'Vencimiento de proyecto'),
        ('vencimiento_tarea', 'Vencimiento de tarea'),
        ('cambio_estado', 'Cambio de estado'),
        ('asignacion', 'Asignación'),
        ('delegacion', 'Delegación de supervisión'),
        ('ajuste_presupuesto', 'Ajuste de presupuesto'),
        ('comentario', 'Nuevo comentario'),
        ('general', 'General'),
    ]
    notificacion_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES, default='general')
    titulo = models.CharField(max_length=120)
    mensaje = models.TextField()
    link = models.CharField(max_length=255, blank=True, default='')
    leida = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    clave_dedupe = models.CharField(max_length=120, blank=True, default='', db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['usuario', 'leida']),
            models.Index(fields=['usuario', 'created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['usuario', 'clave_dedupe'],
                condition=~models.Q(clave_dedupe=''),
                name='notif_dedupe_por_usuario',
            ),
        ]
