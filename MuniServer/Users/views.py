from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from .models import Roles, Users
from .serializers import RolesSerializer, UsersSerializer
from rest_framework.views import APIView
from django.contrib.auth import authenticate

# ModelViewSets para Roles y Users
class RolesViewSet(ModelViewSet):
    queryset = Roles.objects.all()
    serializer_class = RolesSerializer
    authentication_classes = [SessionAuthentication]

class UsersViewSet(ModelViewSet):
    queryset = Users.objects.all()
    serializer_class = UsersSerializer

class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(username=email,password=password)
        
        if user is not None:
            refresh = RefreshToken.for_user(user)
            refresh['role'] = user.role.name
            
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'role': str(user.role.name),
                'user_ID': str(user.user_ID), 
            })
        else:
            return Response({'error': 'Credenciales incorrectas'}, status=400)