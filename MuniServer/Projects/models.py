import uuid
from django.core.validators import MinValueValidator
from django.db import models
from Departments.models import Departamentos
from Users.models import Users


class Estado(models.Model):
    estado_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default='#64748b')
    orden = models.IntegerField(default=0)
    is_system = models.BooleanField(default=False)

    class Meta:
        ordering = ['orden', 'name']


class Prioridad(models.Model):
    prioridad_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default='#64748b')
    orden = models.IntegerField(default=0)
    is_system = models.BooleanField(default=False)

    class Meta:
        ordering = ['orden', 'name']


class Tipos(models.Model):
    tipos_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)


class Proyectos(models.Model):
    proyect_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    departamento_ID = models.ForeignKey(Departamentos, on_delete=models.CASCADE)
    estado_ID = models.ForeignKey(Estado, on_delete=models.CASCADE)
    prioridad_ID = models.ForeignKey(Prioridad, on_delete=models.CASCADE)
    user_ID = models.ForeignKey(Users, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    descripcion = models.CharField(max_length=255)
    fecha_inicio = models.DateField()
    fecha_entrega = models.DateField()
    costo = models.IntegerField()
    es_publico = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['fecha_entrega']),
            models.Index(fields=['user_ID', 'fecha_entrega']),
            models.Index(fields=['departamento_ID', 'estado_ID']),
            models.Index(fields=['es_publico']),
        ]


class ProjectImage(models.Model):
    imagen_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(Proyectos, on_delete=models.CASCADE, related_name='images')
    url = models.TextField()
    public_id = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)


class Proyectos_tipos(models.Model):
    proyecto = models.ForeignKey(Proyectos, on_delete=models.CASCADE)
    tipo = models.ForeignKey(Tipos, on_delete=models.CASCADE)


class DelegacionSupervision(models.Model):
    delegacion_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(Proyectos, on_delete=models.CASCADE, related_name='delegaciones')
    supervisor = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='delegaciones_recibidas')
    otorgado_por = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='delegaciones_otorgadas')
    puede_editar = models.BooleanField(default=False)
    activa = models.BooleanField(default=True)
    creada_en = models.DateTimeField(auto_now_add=True)
    expira_en = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-creada_en']
        unique_together = ('proyecto', 'supervisor')
        indexes = [
            models.Index(fields=['supervisor', 'activa']),
        ]


class AjustePresupuesto(models.Model):
    TIPO_CHOICES = [
        ('aumento', 'Aumento'),
        ('rebajo', 'Rebajo'),
    ]
    ajuste_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(
        Proyectos, on_delete=models.CASCADE, null=True, blank=True, related_name='ajustes_presupuesto'
    )
    tarea = models.ForeignKey(
        'Task.Tareas', on_delete=models.CASCADE, null=True, blank=True, related_name='ajustes_presupuesto'
    )
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    monto = models.IntegerField(validators=[MinValueValidator(1)])
    motivo = models.TextField()
    usuario = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='ajustes_creados')
    aprobado_por = models.ForeignKey(
        Users, on_delete=models.SET_NULL, null=True, blank=True, related_name='ajustes_aprobados'
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']
        constraints = [
            models.CheckConstraint(
                check=models.Q(monto__gt=0),
                name='ajuste_monto_positivo',
            ),
            models.CheckConstraint(
                check=models.Q(proyecto__isnull=False) | models.Q(tarea__isnull=False),
                name='ajuste_requiere_proyecto_o_tarea',
            ),
        ]
