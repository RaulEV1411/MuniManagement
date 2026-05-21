from django.contrib.auth.models import UserManager,AbstractBaseUser
from django.db import models
import uuid
from Departments.models import Departamentos

class Roles(models.Model):
    role_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    is_system = models.BooleanField(default=False)
    puede_delegar = models.BooleanField(default=False)
    puede_recibir_delegacion = models.BooleanField(default=False)
    puede_ver_todo = models.BooleanField(
        default=False,
        help_text='Si es True, ve todos los proyectos sin importar si es dueño/jefe/delegado.',
    )

class Users(AbstractBaseUser):
    user_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.ForeignKey(Roles, on_delete=models.CASCADE)
    departamento_ID = models.ForeignKey(Departamentos, on_delete=models.CASCADE)
    first_name = models.CharField(max_length=25)
    last_name = models.CharField(max_length=25)
    cedula = models.IntegerField(unique=True)
    phone_number = models.IntegerField()
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    birthday = models.DateField()
    puesto = models.CharField(max_length=25)
    user_photo = models.TextField(null=True)
    onboarding_completado = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name','last_name', 'role', 'departamento_ID', 'cedula', 'phone_number', 'birthday', 'puesto','user_photo']

    def _str_(self):
        return self.email