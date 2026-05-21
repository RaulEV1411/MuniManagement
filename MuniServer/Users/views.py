import cloudinary.uploader
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
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
from .permissions import UsersPermission, RolesPermission, _role_name, _role_flag, ROLES_ADMIN, ROLES_JEFES
from Projects.permissions import SystemRecordReadOnly


class RolesViewSet(ModelViewSet):
    queryset = Roles.objects.all()
    serializer_class = RolesSerializer
    permission_classes = [IsAuthenticated, RolesPermission, SystemRecordReadOnly]


class UsersViewSet(ModelViewSet):
    serializer_class = UsersSerializer
    permission_classes = [IsAuthenticated, UsersPermission]

    def get_queryset(self):
        user = self.request.user
        rol = _role_name(user)
        ver_todo = _role_flag(user, 'puede_ver_todo')
        if rol in ROLES_ADMIN or ver_todo or rol in ROLES_JEFES:
            return Users.objects.all().select_related('role', 'departamento_ID')
        # Funcionarios solo se ven a sí mismos
        return Users.objects.filter(user_ID=user.user_ID).select_related('role', 'departamento_ID')


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(username=email, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)
            refresh['role'] = user.role.name if user.role else ''
            refresh['user_photo'] = user.user_photo or ''
            refresh['first_name'] = user.first_name
            refresh['last_name'] = user.last_name
            refresh['email'] = user.email
            access = refresh.access_token
            access['role'] = user.role.name if user.role else ''
            access['user_photo'] = user.user_photo or ''
            access['first_name'] = user.first_name
            access['last_name'] = user.last_name
            access['email'] = user.email

            return Response({
                'refresh': str(refresh),
                'access': str(access),
                'role': user.role.name if user.role else '',
                'user_photo': user.user_photo or '',
                'user_ID': str(user.user_ID),
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'onboarding_completado': bool(user.onboarding_completado),
            })
        return Response({'error': 'Credenciales incorrectas'}, status=400)


class LogoutView(APIView):
    """Revoca el refresh token mediante blacklist."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.data.get('refresh')
        if not refresh:
            return Response({'error': 'refresh es requerido'}, status=400)
        try:
            token = RefreshToken(refresh)
            token.blacklist()
        except TokenError:
            return Response({'error': 'Token inválido o ya revocado'}, status=400)
        return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    return Response({
        'user_ID': str(user.user_ID),
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'role': user.role.name if user.role_id else '',
        'role_flags': {
            'puede_delegar': bool(getattr(user.role, 'puede_delegar', False)),
            'puede_recibir_delegacion': bool(getattr(user.role, 'puede_recibir_delegacion', False)),
            'puede_ver_todo': bool(getattr(user.role, 'puede_ver_todo', False)),
        },
        'user_photo': user.user_photo or '',
        'departamento_ID': str(user.departamento_ID_id) if user.departamento_ID_id else '',
        'onboarding_completado': bool(user.onboarding_completado),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def completar_onboarding(request):
    user = request.user
    user.onboarding_completado = True
    user.save(update_fields=['onboarding_completado'])
    return Response({'onboarding_completado': True})


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

    if request.user.user_ID != user.user_ID and getattr(request.user.role, 'name', '') not in {'Alcalde', 'Vicealcalde'}:
        return Response({'error': 'No tienes permisos para modificar esta foto.'}, status=403)

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
