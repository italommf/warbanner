from rest_framework import serializers
from django.contrib.auth.models import User
from api.models import UserProfile
from .models import UploadedImage

class UploadedImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedImage
        fields = ['id', 'user', 'image', 'status', 'created_at']

class UserProfileStatsSerializer(serializers.ModelSerializer):
    pvp_classes = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            'game_rank_idx',
            'pvp_em', 'pvp_win_rate', 'pvp_matches', 'pvp_hours', 'pvp_best_rank_rp', 'pvp_best_rank_name', 'pvp_classes',
            'pve_em', 'pve_win_rate', 'pve_matches', 'pve_mission_easy', 'pve_mission_medium', 'pve_mission_hard', 'pve_hours', 'pve_classes'
        ]

    def get_pvp_classes(self, obj):
        data = obj.pvp_classes
        # Se for uma lista, retorna como está (novo formato)
        if isinstance(data, list):
            return data
        
        # Se for um dicionário (formato antigo), converte para lista
        if isinstance(data, dict):
            # Mapeia cores para as classes
            colors = {
                "Fuzileiro": "#4a90e2", "Médico": "#50e3c2", 
                "Engenheiro": "#f5a623", "Franco-atirador": "#d0021b"
            }
            results = []
            for name, stats in data.items():
                results.append({
                    "name": name.capitalize(),
                    "color": colors.get(name.capitalize(), "#ffffff"),
                    "em": stats.get("kd", 0.0),
                    "winRate": stats.get("win_rate", 0.0),
                    "hours": stats.get("time_hours", 0)
                })
            return results
            
        return []

class UserStatsSerializer(serializers.Serializer):
    total_images = serializers.IntegerField()
    stats = UserProfileStatsSerializer()
