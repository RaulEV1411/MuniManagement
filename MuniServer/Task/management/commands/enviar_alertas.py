from django.core.management.base import BaseCommand
from Task.cron import send_due_date_warnings


class Command(BaseCommand):
    help = 'Ejecuta manualmente los avisos de vencimiento (proyectos y tareas a 0-4 días).'

    def handle(self, *args, **options):
        send_due_date_warnings()
        self.stdout.write(self.style.SUCCESS('Avisos de vencimiento enviados.'))
