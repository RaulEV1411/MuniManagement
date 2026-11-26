from rest_framework import serializers

from .models import RegistroAuditoria, SesionUsuario
from .servicios import describir_agente

ETIQUETAS = {
    'name': 'Nombre', 'nombre': 'Nombre', 'descripcion': 'Descripción', 'description': 'Descripción',
    'departamento_ID': 'Departamento', 'estado_ID': 'Estado', 'prioridad_ID': 'Prioridad',
    'user_ID': 'Responsable', 'proyecto_ID': 'Proyecto', 'proyecto': 'Proyecto', 'tarea': 'Tarea',
    'fecha_inicio': 'Fecha de inicio', 'fecha_entrega': 'Fecha de entrega', 'costo': 'Costo',
    'es_publico': 'Publicado en el portal', 'asignado_a': 'Asignada a', 'created_at': 'Creado',
    'first_name': 'Nombre', 'last_name': 'Apellidos', 'email': 'Correo', 'password': 'Contraseña',
    'role': 'Rol', 'cedula': 'Cédula', 'phone_number': 'Teléfono', 'birthday': 'Nacimiento',
    'puesto': 'Puesto', 'user_photo': 'Foto', 'is_active': 'Activo', 'onboarding_completado': 'Recorrido inicial',
    'permisos': 'Permisos', 'is_system': 'Del sistema', 'orden': 'Orden', 'color': 'Color',
    'usuario': 'Persona', 'rol': 'Rol', 'desde': 'Desde', 'hasta': 'Hasta', 'motivo': 'Motivo',
    'otorgado_por': 'Otorgado por', 'activo': 'Vigente', 'revocado_en': 'Revocado el', 'revocado_por': 'Revocado por',
    'tipo': 'Tipo', 'monto': 'Monto', 'aprobado_por': 'Aprobado por', 'url': 'Archivo', 'public_id': 'Id del archivo',
    'direccion': 'Dirección', 'jefe': 'Jefatura', 'info': 'Comentario', 'ubicacion': 'Ubicación',
    'logo': 'Logo', 'color_primario': 'Color principal', 'color_acento': 'Color de acento',
    'correo_soporte': 'Correo de soporte', 'telefono_soporte': 'Teléfono de soporte',
    'horario_soporte': 'Horario de soporte', 'moneda': 'Moneda', 'categoria': 'Categoría',
    'archivado': 'Archivado', 'archivado_en': 'Archivado el', 'archivado_por': 'Archivado por',
    'fecha_fin_real': 'Fecha real de fin', 'costo_real': 'Costo real', 'lecciones': 'Lecciones aprendidas',
    'cerrado_por': 'Cerrado por', 'cerrado_en': 'Cerrado el', 'reabierto_en': 'Reabierto el',
    'reabierto_por': 'Reabierto por', 'motivo_reapertura': 'Motivo de la reapertura', 'cierre': 'Cierre',
    'subido_por': 'Subido por', 'estado': 'Estado', 'costo_ejecutado': 'Costo ejecutado', 'avance': 'Avance (%)',
    'horas_estimadas': 'Horas estimadas', 'horas_reales': 'Horas reales', 'etiquetas': 'Etiquetas', 'texto': 'Texto',
    'hecho': 'Hecho', 'cantidad': 'Cantidad', 'recurso': 'Recurso', 'codigo': 'Código', 'tipo_identificacion': 'Tipo de identificación',
    'privacidad_version': 'Aviso de privacidad aceptado (versión)', 'privacidad_aceptada_en': 'Aviso aceptado el',
    'aviso_privacidad': 'Aviso de privacidad', 'encargados': 'Encargados', 'privacidad_actualizada': 'Aviso actualizado el', 'retencion_auditoria_dias': 'Retención de la auditoría (días)',
}


class RegistroAuditoriaSerializer(serializers.ModelSerializer):
    modulo_display = serializers.CharField(source='get_modulo_display', read_only=True)
    accion_display = serializers.CharField(source='get_accion_display', read_only=True)
    resultado_display = serializers.CharField(source='get_resultado_display', read_only=True)
    usuario_nombre = serializers.SerializerMethodField()
    dispositivo = serializers.SerializerMethodField()
    detalle = serializers.SerializerMethodField()

    class Meta:
        model = RegistroAuditoria
        fields = [
            'id', 'creado_en', 'usuario', 'usuario_nombre', 'usuario_email', 'rol', 'ip', 'dispositivo',
            'sesion', 'modulo', 'modulo_display', 'accion', 'accion_display', 'objeto_tipo', 'objeto_id',
            'objeto_repr', 'detalle', 'resultado', 'resultado_display', 'motivo', 'hash',
        ]

    def get_usuario_nombre(self, obj):
        u = obj.usuario if obj.usuario_id else None
        if u is None:
            return '' if obj.usuario_email else 'Sistema'
        return f'{u.first_name} {u.last_name}'.strip()

    def get_dispositivo(self, obj):
        return describir_agente(obj.agente) if obj.agente else ''

    def get_detalle(self, obj):
        return [
            {'campo': campo, 'etiqueta': ETIQUETAS.get(campo, campo.replace('_', ' ').capitalize()), 'antes': par[0], 'despues': par[1]}
            for campo, par in (obj.cambios or {}).items()
        ]


class SesionUsuarioSerializer(serializers.ModelSerializer):
    dispositivo = serializers.SerializerMethodField()
    motivo_cierre_display = serializers.CharField(source='get_motivo_cierre_display', read_only=True)
    abierta = serializers.SerializerMethodField()
    actual = serializers.SerializerMethodField()
    cerrada_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = SesionUsuario
        fields = [
            'sesion_ID', 'iniciada_en', 'ultima_actividad', 'segundos_activos', 'ip', 'dispositivo',
            'cerrada_en', 'motivo_cierre', 'motivo_cierre_display', 'cerrada_por_nombre', 'abierta', 'actual',
        ]

    def get_dispositivo(self, obj):
        return describir_agente(obj.agente)

    def get_abierta(self, obj):
        desde = self.context.get('abierta_desde')
        return obj.cerrada_en is None and (desde is None or obj.ultima_actividad >= desde)

    def get_actual(self, obj):
        return str(obj.sesion_ID) == str(self.context.get('sesion_actual') or '')

    def get_cerrada_por_nombre(self, obj):
        u = obj.cerrada_por
        return f'{u.first_name} {u.last_name}'.strip() if u else ''
