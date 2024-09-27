import uuid
from django.db import models
from Projects.models import Proyectos

class Feedback(models.Model):
    feed_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto_ID = models.ForeignKey(Proyectos, on_delete=models.CASCADE)
    info = models.CharField(max_length=255, unique=True)
