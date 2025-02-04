# Generated by Django 5.1.1 on 2024-09-27 16:00

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Departments', '0002_departamentos'),
        ('Projects', '0003_tipos'),
        ('Users', '0002_users'),
    ]

    operations = [
        migrations.CreateModel(
            name='Proyectos',
            fields=[
                ('proyect_ID', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=50)),
                ('descripcion', models.CharField(max_length=500, unique=True)),
                ('fecha_inicio', models.DateField()),
                ('fecha_entrega', models.DateField()),
                ('costo', models.IntegerField()),
                ('departamento', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Departments.departamentos')),
                ('estado', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Projects.estado')),
                ('prioridad', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Projects.prioridad')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Users.users')),
            ],
        ),
    ]
