from rest_framework import serializers
from .models import Banner


class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = ['id', 'nick', 'clan', 'marca', 'insignia', 'fita', 'patente', 'created_at']
        read_only_fields = ['id', 'created_at']


class CommunityBannerSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    avatar   = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = ['id', 'nick', 'clan', 'marca', 'insignia', 'fita', 'patente', 'created_at', 'username', 'avatar']

    def get_avatar(self, obj):
        try:
            discord = getattr(obj.user, 'discord', None)
            return discord.avatar if discord else None
        except Exception:
            return None
