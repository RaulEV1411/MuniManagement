
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from .models import Roles, Users
from .serializers import RolesSerializer, UsersSerializer
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password

# ModelViewSets para Roles y Users
class RolesViewSet(ModelViewSet):
    queryset = Roles.objects.all()
    serializer_class = RolesSerializer
    authentication_classes = [SessionAuthentication]

class UsersViewSet(ModelViewSet):
    queryset = Users.objects.all()
    serializer_class = UsersSerializer
    authentication_classes = [SessionAuthentication]

class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        # user = Users.objects.get(email= email)
        # print(user)
        user = authenticate(username=email,password=password)
        
        if user is not None:
            token, created = Token.objects.get_or_create(user= user)
            return Response({'token': token.key})
        else:
            return Response({'error': 'Credenciales incorrectas'}, status=400)