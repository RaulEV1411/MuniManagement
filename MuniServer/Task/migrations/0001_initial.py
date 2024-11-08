# Generated by Django 5.1.1 on 2024-09-27 17:06

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('Projects', '0007_rename_departamento_proyectos_departamento_id_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Tareas',
            fields=[
                ('tareas_ID', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=50)),
                ('descripcion', models.CharField(max_length=500, unique=True)),
                ('fecha_inicio', models.DateField()),
                ('fecha_entrega', models.DateField()),
                ('estado_ID', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Projects.estado')),
                ('prioridad_ID', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Projects.prioridad')),
                ('proyecto_ID', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Projects.proyectos')),
            ],
        ),
    ]
