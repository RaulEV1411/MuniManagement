import uuid
from django.db import models
from Departments.models import Departamentos

class Roles(models.Model):
    role_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)

class Users(models.Model):
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
