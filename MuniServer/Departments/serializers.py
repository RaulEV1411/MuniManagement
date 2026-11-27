from rest_framework.serializers import ModelSerializer, ValidationError
from .models import Direccion, Departamentos

MAX_METAS = 20
CAMPOS_DE_UNIDAD = ['codigo', 'descripcion', 'suplente', 'presupuesto_anual', 'correo', 'telefono', 'metas']


class DatosDeUnidadSerializer(ModelSerializer):
    """Validaciones comunes de direcciones y departamentos."""

    def validate_codigo(self, valor):
        valor = (valor or '').strip()
        if not valor:
            return None
        otros = self.Meta.model.objects.filter(codigo__iexact=valor)
        if self.instance is not None:
            otros = otros.exclude(pk=self.instance.pk)
        if otros.exists():
            raise ValidationError('Ya hay otra con ese código.')
        return valor

    def validate_metas(self, valor):
        if not isinstance(valor, list) or len(valor) > MAX_METAS:
            raise ValidationError(f'Las metas van como una lista de hasta {MAX_METAS}.')
        metas = ['' if m is None else str(m).strip() for m in valor]
        if any(len(m) > 200 for m in metas):
            raise ValidationError('Cada meta tiene hasta 200 caracteres.')
        return [m for m in metas if m]

    def validate_telefono(self, valor):
        return valor.strip()

    def validate(self, datos):
        datos = super().validate(datos)
        suplente = datos.get('suplente', getattr(self.instance, 'suplente', None))
        jefe = datos.get('jefe', getattr(self.instance, 'jefe', None))
        if suplente is not None and 'suplente' in datos and not suplente.is_active:
            raise ValidationError({'suplente': 'La persona suplente tiene que estar activa.'})
        if suplente is not None and jefe is not None and suplente.pk == jefe.pk:
            raise ValidationError({'suplente': 'La jefatura y la suplencia tienen que ser personas distintas.'})
        return datos


class DireccionSerializer(DatosDeUnidadSerializer):
    class Meta:
        model = Direccion
        fields = ['direccion_ID', 'name', 'jefe', *CAMPOS_DE_UNIDAD]
        extra_kwargs = {'codigo': {'validators': []}}


class DepartamentosSerializer(DatosDeUnidadSerializer):
    class Meta:
        model = Departamentos
        fields = ['departamentos_ID', 'name', 'direccion', 'jefe', *CAMPOS_DE_UNIDAD]
        extra_kwargs = {'codigo': {'validators': []}}


class DepartamentoResumenSerializer(ModelSerializer):
    """El departamento dentro de cada proyecto: sin presupuesto, contacto ni metas."""

    class Meta:
        model = Departamentos
        fields = ['departamentos_ID', 'name', 'direccion', 'jefe']
        read_only_fields = fields
