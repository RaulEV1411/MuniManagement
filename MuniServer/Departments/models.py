from django.db import models
import uuid


class Direccion(models.Model):
    direccion_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    jefe = models.ForeignKey(
        'Users.Users',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='direcciones_dirigidas',
    )


class Departamentos(models.Model):
    departamentos_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    direccion = models.ForeignKey(Direccion, on_delete=models.CASCADE)
    jefe = models.ForeignKey(
        'Users.Users',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='departamentos_dirigidos',
    )
