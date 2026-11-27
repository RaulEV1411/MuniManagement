import math
from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer, PrimaryKeyRelatedField, SerializerMethodField, ValidationError
from .models import (
    Estado, Prioridad, Tipos, Proyectos, Proyectos_tipos, ProjectImage,
    AjustePresupuesto, MiembroProyecto, RolProyecto, CierreProyecto, DocumentoProyecto,
    TareaPlantilla, FuenteFinanciamiento, HitoProyecto, RiesgoProyecto, CampoPersonalizado,
)
from . import authz
from . import campos as campos_personalizados
from .catalogo_permisos import PERMISOS_DE_PROYECTO
from Departments.serializers import DepartamentoResumenSerializer
from Users.serializers import UsuarioResumenSerializer


class EstadoSerializer(ModelSerializer):
    class Meta:
        model = Estado
        fields = ['estado_ID', 'name', 'color', 'orden', 'is_system', 'categoria']
        read_only_fields = ['is_system']

    def validate_categoria(self, valor):
        # Cambiarla con proyectos en ese estado los cerraría (o abriría) sin pasar por el cierre.
        if self.instance is not None and valor != self.instance.categoria and self.instance.proyectos_set.exists():
            raise ValidationError('Hay proyectos en este estado: no se puede cambiar su categoría.')
        return valor


class PrioridadSerializer(ModelSerializer):
    class Meta:
        model = Prioridad
        fields = ['prioridad_ID', 'name', 'color', 'orden', 'is_system']
        read_only_fields = ['is_system']


class TareaPlantillaSerializer(ModelSerializer):
    class Meta:
        model = TareaPlantilla
        fields = ['plantilla_ID', 'tipo', 'nombre', 'descripcion', 'dias_desde_inicio', 'duracion_dias', 'pasos', 'orden']

    def validate_tipo(self, tipo):
        if self.instance is not None and tipo != self.instance.tipo:
            raise ValidationError('Una tarea de plantilla no se pasa a otro tipo.')
        return tipo

    def validate_pasos(self, valor):
        if not isinstance(valor, list) or len(valor) > 30:
            raise ValidationError('Indique hasta 30 pasos.')
        pasos = ['' if p is None else str(p).strip() for p in valor]
        if any(len(p) > 200 for p in pasos):
            raise ValidationError('Cada paso puede tener hasta 200 caracteres.')
        return [p for p in pasos if p]


class TiposSerializer(ModelSerializer):
    plantillas = TareaPlantillaSerializer(many=True, read_only=True)

    class Meta:
        model = Tipos
        fields = ['tipos_ID', 'name', 'plantillas']


class FuenteFinanciamientoSerializer(ModelSerializer):
    class Meta:
        model = FuenteFinanciamiento
        fields = ['fuente_ID', 'name']


class CampoPersonalizadoSerializer(ModelSerializer):
    class Meta:
        model = CampoPersonalizado
        fields = ['campo_ID', 'nombre', 'aplica_a', 'tipo_dato', 'opciones', 'obligatorio', 'ayuda', 'orden', 'activo', 'tipos']
        validators = []  # el nombre repetido se revisa en validate, sin distinguir mayúsculas

    def validate_nombre(self, valor):
        valor = valor.strip()
        if not valor:
            raise ValidationError('Escriba un nombre.')
        return valor

    def validate_ayuda(self, valor):
        return valor.strip()

    def validate_opciones(self, valor):
        if not isinstance(valor, list) or len(valor) > 50:
            raise ValidationError('Use hasta 50 opciones.')
        limpias, vistas = [], set()
        for opcion in valor:
            texto = '' if isinstance(opcion, (bool, dict, list)) or opcion is None else str(opcion).strip()
            if not texto:
                continue
            if len(texto) > 60:
                raise ValidationError('Cada opción puede tener hasta 60 caracteres.')
            if texto.casefold() in vistas:
                raise ValidationError(f'La opción «{texto}» está repetida.')
            vistas.add(texto.casefold())
            limpias.append(texto)
        return limpias

    def validate(self, attrs):
        actual = self.instance
        aplica_a = attrs.get('aplica_a', getattr(actual, 'aplica_a', None))
        tipo_dato = attrs.get('tipo_dato', getattr(actual, 'tipo_dato', None))
        nombre = attrs.get('nombre', getattr(actual, 'nombre', ''))
        if tipo_dato == CampoPersonalizado.LISTA:
            if not attrs.get('opciones', getattr(actual, 'opciones', None)):
                raise ValidationError({'opciones': 'Una lista necesita al menos una opción.'})
        else:
            attrs['opciones'] = []
        repetido = CampoPersonalizado.objects.filter(aplica_a=aplica_a, nombre__iexact=nombre)
        if actual is not None:
            repetido = repetido.exclude(pk=actual.pk)
        if repetido.exists():
            raise ValidationError({'nombre': 'Ya hay otro campo con ese nombre.'})
        if (actual is not None and (aplica_a != actual.aplica_a or tipo_dato != actual.tipo_dato)
                and campos_personalizados.en_uso(actual)):
            raise ValidationError({'tipo_dato': 'Ya tiene datos cargados: no se puede cambiar a qué aplica ni el tipo de dato. Cree otro campo y desactive este.'})
        if actual is None and 'orden' not in attrs:
            # Sin orden explícito, los campos salen en el orden en que se crearon.
            ultimo = CampoPersonalizado.objects.filter(aplica_a=aplica_a).order_by('-orden').values_list('orden', flat=True).first()
            attrs['orden'] = 0 if ultimo is None else ultimo + 1
        return attrs


def crear_tareas_de_plantilla(proyecto, tipo):
    """Las tareas que trae el tipo, con sus fechas desde el inicio del proyecto (sin pasar de la entrega)."""
    from Task.models import ChecklistItem, Tareas
    plantillas = list(tipo.plantillas.all())
    if not plantillas:
        return
    estado = (Estado.objects.filter(name='Pendiente').first()
              or Estado.objects.filter(categoria='activo').order_by('orden').first())
    for plantilla in plantillas:
        inicio = min(proyecto.fecha_inicio + timedelta(days=plantilla.dias_desde_inicio), proyecto.fecha_entrega)
        fin = max(inicio, min(inicio + timedelta(days=plantilla.duracion_dias - 1), proyecto.fecha_entrega))
        tarea = Tareas.objects.create(
            proyecto_ID=proyecto, name=plantilla.nombre, descripcion=plantilla.descripcion,
            estado_ID=estado, prioridad_ID=proyecto.prioridad_ID, fecha_inicio=inicio, fecha_entrega=fin,
        )
        ChecklistItem.objects.bulk_create(
            ChecklistItem(tarea=tarea, texto=texto, orden=i) for i, texto in enumerate(plantilla.pasos)
        )


class ProjectImageSerializer(ModelSerializer):
    class Meta:
        model = ProjectImage
        fields = ['imagen_ID', 'url', 'public_id', 'created_at']


class ProyectosWriteSerializer(ModelSerializer):
    # El asistente elige un tipo al crear; se guarda en Proyectos_tipos.
    tipos_ID = PrimaryKeyRelatedField(queryset=Tipos.objects.all(), write_only=True, required=False, allow_null=True)
    # Si el tipo trae tareas, se crean con el proyecto salvo que se pida lo contrario.
    usar_plantilla = serializers.BooleanField(write_only=True, required=False, default=True)

    CAMPOS_INDICADOR = ('nombre', 'unidad', 'meta', 'logrado')

    class Meta:
        model = Proyectos
        fields = '__all__'
        # Archivar tiene su acción (solo el Administrador).
        read_only_fields = ['archivado', 'archivado_en', 'archivado_por']
        # Que no se repita se revisa en validate_codigo, sin distinguir mayúsculas.
        extra_kwargs = {'codigo': {'validators': []}}

    def validate_codigo(self, valor):
        valor = (valor or '').strip()
        if not valor:
            return None
        if Proyectos.objects.filter(codigo__iexact=valor).exclude(pk=getattr(self.instance, 'pk', None)).exists():
            raise ValidationError('Ya hay un proyecto con ese código.')
        return valor

    def validate_numero_sicop(self, valor):
        return valor.strip()

    def validate_distrito(self, valor):
        from Configuracion.models import Configuracion
        valor = valor.strip()
        distritos = Configuracion.actual().distritos
        # El que ya tenía se conserva aunque lo hayan quitado de la lista: si no, la ficha no se podría guardar.
        if valor and distritos and valor != getattr(self.instance, 'distrito', None):
            elegido = next((d for d in distritos if d.casefold() == valor.casefold()), None)
            if elegido is None:
                raise ValidationError('Elija uno de los distritos de Configuración › Institución.')
            return elegido
        return valor

    def validate_indicadores(self, valor):
        """Cada indicador: nombre, unidad, meta y lo logrado (números de cero en adelante)."""
        if not isinstance(valor, list) or len(valor) > 20:
            raise ValidationError('Indique hasta 20 indicadores.')
        limpios = []
        for fila in valor:
            if not isinstance(fila, dict) or not str(fila.get('nombre', '')).strip():
                raise ValidationError('Cada indicador necesita un nombre.')
            numeros = {}
            for campo in ('meta', 'logrado'):
                crudo = fila.get(campo)
                if crudo in (None, ''):
                    numeros[campo] = None
                    continue
                try:
                    numeros[campo] = float(crudo)
                except (TypeError, ValueError, OverflowError):
                    numeros[campo] = math.nan
                # NaN o infinito no son números para el JSON (el navegador no lo podría leer).
                if not math.isfinite(numeros[campo]):
                    raise ValidationError(f'La {campo} de «{fila["nombre"]}» tiene que ser un número.')
                if numeros[campo] < 0:
                    raise ValidationError(f'La {campo} de «{fila["nombre"]}» no puede ser negativa.')
            limpios.append({
                'nombre': str(fila['nombre']).strip()[:120], 'unidad': str(fila.get('unidad') or '').strip()[:30], **numeros,
            })
        return limpios

    def validate(self, attrs):
        lat = attrs.get('latitud', getattr(self.instance, 'latitud', None))
        lon = attrs.get('longitud', getattr(self.instance, 'longitud', None))
        if (lat is None) != (lon is None):
            raise ValidationError({'latitud': 'Indique la latitud y la longitud, o ninguna de las dos.'})
        # Al crear se exigen los obligatorios; al editar se revisa solo lo que se manda. El tipo no cambia al
        # editar (update descarta tipos_ID): se usa el que ya tiene.
        if self.instance is None or 'campos_extra' in attrs:
            tipo = attrs.get('tipos_ID') if self.instance is None else None
            tipos = [tipo.pk] if tipo else campos_personalizados.tipos_de(self.instance)
            attrs['campos_extra'] = campos_personalizados.validar(
                CampoPersonalizado.PROYECTO, attrs.get('campos_extra', {}), tipos, getattr(self.instance, 'campos_extra', None),
                al_crear=self.instance is None,
            )
        return attrs

    def validate_estado_ID(self, estado):
        # Un proyecto nace activo o pausado: a un estado finalizado se llega cerrándolo.
        if self.instance is None and estado.categoria == 'finalizado':
            raise ValidationError('Un proyecto nuevo no puede empezar cerrado.')
        return estado

    @transaction.atomic
    def create(self, validated_data):
        tipo = validated_data.pop('tipos_ID', None)
        usar_plantilla = validated_data.pop('usar_plantilla', True)
        proyecto = super().create(validated_data)
        if tipo is not None:
            Proyectos_tipos.objects.create(proyecto=proyecto, tipo=tipo)
            if usar_plantilla:
                crear_tareas_de_plantilla(proyecto, tipo)
        return proyecto

    def update(self, instance, validated_data):
        validated_data.pop('tipos_ID', None)
        validated_data.pop('usar_plantilla', None)
        return super().update(instance, validated_data)


class HitoProyectoSerializer(ModelSerializer):
    cumplido = SerializerMethodField()

    class Meta:
        model = HitoProyecto
        fields = ['hito_ID', 'proyecto', 'nombre', 'descripcion', 'fecha_prevista', 'fecha_real', 'cumplido']

    def get_cumplido(self, obj):
        return obj.fecha_real is not None

    def validate_proyecto(self, proyecto):
        if self.instance is not None and proyecto != self.instance.proyecto:
            raise ValidationError('Un hito no se pasa a otro proyecto.')
        return proyecto

    def validate_fecha_real(self, valor):
        if valor and valor > timezone.localdate():
            raise ValidationError('Un hito no se cumple en el futuro.')
        return valor


class RiesgoProyectoSerializer(ModelSerializer):
    nivel = serializers.IntegerField(read_only=True)
    probabilidad_display = serializers.CharField(source='get_probabilidad_display', read_only=True)
    impacto_display = serializers.CharField(source='get_impacto_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    responsable_info = UsuarioResumenSerializer(source='responsable', read_only=True)

    class Meta:
        model = RiesgoProyecto
        fields = [
            'riesgo_ID', 'proyecto', 'descripcion', 'probabilidad', 'probabilidad_display', 'impacto', 'impacto_display',
            'nivel', 'mitigacion', 'responsable', 'responsable_info', 'estado', 'estado_display', 'creado_por', 'creado_en',
        ]
        read_only_fields = ['creado_por', 'creado_en']

    def validate_proyecto(self, proyecto):
        if self.instance is not None and proyecto != self.instance.proyecto:
            raise ValidationError('Un riesgo no se pasa a otro proyecto.')
        return proyecto

    def validate_responsable(self, usuario):
        request = self.context.get('request')
        # Se revisa solo si cambia, como el responsable del proyecto.
        sin_cambio = self.instance is not None and usuario is not None and usuario.pk == self.instance.responsable_id
        if usuario is not None and request and not sin_cambio and not authz.usuarios_visibles(request.user).filter(pk=usuario.pk).exists():
            raise ValidationError('El responsable tiene que ser una persona de su alcance.')
        return usuario


class DocumentoProyectoSerializer(ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    subido_por_nombre = SerializerMethodField()

    class Meta:
        model = DocumentoProyecto
        fields = ['documento_ID', 'proyecto', 'tarea', 'tipo', 'tipo_display', 'nombre', 'url', 'subido_por', 'subido_por_nombre', 'creado_en']
        read_only_fields = ['url', 'subido_por', 'creado_en']

    def get_subido_por_nombre(self, obj):
        u = obj.subido_por
        return f'{u.first_name} {u.last_name}'.strip() if u else ''


class CierreProyectoSerializer(ModelSerializer):
    estado_nombre = serializers.CharField(source='estado.name', read_only=True)
    cerrado_por_nombre = SerializerMethodField()
    documentos = DocumentoProyectoSerializer(many=True, read_only=True)

    class Meta:
        model = CierreProyecto
        fields = [
            'cierre_ID', 'estado', 'estado_nombre', 'fecha_fin_real', 'costo_real', 'motivo', 'lecciones',
            'cerrado_por_nombre', 'cerrado_en', 'documentos',
        ]

    def get_cerrado_por_nombre(self, obj):
        u = obj.cerrado_por
        return f'{u.first_name} {u.last_name}'.strip() if u else ''


class CerrarProyectoSerializer(serializers.Serializer):
    estado_ID = serializers.PrimaryKeyRelatedField(queryset=Estado.objects.filter(categoria='finalizado'),
                                                   error_messages={'does_not_exist': 'Elija un estado de cierre (por ejemplo Completado o Cancelado).'})
    fecha_fin_real = serializers.DateField()
    costo_real = serializers.IntegerField(min_value=0)
    motivo = serializers.CharField(max_length=2000)
    lecciones = serializers.CharField(max_length=4000, required=False, allow_blank=True, default='')

    def validate_fecha_fin_real(self, valor):
        if valor > timezone.localdate():
            raise serializers.ValidationError('La fecha real de fin no puede ser futura.')
        return valor


class ReabrirProyectoSerializer(serializers.Serializer):
    estado_ID = serializers.PrimaryKeyRelatedField(queryset=Estado.objects.exclude(categoria='finalizado'),
                                                   error_messages={'does_not_exist': 'Elija un estado activo o pausado.'})
    motivo = serializers.CharField(max_length=2000)


class ProyectosReadSerializer(ModelSerializer):
    departamento_ID = DepartamentoResumenSerializer(read_only=True)
    estado_ID = EstadoSerializer(read_only=True)
    prioridad_ID = PrioridadSerializer(read_only=True)
    user_ID = UsuarioResumenSerializer(read_only=True)
    images = ProjectImageSerializer(many=True, read_only=True)
    costo_total = SerializerMethodField()
    tipos = SerializerMethodField()
    mis_permisos = SerializerMethodField()
    cerrado = SerializerMethodField()
    cierre = SerializerMethodField()
    costo_ejecutado = SerializerMethodField()
    avance = SerializerMethodField()
    solicitudes_abiertas = serializers.IntegerField(read_only=True, default=None)
    fuente_financiamiento_nombre = serializers.CharField(source='fuente_financiamiento.name', read_only=True, default=None)

    class Meta:
        model = Proyectos
        fields = '__all__'

    def get_cerrado(self, obj):
        return authz.esta_cerrado(obj)

    def get_avance(self, obj):
        valor = getattr(obj, 'avance_calc', None)
        return None if valor is None else round(valor)

    def get_costo_ejecutado(self, obj):
        # Lo ejecutado del proyecto es la suma de lo ejecutado en sus tareas.
        return getattr(obj, 'costo_ejecutado_total', None) or 0

    def get_cierre(self, obj):
        # Solo en el detalle, como mis_permisos: el cierre vigente (el último sin reabrir).
        if not self.context.get('incluir_mis_permisos') or not authz.esta_cerrado(obj):
            return None
        cierre = obj.cierres.filter(reabierto_en__isnull=True).select_related('estado', 'cerrado_por').prefetch_related('documentos').first()
        return CierreProyectoSerializer(cierre).data if cierre else None

    def get_tipos(self, obj):
        return [{'tipos_ID': str(pt.tipo_id), 'name': pt.tipo.name} for pt in obj.proyectos_tipos_set.all()]

    def get_mis_permisos(self, obj):
        # Solo en el detalle: calcularlo en cada fila de una lista costaría consultas por proyecto.
        if not self.context.get('incluir_mis_permisos') or 'request' not in self.context:
            return None
        return authz.mis_permisos_en(self.context['request'].user, obj)

    def get_costo_total(self, obj):
        ajustes = obj.ajustes_presupuesto.all()
        delta = sum(a.monto if a.tipo == 'aumento' else -a.monto for a in ajustes)
        return (obj.costo or 0) + delta


class ProyectosTiposSerializer(ModelSerializer):
    class Meta:
        model = Proyectos_tipos
        fields = '__all__'


class RolProyectoSerializer(ModelSerializer):
    class Meta:
        model = RolProyecto
        fields = ['rol_proyecto_ID', 'nombre', 'descripcion', 'permisos', 'is_system', 'orden']
        read_only_fields = ['rol_proyecto_ID', 'is_system']

    def validate_permisos(self, value):
        if not isinstance(value, list) or any(c not in PERMISOS_DE_PROYECTO for c in value):
            raise ValidationError('Hay permisos que no existen o que no valen dentro de un proyecto.')
        return sorted(set(value))


class MiembroProyectoSerializer(ModelSerializer):
    usuario_info = UsuarioResumenSerializer(source='usuario', read_only=True)
    otorgado_por_info = UsuarioResumenSerializer(source='otorgado_por', read_only=True)
    rol_info = RolProyectoSerializer(source='rol', read_only=True)
    vigente = SerializerMethodField()
    dias_restantes = SerializerMethodField()

    class Meta:
        model = MiembroProyecto
        fields = [
            'miembro_ID', 'proyecto', 'usuario', 'rol', 'desde', 'hasta', 'motivo', 'activo',
            'otorgado_por', 'creado_en', 'revocado_en',
            'usuario_info', 'otorgado_por_info', 'rol_info', 'vigente', 'dias_restantes',
        ]
        read_only_fields = ['miembro_ID', 'otorgado_por', 'creado_en', 'revocado_en', 'activo']

    def get_vigente(self, obj):
        hoy = date.today()
        return obj.activo and obj.desde <= hoy and (obj.hasta is None or obj.hasta >= hoy)

    def get_dias_restantes(self, obj):
        return (obj.hasta - date.today()).days if obj.hasta else None

    def validate(self, attrs):
        desde = attrs.get('desde', getattr(self.instance, 'desde', None) or date.today())
        hasta = attrs.get('hasta', getattr(self.instance, 'hasta', None))
        if hasta and desde and hasta < desde:
            raise ValidationError({'hasta': 'La fecha de fin no puede ser anterior a la de inicio.'})
        if self.instance is None and hasta and hasta < date.today():
            raise ValidationError({'hasta': 'La vigencia ya habría vencido.'})
        return attrs


class AjustePresupuestoSerializer(ModelSerializer):
    usuario_info = UsuarioResumenSerializer(source='usuario', read_only=True)

    class Meta:
        model = AjustePresupuesto
        fields = [
            'ajuste_ID', 'proyecto', 'tarea', 'tipo', 'monto', 'motivo',
            'usuario', 'aprobado_por', 'fecha', 'usuario_info',
        ]
        read_only_fields = ['ajuste_ID', 'fecha', 'usuario', 'aprobado_por']

    def validate_monto(self, value):
        if value is None or value <= 0:
            raise ValidationError('El monto debe ser mayor a cero.')
        return value

    def validate_motivo(self, value):
        value = (value or '').strip()
        if not value:
            raise ValidationError('El motivo es obligatorio.')
        return value

    def validate(self, attrs):
        proyecto = attrs.get('proyecto')
        tarea = attrs.get('tarea')
        if not proyecto and not tarea:
            raise ValidationError('Debe asociarse a un proyecto o a una tarea.')
        if proyecto and tarea and tarea.proyecto_ID_id != proyecto.proyect_ID:
            raise ValidationError('La tarea no pertenece al proyecto indicado.')
        return attrs
