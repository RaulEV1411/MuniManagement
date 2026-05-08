import uuid
from django.db import models
from Projects.models import Proyectos, Estado, Prioridad


class Tareas(models.Model):
    tareas_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prioridad_ID = models.ForeignKey(Prioridad, on_delete=models.CASCADE)
    estado_ID = models.ForeignKey(Estado, on_delete=models.CASCADE)
    proyecto_ID = models.ForeignKey(Proyectos, on_delete=models.CASCADE)
    asignado_a = models.ForeignKey('Users.Users', null=True, blank=True, on_delete=models.SET_NULL, related_name='tareas_asignadas')
    name = models.CharField(max_length=50)
    descripcion = models.CharField(max_length=255, blank=True, default='')
    fecha_inicio = models.DateField()
    fecha_entrega = models.DateField()


class TaskImage(models.Model):
    imagen_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tarea = models.ForeignKey(Tareas, on_delete=models.CASCADE, related_name='images')
    url = models.TextField()
    public_id = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
