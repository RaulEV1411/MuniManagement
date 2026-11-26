from django.core.validators import RegexValidator
from django.db import models

COLOR = RegexValidator(r'^#[0-9a-fA-F]{6}$', 'Use un color en formato #RRGGBB.')
MONEDA = RegexValidator(r'^[A-Z]{3}$', 'Use el código ISO de la moneda, por ejemplo CRC o USD.')


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
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'configuración'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    SIMBOLOS = {'CRC': '₡', 'USD': '$', 'EUR': '€', 'GTQ': 'Q', 'HNL': 'L', 'NIO': 'C$', 'PAB': 'B/.', 'MXN': '$', 'COP': '$', 'DOP': 'RD$'}

    def monto(self, valor):
        """Un monto con la moneda de la instalación, para avisos y correos (en la app lo hace Intl)."""
        return f"{self.SIMBOLOS.get(self.moneda, self.moneda + ' ')}{int(valor):,}".replace(',', ' ')

    @classmethod
    def actual(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
