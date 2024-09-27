# Generated by Django 5.1.1 on 2024-09-27 15:59

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Projects', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Prioridad',
            fields=[
                ('prioridad_ID', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=50, unique=True)),
            ],
        ),
    ]