import uuid
from django.db import models
from Departments.models import Departamentos
from Users.models import Users

class Estado(models.Model):
    estado_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)

class Prioridad(models.Model):
    prioridad_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)

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
    descripcion = models.CharField(max_length=255, unique=True)
    fecha_inicio = models.DateField()
    fecha_entrega = models.DateField()
    costo = models.IntegerField()
    project_photo = models.TextField(null=True)

class Proyectos_tipos(models.Model):
    proyecto = models.ForeignKey(Proyectos, on_delete=models.CASCADE)
    tipo = models.ForeignKey(Tipos, on_delete=models.CASCADE)