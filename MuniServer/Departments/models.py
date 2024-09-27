from django.db import models
import uuid

# Create your models here.
class Direccion(models.Model):
    direccion_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    
class Departamentos(models.Model):
    departamentos_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    direccion = models.ForeignKey(Direccion, on_delete=models.CASCADE)
    