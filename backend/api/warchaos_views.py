from rest_framework import status, serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import BasicAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import UserProfile

class WarchaosMigrationSerializer(serializers.ModelSerializer):
    usuario = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    nick_warface = serializers.CharField(source='game_nick', read_only=True)
    cla_warface = serializers.CharField(source='game_clan', read_only=True)
    
    # Stats Renaming
    pvp_em = serializers.FloatField(read_only=True)
    pvp_taxa_vitoria = serializers.IntegerField(source='pvp_win_rate', read_only=True)
    pvp_partidas = serializers.IntegerField(source='pvp_matches', read_only=True)
    pvp_horas = serializers.IntegerField(source='pvp_hours', read_only=True)
    pvp_melhor_rank_pontos = serializers.IntegerField(source='pvp_best_rank_rp', read_only=True)
    pvp_melhor_rank_nome = serializers.CharField(source='pvp_best_rank_name', read_only=True)
    
    pve_em = serializers.FloatField(read_only=True)
    pve_taxa_vitoria = serializers.IntegerField(source='pve_win_rate', read_only=True)
    pve_partidas = serializers.IntegerField(source='pve_matches', read_only=True)
    pve_missao_facil = serializers.IntegerField(source='pve_mission_easy', read_only=True)
    pve_missao_normal = serializers.IntegerField(source='pve_mission_medium', read_only=True)
    pve_missao_dificil = serializers.IntegerField(source='pve_mission_hard', read_only=True)
    pve_horas = serializers.IntegerField(source='pve_hours', read_only=True)
    
    estatisticas_classes_pvp = serializers.JSONField(source='pvp_classes', read_only=True)
    estatisticas_classes_pve = serializers.JSONField(source='pve_classes', read_only=True)

    desafios = serializers.SerializerMethodField()
    
    usuario_warchaos = serializers.CharField(source='warchaos_user', read_only=True)
    nick_warchaos = serializers.CharField(source='warchaos_nick', read_only=True)
    solicitou_migracao = serializers.BooleanField(source='warchaos_solicitou', read_only=True)
    migrado_para_warchaos = serializers.BooleanField(source='warchaos_migrado', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'usuario', 'email', 'nick_warface', 'cla_warface', 
            'pvp_em', 'pvp_taxa_vitoria', 'pvp_partidas', 'pvp_horas', 'pvp_melhor_rank_pontos', 'pvp_melhor_rank_nome',
            'pve_em', 'pve_taxa_vitoria', 'pve_partidas', 'pve_missao_facil', 'pve_missao_normal', 'pve_missao_dificil', 'pve_horas',
            'estatisticas_classes_pvp', 'estatisticas_classes_pve',
            'desafios',
            'usuario_warchaos', 'nick_warchaos',
            'solicitou_migracao', 'migrado_para_warchaos'
        ]

    def get_desafios(self, obj):
        return {
            'marcas': obj.my_marcas,
            'insignias': obj.my_insignias,
            'fitas': obj.my_fitas
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # Define groupings
        pvp_keys = [
            'pvp_em', 'pvp_taxa_vitoria', 'pvp_partidas', 'pvp_horas', 
            'pvp_melhor_rank_pontos', 'pvp_melhor_rank_nome'
        ]
        pve_keys = [
            'pve_em', 'pve_taxa_vitoria', 'pve_partidas', 'pve_missao_facil', 
            'pve_missao_normal', 'pve_missao_dificil', 'pve_horas'
        ]
        
        # Build the final structure
        return {
            'warbanner': {
                'usuario': representation['usuario'],
                'email': representation['email'],
                'nick_warface': representation['nick_warface'],
                'cla_warface': representation['cla_warface'],
                'pvp': {key: representation[key] for key in pvp_keys},
                'pve': {key: representation[key] for key in pve_keys},
                'estatisticas_classes': {
                    'pvp': representation['estatisticas_classes_pvp'],
                    'pve': representation['estatisticas_classes_pve']
                },
                'desafios': representation['desafios']
            },
            'warchaos': {
                'usuario_warchaos': representation['usuario_warchaos'],
                'nick_warchaos': representation['nick_warchaos'],
                'solicitou_migracao': representation['solicitou_migracao'],
                'migrado_para_warchaos': representation['migrado_para_warchaos']
            }
        }

@api_view(['GET', 'POST'])
@authentication_classes([BasicAuthentication])
@permission_classes([IsAdminUser])
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
        # Expected: { "usuario_warchaos": "...", "nick_warchaos": "...", "migrado_para_warchaos": true }
        usuario_wc = request.data.get('usuario_warchaos')
        nick_wc = request.data.get('nick_warchaos')
        migrado = request.data.get('migrado_para_warchaos')

        if not usuario_wc:
            return Response({
                "error": "O campo 'usuario_warchaos' é obrigatório.",
                "code": "MISSING_USUARIO_WARCHAOS"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not nick_wc:
            return Response({
                "error": "O campo 'nick_warchaos' é obrigatório.",
                "code": "MISSING_NICK_WARCHAOS"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = UserProfile.objects.get(warchaos_user=usuario_wc, warchaos_nick=nick_wc)
            
            if migrado is None:
                return Response({
                    "error": "A chave 'migrado_para_warchaos' é obrigatória.",
                    "code": "MISSING_MIGRADO_KEY"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not isinstance(migrado, bool):
                return Response({
                    "error": "O valor de 'migrado_para_warchaos' deve ser um booleano (true ou false).",
                    "code": "INVALID_BOOLEAN_TYPE"
                }, status=status.HTTP_400_BAD_REQUEST)

            profile.warchaos_migrado = migrado
            profile.save()
            return Response({
                "success": True,
                "message": f"Status de migração do usuário {usuario_wc} ({nick_wc}) atualizado para {profile.warchaos_migrado}.",
                "status_atual": profile.warchaos_migrado
            }, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response({
                "error": "Nenhuma solicitação de migração foi encontrada com este Usuário e Nick vinculados.",
                "code": "MIGRATION_REQUEST_NOT_FOUND"
            }, status=status.HTTP_404_NOT_FOUND)

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
