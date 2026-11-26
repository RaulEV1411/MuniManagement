from django.apps import AppConfig


class AuditoriaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'Auditoria'
    verbose_name = 'Auditoría'

    def ready(self):
        from . import senales
        senales.conectar()
