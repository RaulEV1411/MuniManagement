from rest_framework.viewsets import ModelViewSet
from .models import Roles, Users
from .serializers import RolesSerializer, UsersSerializer
from rest_framework.authentication import SessionAuthentication


class RolesViewSet(ModelViewSet):
    queryset = Roles.objects.all()
    serializer_class = RolesSerializer
    authentication_classes = [SessionAuthentication]

class UsersViewSet(ModelViewSet):
    queryset = Users.objects.all()
    serializer_class = UsersSerializer
    authentication_classes = [SessionAuthentication]
