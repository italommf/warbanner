from rest_framework import status, serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import BasicAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import UserProfile

class WarchaosMigrationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'username', 'email', 'game_nick', 'game_clan', 
            'pvp_em', 'pvp_win_rate', 'pvp_matches', 'pvp_hours', 'pvp_best_rank_rp', 'pvp_best_rank_name',
            'pve_em', 'pve_win_rate', 'pve_matches', 'pve_mission_easy', 'pve_mission_medium', 'pve_mission_hard', 'pve_hours',
            'pvp_classes', 'pve_classes',
            'my_marcas', 'my_insignias', 'my_fitas',
            'warchaos_user', 'warchaos_nick',
            'warchaos_solicitou', 'warchaos_migrado'
        ]

@api_view(['GET', 'POST'])
@authentication_classes([BasicAuthentication])
@permission_classes([IsAuthenticated]) # Ensure it's a valid user, maybe IsAdminUser if we want restrict it more, but request said Basic Auth.
def warchaos_migration_api(request):
    """
    API for Warchaos consultation.
    GET: Returns all users who requested migration.
    POST: Updates migration status for a specific user.
    """
    if request.method == 'GET':
        # Return all users who requested migration
        profiles = UserProfile.objects.filter(warchaos_solicitou=True).select_related('user')
        serializer = WarchaosMigrationSerializer(profiles, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Update migration status
        # Expected: { "username": "...", "email": "...", "Migrado": true }
        username = request.data.get('username')
        email = request.data.get('email')
        migrado = request.data.get('Migrado') or request.data.get('migrado')

        if not username or not email:
            return Response({"error": "Username and Email are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=username, email=email)
            profile = user.profile
            if migrado is not None:
                profile.warchaos_migrado = bool(migrado)
                profile.save()
                return Response({"message": f"User {username} migration status updated to {profile.warchaos_migrado}."}, status=status.HTTP_200_OK)
            return Response({"error": "Migrado key missing."}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

from django.utils import timezone

@api_view(['POST'])
@permission_classes([IsAuthenticated]) # This one uses JWT as usual for the frontend
def request_warchaos_migration(request):
    """
    Endpoint for users to request migration via the frontend.
    """
    profile = request.user.profile
    if profile.warchaos_migrado:
        return Response({"error": "Sua conta já foi migrada para o Warchaos."}, status=status.HTTP_400_BAD_REQUEST)
    
    wc_user = request.data.get('warchaos_user', '').strip()
    wc_nick = request.data.get('warchaos_nick', '').strip()

    if not wc_user or not wc_nick:
        return Response({"error": "Usuário e Nick no WarChaos são obrigatórios."}, status=status.HTTP_400_BAD_REQUEST)

    profile.warchaos_solicitou = True
    profile.warchaos_solicitou_at = timezone.now()
    profile.warchaos_user = wc_user
    profile.warchaos_nick = wc_nick
    profile.save()
    return Response({"message": "Solicitação de migração enviada com sucesso!"})
