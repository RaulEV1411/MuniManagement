from celery import shared_task


@shared_task(name='Auditoria.tasks.mantenimiento_diario')
def mantenimiento_diario():
    """Cierra las sesiones vencidas y borra lo que pasó la retención configurada."""
    from . import servicios, sesiones
    sesiones.vencer()
    servicios.depurar()
