import uuid
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from Departments.models import Departamentos
from Users.models import Users


# Cada estado cae en una de tres categorías: las pestañas de Proyectos y Reportes, y la regla de
# cierre (a un estado finalizado se llega solo cerrando el proyecto, y de ahí se sale reabriéndolo).
ACTIVO = 'activo'
PAUSADO = 'pausado'
FINALIZADO = 'finalizado'
CATEGORIAS_DE_ESTADO = [(ACTIVO, 'Activo'), (PAUSADO, 'Pausado'), (FINALIZADO, 'Finalizado')]


class Estado(models.Model):
    estado_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default='#64748b')
    orden = models.IntegerField(default=0)
    is_system = models.BooleanField(default=False)
    categoria = models.CharField(max_length=12, choices=CATEGORIAS_DE_ESTADO, default=ACTIVO)

    class Meta:
        ordering = ['orden', 'name']


class Prioridad(models.Model):
    prioridad_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default='#64748b')
    orden = models.IntegerField(default=0)
    is_system = models.BooleanField(default=False)

    class Meta:
        ordering = ['orden', 'name']


class Tipos(models.Model):
    tipos_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)


class TareaPlantilla(models.Model):
    """Una tarea que trae un tipo de proyecto: se crea sola al crear un proyecto de ese tipo."""
    plantilla_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tipo = models.ForeignKey(Tipos, on_delete=models.CASCADE, related_name='plantillas')
    nombre = models.CharField(max_length=50)
    descripcion = models.CharField(max_length=255, blank=True, default='')
    # A cuántos días del inicio del proyecto empieza, y cuántos días dura.
    dias_desde_inicio = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(3650)])
    duracion_dias = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(3650)])
    # Los pasos de su lista de verificación.
    pasos = models.JSONField(default=list, blank=True)
    orden = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['orden', 'dias_desde_inicio', 'nombre']


class FuenteFinanciamiento(models.Model):
    fuente_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80, unique=True)

    class Meta:
        ordering = ['name']


class Proyectos(models.Model):
    proyect_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    departamento_ID = models.ForeignKey(Departamentos, on_delete=models.PROTECT)
    estado_ID = models.ForeignKey(Estado, on_delete=models.PROTECT)
    prioridad_ID = models.ForeignKey(Prioridad, on_delete=models.PROTECT)
    user_ID = models.ForeignKey(Users, on_delete=models.PROTECT)
    name = models.CharField(max_length=50)
    descripcion = models.CharField(max_length=255)
    fecha_inicio = models.DateField()
    fecha_entrega = models.DateField()
    costo = models.IntegerField()
    es_publico = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    # Los proyectos no se borran: el Administrador archiva los cerrados y salen de las listas.
    archivado = models.BooleanField(default=False)
    archivado_en = models.DateTimeField(null=True, blank=True)
    archivado_por = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    # Ficha: todo opcional. El código (o expediente) no se repite; sin código queda en NULL, que
    # MySQL y SQLite no cuentan como repetido (MySQL no admite restricciones únicas con condición).
    codigo = models.CharField(max_length=40, null=True, blank=True, unique=True)
    numero_sicop = models.CharField(max_length=40, blank=True, default='')
    fuente_financiamiento = models.ForeignKey(FuenteFinanciamiento, on_delete=models.PROTECT, null=True, blank=True, related_name='proyectos')
    distrito = models.CharField(max_length=80, blank=True, default='')
    latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True,
                                  validators=[MinValueValidator(-90), MaxValueValidator(90)])
    longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True,
                                   validators=[MinValueValidator(-180), MaxValueValidator(180)])
    objetivo = models.TextField(max_length=1000, blank=True, default='')
    beneficiarios = models.PositiveIntegerField(null=True, blank=True)
    # [{nombre, unidad, meta, logrado}]
    indicadores = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['fecha_entrega']),
            models.Index(fields=['user_ID', 'fecha_entrega']),
            models.Index(fields=['departamento_ID', 'estado_ID']),
            models.Index(fields=['es_publico']),
        ]


class HitoProyecto(models.Model):
    """Un hito del proyecto: se cumple cuando se anota la fecha real."""
    hito_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(Proyectos, on_delete=models.CASCADE, related_name='hitos')
    nombre = models.CharField(max_length=120)
    descripcion = models.CharField(max_length=255, blank=True, default='')
    fecha_prevista = models.DateField()
    fecha_real = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['fecha_prevista', 'nombre']


class RiesgoProyecto(models.Model):
    NIVELES = [(1, 'Baja'), (2, 'Media'), (3, 'Alta')]
    ESTADOS = [('abierto', 'Abierto'), ('mitigado', 'Mitigado'), ('ocurrido', 'Ocurrió'), ('cerrado', 'Cerrado')]

    riesgo_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(Proyectos, on_delete=models.CASCADE, related_name='riesgos')
    descripcion = models.CharField(max_length=255)
    probabilidad = models.PositiveSmallIntegerField(choices=NIVELES, default=2)
    impacto = models.PositiveSmallIntegerField(choices=NIVELES, default=2)
    mitigacion = models.TextField(max_length=1000, blank=True, default='')
    responsable = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    estado = models.CharField(max_length=10, choices=ESTADOS, default='abierto')
    creado_por = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, related_name='+')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']

    @property
    def nivel(self):
        """De 1 a 9: probabilidad por impacto."""
        return self.probabilidad * self.impacto


class ProjectImage(models.Model):
    imagen_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(Proyectos, on_delete=models.CASCADE, related_name='images')
    url = models.TextField()
    public_id = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)


class Proyectos_tipos(models.Model):
    proyecto = models.ForeignKey(Proyectos, on_delete=models.CASCADE)
    tipo = models.ForeignKey(Tipos, on_delete=models.PROTECT)


class RolProyecto(models.Model):
    """Rol dentro de un proyecto (Responsable, Supervisor, …): qué permisos da solo en ese proyecto."""
    rol_proyecto_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.CharField(max_length=255, blank=True, default='')
    permisos = models.JSONField(default=list, blank=True)
    is_system = models.BooleanField(default=False)
    orden = models.IntegerField(default=0)

    class Meta:
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre


class MiembroProyecto(models.Model):
    """Una persona en el equipo de un proyecto, con su rol y su vigencia (desde/hasta)."""
    miembro_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(Proyectos, on_delete=models.CASCADE, related_name='miembros')
    usuario = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='membresias')
    rol = models.ForeignKey(RolProyecto, on_delete=models.PROTECT, related_name='miembros')
    desde = models.DateField(default=timezone.localdate)
    hasta = models.DateField(null=True, blank=True)
    motivo = models.CharField(max_length=255, blank=True, default='')
    otorgado_por = models.ForeignKey(Users, null=True, blank=True, on_delete=models.SET_NULL, related_name='membresias_otorgadas')
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    revocado_en = models.DateTimeField(null=True, blank=True)
    revocado_por = models.ForeignKey(Users, null=True, blank=True, on_delete=models.SET_NULL, related_name='membresias_revocadas')

    class Meta:
        ordering = ['-creado_en']
        indexes = [models.Index(fields=['usuario', 'activo']), models.Index(fields=['proyecto', 'activo'])]


class AjustePresupuesto(models.Model):
    TIPO_CHOICES = [
        ('aumento', 'Aumento'),
        ('rebajo', 'Rebajo'),
    ]
    ajuste_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(
        Proyectos, on_delete=models.CASCADE, null=True, blank=True, related_name='ajustes_presupuesto'
    )
    tarea = models.ForeignKey(
        'Task.Tareas', on_delete=models.CASCADE, null=True, blank=True, related_name='ajustes_presupuesto'
    )
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    monto = models.IntegerField(validators=[MinValueValidator(1)])
    motivo = models.TextField()
    usuario = models.ForeignKey(Users, on_delete=models.PROTECT, related_name='ajustes_creados')
    aprobado_por = models.ForeignKey(
        Users, on_delete=models.SET_NULL, null=True, blank=True, related_name='ajustes_aprobados'
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(monto__gt=0),
                name='ajuste_monto_positivo',
            ),
            models.CheckConstraint(
                condition=models.Q(proyecto__isnull=False) | models.Q(tarea__isnull=False),
                name='ajuste_requiere_proyecto_o_tarea',
            ),
        ]


class CierreProyecto(models.Model):
    """El cierre de un proyecto: cómo terminó, cuándo, cuánto costó y qué se aprendió.
    Si se reabre, el cierre queda con quién y por qué; un nuevo cierre agrega otro."""

    cierre_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(Proyectos, on_delete=models.CASCADE, related_name='cierres')
    estado = models.ForeignKey(Estado, on_delete=models.PROTECT, related_name='+')
    fecha_fin_real = models.DateField()
    costo_real = models.PositiveIntegerField()
    motivo = models.TextField()
    lecciones = models.TextField(blank=True, default='')
    cerrado_por = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, related_name='+')
    cerrado_en = models.DateTimeField(default=timezone.now)
    reabierto_en = models.DateTimeField(null=True, blank=True)
    reabierto_por = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    motivo_reapertura = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-cerrado_en']


class DocumentoProyecto(models.Model):
    """Documentos del proyecto (PDF o imagen). El acta de cierre va unida a su cierre."""

    TIPOS = [
        ('acta', 'Acta'), ('plano', 'Plano'), ('factura', 'Factura'), ('contrato', 'Contrato'),
        ('informe', 'Informe'), ('foto', 'Foto'), ('otro', 'Otro'),
    ]

    documento_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto = models.ForeignKey(Proyectos, on_delete=models.CASCADE, related_name='documentos')
    # Si es de una tarea; si no, es del proyecto.
    tarea = models.ForeignKey('Task.Tareas', on_delete=models.CASCADE, null=True, blank=True, related_name='documentos')
    cierre = models.ForeignKey(CierreProyecto, on_delete=models.SET_NULL, null=True, blank=True, related_name='documentos')
    tipo = models.CharField(max_length=10, choices=TIPOS, default='otro')
    nombre = models.CharField(max_length=120)
    url = models.TextField()
    public_id = models.CharField(max_length=255)
    subido_por = models.ForeignKey(Users, on_delete=models.SET_NULL, null=True, related_name='+')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']
