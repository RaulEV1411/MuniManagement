from django.contrib.auth.models import UserManager,AbstractBaseUser
from django.db import models
import uuid
from Departments.models import Departamentos
from .identificacion import TIPOS as TIPOS_IDENTIFICACION

class Roles(models.Model):
    role_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    is_system = models.BooleanField(default=False)
    descripcion = models.CharField(max_length=255, blank=True, default='')
    # {permiso: alcance}: ver Projects/catalogo_permisos.py. El Administrador siempre tiene todo.
    permisos = models.JSONField(default=dict, blank=True)

class Especialidad(models.Model):
    """Catálogo de especialidades (topografía, electricidad…), para elegir a quién asignar una tarea."""
    especialidad_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=60, unique=True)

    class Meta:
        ordering = ['name']


class Users(AbstractBaseUser):
    user_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.ForeignKey(Roles, on_delete=models.PROTECT)
    departamento_ID = models.ForeignKey(Departamentos, on_delete=models.PROTECT)
    first_name = models.CharField(max_length=25)
    last_name = models.CharField(max_length=25)
    # Identificación con su tipo, como texto (validada en Users/identificacion.py).
    tipo_identificacion = models.CharField(max_length=10, choices=TIPOS_IDENTIFICACION, default='fisica')
    cedula = models.CharField('número de identificación', max_length=20, unique=True)
    phone_number = models.CharField('teléfono', max_length=20)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    # Opcional: solo se piden los datos que el sistema usa (Ley 8968, art. 6).
    birthday = models.DateField(null=True, blank=True)
    puesto = models.CharField(max_length=25)
    user_photo = models.TextField(null=True)
    onboarding_completado = models.BooleanField(default=False)
    # Baja lógica: un funcionario que se va no se borra, para no perder su historial.
    is_active = models.BooleanField(default=True)
    # Versión del aviso de privacidad que aceptó y cuándo (Ley 8968, art. 5: consentimiento informado).
    privacidad_version = models.PositiveIntegerField(default=0)
    privacidad_aceptada_en = models.DateTimeField(null=True, blank=True)
    # Datos de empleado, todos opcionales. El número, NULL cuando no hay (único sin condición, por MySQL).
    numero_empleado = models.CharField(max_length=20, null=True, blank=True, unique=True)
    extension = models.CharField(max_length=10, blank=True, default='')
    fecha_ingreso = models.DateField(null=True, blank=True)
    especialidades = models.ManyToManyField(Especialidad, blank=True, related_name='usuarios')

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name','last_name', 'role', 'departamento_ID', 'cedula', 'phone_number', 'puesto','user_photo']

    def _str_(self):
        return self.email


class Ausencia(models.Model):
    """Vacaciones, incapacidad o permiso, con fechas. Sin nota libre: la incapacidad ya es dato de salud
    (Ley 8968), así que solo se guarda el tipo y quién lo ve lo decide Users/ausencias.py."""
    TIPOS = [('vacaciones', 'Vacaciones'), ('incapacidad', 'Incapacidad'), ('permiso', 'Permiso')]

    ausencia_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='ausencias')
    tipo = models.CharField(max_length=12, choices=TIPOS)
    desde = models.DateField()
    hasta = models.DateField()
    registrada_por = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    creada_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-desde']
        indexes = [models.Index(fields=['usuario', 'desde', 'hasta'])]
