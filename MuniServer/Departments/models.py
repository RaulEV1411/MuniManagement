from django.core.validators import MinValueValidator
from django.db import models
import uuid


class DatosDeUnidad(models.Model):
    """Lo que comparten direcciones y departamentos además del nombre y la jefatura."""

    # Como el código de proyecto: NULL cuando no hay (MySQL no admite un único con condición).
    codigo = models.CharField(max_length=20, null=True, blank=True, unique=True)
    descripcion = models.CharField(max_length=500, blank=True, default='')
    # Toma la jefatura mientras el jefe tiene una ausencia vigente (Projects/authz.suplencias).
    suplente = models.ForeignKey('Users.Users', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    presupuesto_anual = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True,
                                            validators=[MinValueValidator(0)])
    correo = models.EmailField(blank=True, default='')
    telefono = models.CharField(max_length=20, blank=True, default='')
    metas = models.JSONField(default=list, blank=True)

    class Meta:
        abstract = True


class Direccion(DatosDeUnidad):
    direccion_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    jefe = models.ForeignKey(
        'Users.Users',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='direcciones_dirigidas',
    )


class Departamentos(DatosDeUnidad):
    departamentos_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    direccion = models.ForeignKey(Direccion, on_delete=models.PROTECT)
    jefe = models.ForeignKey(
        'Users.Users',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='departamentos_dirigidos',
    )
