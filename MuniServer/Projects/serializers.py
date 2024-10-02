from rest_framework.serializers import ModelSerializer
from .models import Estado, Prioridad, Tipos, Proyectos, Proyectos_tipos

class EstadoSerializer(ModelSerializer):
    class Meta:
        model = Estado
        fields = '__all__'

class PrioridadSerializer(ModelSerializer):
    class Meta:
        model = Prioridad
        fields = '__all__'

class TiposSerializer(ModelSerializer):
    class Meta:
        model = Tipos
        fields = '__all__'

class ProyectosSerializer(ModelSerializer):
    class Meta:
        model = Proyectos
        fields = '__all__'

class ProyectosTiposSerializer(ModelSerializer):
    class Meta:
        model = Proyectos_tipos
        fields = '__all__'
