import cloudinary.uploader
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password, check_password
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from .models import Roles, Users
from .serializers import RolesSerializer, UsersSerializer


class RolesViewSet(ModelViewSet):
    queryset = Roles.objects.all()
    serializer_class = RolesSerializer
    permission_classes = [IsAuthenticated]


class UsersViewSet(ModelViewSet):
    queryset = Users.objects.all()
    serializer_class = UsersSerializer
    permission_classes = [IsAuthenticated]


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(username=email, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)
            refresh['role'] = user.role.name
            refresh['user_photo'] = user.user_photo

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'role': str(user.role.name),
                'user_photo': str(user.user_photo),
                'user_ID': str(user.user_ID),
            })
        else:
            return Response({'error': 'Credenciales incorrectas'}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_user_photo(request, user_id):
    file = request.FILES.get('image')
    if not file:
        return Response({'error': 'No se proporcionó ninguna imagen.'}, status=400)

    try:
        user = Users.objects.get(user_ID=user_id)
    except Users.DoesNotExist:
        return Response({'error': 'Usuario no encontrado.'}, status=404)

    if user.user_photo:
        old_public_id = user.user_photo.split('/')[-1].split('.')[0]
        try:
            cloudinary.uploader.destroy(f'munimanagement/usuarios/{old_public_id}')
        except Exception:
            pass

    result = cloudinary.uploader.upload(file, folder='munimanagement/usuarios')
    user.user_photo = result['secure_url']
    user.save()
    return Response({'user_photo': result['secure_url']})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')

    if not check_password(current_password, user.password):
        return Response({'error': 'Contraseña actual incorrecta'}, status=400)

    if len(new_password) < 8:
        return Response({'error': 'La nueva contraseña debe tener al menos 8 caracteres'}, status=400)

    user.password = make_password(new_password)
    user.save()
    return Response({'message': 'Contraseña actualizada correctamente'})
