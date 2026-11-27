from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models

COLOR = RegexValidator(r'^#[0-9a-fA-F]{6}$', 'Use un color en formato #RRGGBB.')
MONEDA = RegexValidator(r'^[A-Z]{3}$', 'Use el código ISO de la moneda, por ejemplo CRC o USD.')


# Licencias para los datos abiertos del portal: (código, nombre, URL).
LICENCIAS = [
    ('CC-BY-4.0', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/deed.es'),
    ('CC0-1.0', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/deed.es'),
    ('ODbL-1.0', 'ODbL 1.0', 'https://opendatacommons.org/licenses/odbl/1-0/'),
]


class Configuracion(models.Model):
    """Identidad de la instalación (una por municipalidad): un solo registro, el de pk=1."""

    nombre = models.CharField(max_length=120, default='Municipalidad')
    ubicacion = models.CharField(max_length=120, blank=True, default='')
    logo = models.CharField(max_length=255, blank=True, default='')
    color_primario = models.CharField(max_length=7, default='#0C3857', validators=[COLOR])
    color_acento = models.CharField(max_length=7, default='#F3951B', validators=[COLOR])
    correo_soporte = models.EmailField(blank=True, default='')
    telefono_soporte = models.CharField(max_length=40, blank=True, default='')
    horario_soporte = models.CharField(max_length=80, blank=True, default='')
    moneda = models.CharField(max_length=3, default='CRC', validators=[MONEDA])
    # Los distritos del cantón, para la ubicación de los proyectos. Vacío: se escribe a mano.
    distritos = models.JSONField(default=list, blank=True)
    # Dónde abre el mapa (portal y ficha) cuando no hay puntos que mostrar. Sin centro, se ajusta a los puntos.
    mapa_latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True,
                                       validators=[MinValueValidator(-90), MaxValueValidator(90)])
    mapa_longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True,
                                        validators=[MinValueValidator(-180), MaxValueValidator(180)])
    mapa_zoom = models.PositiveSmallIntegerField(default=13, validators=[MinValueValidator(1), MaxValueValidator(18)])
    licencia_datos = models.CharField(max_length=12, choices=[(c, n) for c, n, _ in LICENCIAS], default='CC-BY-4.0')
    # Cuánto se conservan los registros de auditoría y las sesiones cerradas (de 6 meses a 10 años).
    retencion_auditoria_dias = models.PositiveIntegerField(
        default=1825, validators=[MinValueValidator(180), MaxValueValidator(3650)],
    )
    # Aviso de privacidad (Ley 8968): texto propio de la institución y los encargados que tratan datos
    # por su cuenta ({nombre, datos, finalidad, pais}). Cambiar cualquiera sube la versión, y cada
    # persona lo vuelve a aceptar al entrar.
    aviso_privacidad = models.TextField(blank=True, default='')
    encargados = models.JSONField(default=list, blank=True)
    privacidad_version = models.PositiveIntegerField(default=1)
    privacidad_actualizada = models.DateTimeField(null=True, blank=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'configuración'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    SIMBOLOS = {'CRC': '₡', 'USD': '$', 'EUR': '€', 'GTQ': 'Q', 'HNL': 'L', 'NIO': 'C$', 'PAB': 'B/.', 'MXN': '$', 'COP': '$', 'DOP': 'RD$'}

    @property
    def licencia(self):
        """{codigo, nombre, url} de la licencia de los datos abiertos."""
        codigo, nombre, url = next(x for x in LICENCIAS if x[0] == self.licencia_datos)
        return {'codigo': codigo, 'nombre': nombre, 'url': url}

    def monto(self, valor):
        """Un monto con la moneda de la instalación, para avisos y correos (en la app lo hace Intl)."""
        return f"{self.SIMBOLOS.get(self.moneda, self.moneda + ' ')}{int(valor):,}".replace(',', ' ')

    @classmethod
    def actual(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
