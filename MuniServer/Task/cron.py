# TareasApp/cron.py
from django.utils import timezone
from django.core.mail import send_mail
from .models import Tareas  # Importa el modelo de Tareas
import pytz

def send_due_date_reminder():
    # Get current time in UTC
    utc_now = timezone.now()
    # Define the Costa Rica timezone
    costa_rica_tz = pytz.timezone('America/Costa_Rica')
    # Convert UTC time to Costa Rica time
    costa_rica_now = utc_now.astimezone(costa_rica_tz)
    # Get today's date in Costa Rica timezone
    costa_rica_today = costa_rica_now.date()
    # Filter tasks by today's date in Costa Rica timezone
    tareas = Tareas.objects.filter(fecha_entrega=costa_rica_today)
    
    
    for tarea in tareas:
        # Acceder al proyecto relacionado con la tarea
        proyecto = tarea.proyecto_ID  # Accede al proyecto relacionado
        # Acceder al usuario relacionado con el proyecto
        usuario = proyecto.user_ID  # Accede al usuario relacionado
        # Obtener el correo electrónico del usuario
        email_usuario = usuario.email
        # Enviar el correo
        send_mail(
            'Recordatorio de Entrega de Tarea',
            f'Hola {usuario.first_name} {usuario.last_name}, la tarea "{tarea.name}" del proyecto "{proyecto.name}" debe ser entregada hoy.',
            'from@example.com',  # Cambia esto al correo del remitente
            [email_usuario],  # Dirección de correo del destinatario
            fail_silently=False,
        )
