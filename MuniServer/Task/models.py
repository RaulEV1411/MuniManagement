import uuid
from django.core.validators import MaxValueValidator
from django.db import models
from django.utils import timezone
from Projects.models import Proyectos, Estado, Prioridad


class Tareas(models.Model):
    tareas_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prioridad_ID = models.ForeignKey(Prioridad, on_delete=models.PROTECT)
    estado_ID = models.ForeignKey(Estado, on_delete=models.PROTECT)
    proyecto_ID = models.ForeignKey(Proyectos, on_delete=models.CASCADE)
    asignado_a = models.ForeignKey('Users.Users', null=True, blank=True, on_delete=models.SET_NULL, related_name='tareas_asignadas')
    name = models.CharField(max_length=50)
    descripcion = models.CharField(max_length=255, blank=True, default='')
    fecha_inicio = models.DateField()
    fecha_entrega = models.DateField()
    # Presupuesto planificado (costo) y ejecutado: la suma de lo ejecutado es lo ejecutado del proyecto.
    costo = models.IntegerField(default=0)
    costo_ejecutado = models.PositiveIntegerField(default=0)
    # asignado_a es quien responde por la tarea; los colaboradores trabajan en ella.
    colaboradores = models.ManyToManyField('Users.Users', blank=True, related_name='tareas_colaboracion')
    # No se termina mientras alguna de estas siga abierta.
    bloqueada_por = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='bloquea_a')
    avance = models.PositiveSmallIntegerField(default=0, validators=[MaxValueValidator(100)])
    horas_estimadas = models.DecimalField(max_digits=7, decimal_places=1, null=True, blank=True)
    horas_reales = models.DecimalField(max_digits=7, decimal_places=1, null=True, blank=True)
    etiquetas = models.JSONField(default=list, blank=True)
    campos_extra = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['fecha_entrega']),
            models.Index(fields=['asignado_a', 'fecha_entrega']),
            models.Index(fields=['proyecto_ID', 'estado_ID']),
        ]


class TaskImage(models.Model):
    imagen_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tarea = models.ForeignKey(Tareas, on_delete=models.CASCADE, related_name='images')
    url = models.TextField()
    public_id = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)


class ChecklistItem(models.Model):
    """Lista de verificación de la tarea: pasos chicos que se tachan."""

    item_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tarea = models.ForeignKey(Tareas, on_delete=models.CASCADE, related_name='checklist')
    texto = models.CharField(max_length=200)
    hecho = models.BooleanField(default=False)
    orden = models.PositiveSmallIntegerField(default=0)
    hecho_por = models.ForeignKey('Users.Users', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    hecho_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['orden', 'texto']


class ComentarioTarea(models.Model):
    comentario_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tarea = models.ForeignKey(Tareas, on_delete=models.CASCADE, related_name='comentarios')
    autor = models.ForeignKey('Users.Users', on_delete=models.SET_NULL, null=True, related_name='+')
    texto = models.CharField(max_length=1000)
    creado_en = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['creado_en']


class Recurso(models.Model):
    """Catálogo de vehículos, maquinaria, equipo y materiales que se asignan a las tareas."""

    TIPOS = [
        ('vehiculo', 'Vehículo'),
        ('maquinaria', 'Maquinaria'),
        ('equipo', 'Equipo'),
        ('material', 'Material'),
        ('otro', 'Otro'),
    ]
    # Los materiales se consumen; el resto está en un solo lugar a la vez (se avisa si se cruzan fechas).
    TIPOS_SIN_CRUCE = ('material',)

    recurso_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=80)
    tipo = models.CharField(max_length=12, choices=TIPOS, default='equipo')
    codigo = models.CharField(max_length=40, blank=True, default='')
    descripcion = models.CharField(max_length=255, blank=True, default='')
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ['tipo', 'nombre']


class AsignacionRecurso(models.Model):
    asignacion_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tarea = models.ForeignKey(Tareas, on_delete=models.CASCADE, related_name='recursos')
    recurso = models.ForeignKey(Recurso, on_delete=models.PROTECT, related_name='asignaciones')
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    desde = models.DateField(null=True, blank=True)
    hasta = models.DateField(null=True, blank=True)
    nota = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['recurso__nombre']
