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
    name='Task.tasks.enviar_acceso_async',
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    max_retries=3,
)
def enviar_acceso_async(user_id, motivo):
    """Manda el enlace para definir la contraseña. El token se genera aquí, no viaja por la cola."""
    from django.template.loader import render_to_string
    from django.utils.html import strip_tags
    from Users.acceso import enlace_de_acceso
    from Users.models import Users

    user = Users.objects.filter(pk=user_id, is_active=True).first()
    if user is None:
        return
    if not settings.EMAIL_HOST_USER:
        logger.info('EMAIL_HOST_USER vacío; se omite el correo de acceso.')
        return
    html = render_to_string('users/correo_acceso.html', {
        'motivo': motivo,
        'nombre': user.first_name,
        'enlace': enlace_de_acceso(user),
        'dias': settings.PASSWORD_RESET_TIMEOUT // 86400,
    })
    asunto = 'Bienvenida/o a MuniManagement' if motivo == 'bienvenida' else 'Recuperación de contraseña'
    send_mail(
        asunto,
        strip_tags(html),
        settings.DEFAULT_FROM_EMAIL or 'noreply@muni.local',
        [user.email],
        html_message=html,
        fail_silently=False,
    )
