from rest_framework import serializers


def _luminancia(hex_color):
    canales = []
    for i in (1, 3, 5):
        c = int(hex_color[i:i + 2], 16) / 255
        canales.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = canales
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste_con_blanco(hex_color):
    return 1.05 / (_luminancia(hex_color) + 0.05)

from .models import Configuracion


class ConfiguracionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Configuracion
        fields = [
            'nombre', 'ubicacion', 'logo', 'color_primario', 'color_acento',
            'correo_soporte', 'telefono_soporte', 'horario_soporte', 'moneda', 'actualizado',
        ]
        read_only_fields = ['logo', 'actualizado']

    def validate_color_primario(self, valor):
        # Se usa de fondo con texto blanco (botones, encabezados): tiene que leerse (WCAG AA, 4,5:1).
        if len(valor) == 7 and valor.startswith('#'):
            contraste = contraste_con_blanco(valor)
            if contraste < 4.5:
                raise serializers.ValidationError(
                    f'Elija un color más oscuro: el texto blanco sobre este color no se lee '
                    f'(contraste {contraste:.1f}:1, mínimo 4,5:1).'
                )
        return valor
