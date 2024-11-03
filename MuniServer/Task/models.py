import uuid
from django.db import models
from Projects.models import Proyectos, Estado, Prioridad

class Tareas(models.Model):
    tareas_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prioridad_ID = models.ForeignKey(Prioridad, on_delete=models.CASCADE)
    estado_ID = models.ForeignKey(Estado, on_delete=models.CASCADE)
    proyecto_ID = models.ForeignKey(Proyectos, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    descripcion = models.CharField(max_length=255, unique=True)
    fecha_inicio = models.DateField()
    fecha_entrega = models.DateField()
    task_photo = models.TextField(null=True)