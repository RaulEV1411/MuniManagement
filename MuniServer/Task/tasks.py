from celery import shared_task
from celery.utils.log import get_task_logger
from django.conf import settings
from django.core.mail import send_mail

logger = get_task_logger(__name__)


@shared_task(name='Task.tasks.enviar_alertas_diarias')
def enviar_alertas_diarias():
    """Punto de entrada del beat. Calcula destinatarios y encola un email por destinatario."""
    from .cron import send_due_date_warnings
    send_due_date_warnings()


@shared_task(
    name='Task.tasks.enviar_email_async',
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    max_retries=3,
)
def enviar_email_async(asunto, mensaje, html, destinatarios):
    """Envío de email asíncrono con reintento exponencial."""
    if not settings.EMAIL_HOST_USER:
        logger.info('EMAIL_HOST_USER vacío; se omite envío real.')
        return
    send_mail(
        asunto,
        mensaje,
        settings.DEFAULT_FROM_EMAIL or 'noreply@muni.local',
        destinatarios,
        html_message=html,
        fail_silently=False,
    )


@shared_task(
    name='Task.tasks.enviar_credenciales_async',
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    max_retries=3,
)
def enviar_credenciales_async(email, password):
    """Envía las credenciales iniciales a un usuario recién creado. Falla silenciosa
    desde el flujo de creación: si el correo no se entrega, el admin debe rotar la
    contraseña manualmente o reenviar."""
    if not settings.EMAIL_HOST_USER:
        logger.info('EMAIL_HOST_USER vacío; se omite envío de credenciales.')
        return
    from django.template.loader import render_to_string
    from django.utils.html import strip_tags
    try:
        html = render_to_string('Users/email_card.html', {'username': email, 'password': password})
    except Exception:
        html = (
            f"<p>Hola, te damos la bienvenida a <strong>MuniManagement</strong>.</p>"
            f"<p>Usuario: <code>{email}</code><br>Contraseña temporal: <code>{password}</code></p>"
            f"<p>Cámbiala al iniciar sesión.</p>"
        )
    send_mail(
        'Bienvenida a MuniManagement',
        strip_tags(html),
        settings.DEFAULT_FROM_EMAIL or 'noreply@muni.local',
        [email],
        html_message=html,
        fail_silently=False,
    )
