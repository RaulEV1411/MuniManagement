import uuid  # Importa el módulo uuid, que permite generar identificadores únicos (UUIDs).
from django.db import models  # Importa las herramientas de modelos de Django para crear clases de modelo.
from Projects.models import Proyectos, Estado, Prioridad  # Importa modelos externos de Proyectos, Estado y Prioridad para usarlos en relaciones de clave externa.

class Tareas(models.Model):  # Define la clase Tareas como un modelo de Django, que representará una tabla en la base de datos.
    tareas_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # tareas_ID es la clave primaria de la tabla, generada automáticamente como un UUID único e ineditable.
    prioridad_ID = models.ForeignKey(Prioridad, on_delete=models.CASCADE)
    # prioridad_ID es una clave externa que referencia al modelo Prioridad; si se elimina un registro de Prioridad, también se eliminarán sus tareas asociadas.
    estado_ID = models.ForeignKey(Estado, on_delete=models.CASCADE)
    # estado_ID es una clave externa que referencia al modelo Estado; al eliminar un estado, se eliminarán sus tareas relacionadas.
    proyecto_ID = models.ForeignKey(Proyectos, on_delete=models.CASCADE)
    # proyecto_ID es una clave externa que referencia al modelo Proyectos; si se elimina un proyecto, se eliminan también sus tareas asociadas.
    name = models.CharField(max_length=50)
    # name es un campo de texto con un límite de 50 caracteres, que almacena el nombre de la tarea.
    descripcion = models.CharField(max_length=255, unique=True)
    # descripcion es un campo de texto con un límite de 255 caracteres, que almacena una descripción única para cada tarea.
    fecha_inicio = models.DateField()
    # fecha_inicio almacena la fecha de inicio de la tarea, usando el tipo de campo de fecha de Django.
    fecha_entrega = models.DateField()
    # fecha_entrega almacena la fecha de entrega de la tarea, también usando el tipo de campo de fecha.
    task_photo = models.TextField(null=True)
    # task_photo es un campo de texto que puede almacenar la URL o referencia de una foto de la tarea; permite valores nulos.
