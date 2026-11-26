from django.contrib import admin
from .models import HistorialCambios


@admin.register(HistorialCambios)
class HistorialCambiosAdmin(admin.ModelAdmin):
    """El historial es un registro de auditoría: en el admin solo se consulta."""

    list_display = ('created_at', 'tipo', 'proyecto_ID', 'usuario')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
