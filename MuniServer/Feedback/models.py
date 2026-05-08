import uuid
from django.db import models
from django.utils import timezone
from Projects.models import Proyectos

class Feedback(models.Model):
    feed_ID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proyecto_ID = models.ForeignKey(Proyectos, on_delete=models.CASCADE)
    user_ID = models.ForeignKey('Users.Users', null=True, blank=True, on_delete=models.SET_NULL)
    info = models.CharField(max_length=500)
    created_at = models.DateTimeField(default=timezone.now)



