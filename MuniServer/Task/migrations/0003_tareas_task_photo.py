# Generated by Django 5.1.1 on 2024-11-01 17:00

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Task', '0002_alter_tareas_descripcion'),
    ]

    operations = [
        migrations.AddField(
            model_name='tareas',
            name='task_photo',
            field=models.TextField(null=True),
        ),
    ]
