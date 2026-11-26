# Permisos configurables por rol: reemplazan las banderas puede_delegar, puede_recibir_delegacion y puede_ver_todo.

from django.db import migrations, models


def cargar_permisos(apps, schema_editor):
    from Projects.catalogo_permisos import PERMISOS_POR_DEFECTO, TODOS, DEPARTAMENTO, _ALCALDIA, _BASE, _jefatura
    Roles = apps.get_model('Users', 'Roles')
    for rol in Roles.objects.all():
        if rol.name in PERMISOS_POR_DEFECTO:
            rol.permisos = dict(PERMISOS_POR_DEFECTO[rol.name])
        elif rol.puede_ver_todo:
            rol.permisos = dict(_ALCALDIA)
        elif rol.puede_delegar:
            rol.permisos = _jefatura(DEPARTAMENTO)
        else:
            rol.permisos = dict(_BASE)
        if not rol.puede_recibir_delegacion and rol.name not in PERMISOS_POR_DEFECTO:
            rol.permisos.pop('equipo.integrar', None)
        rol.save(update_fields=['permisos'])


class Migration(migrations.Migration):

    dependencies = [
        ('Users', '0012_alter_users_birthday'),
    ]

    operations = [
        migrations.AddField(
            model_name='roles',
            name='descripcion',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='roles',
            name='permisos',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.RunPython(cargar_permisos, migrations.RunPython.noop),
        migrations.RemoveField(model_name='roles', name='puede_delegar'),
        migrations.RemoveField(model_name='roles', name='puede_recibir_delegacion'),
        migrations.RemoveField(model_name='roles', name='puede_ver_todo'),
    ]
