import uuid
from django.core.validators import MinValueValidator
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

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['fecha_entrega']),
            models.Index(fields=['user_ID', 'fecha_entrega']),
            models.Index(fields=['departamento_ID', 'estado_ID']),
            models.Index(fields=['es_publico']),
        ]


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
