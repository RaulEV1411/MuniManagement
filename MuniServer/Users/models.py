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

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name','last_name', 'role', 'departamento_ID', 'cedula', 'phone_number', 'puesto','user_photo']

    def _str_(self):
        return self.email