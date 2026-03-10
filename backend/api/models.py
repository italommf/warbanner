import random
from django.db import models
from django.contrib.auth.models import User


_WORDS = ['WOLF', 'HAWK', 'BEAR', 'LION', 'RAVEN', 'CROW', 'VIPER', 'KITE', 'LYNX', 'BULL']


class RecoveryCode(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='recovery_code')
    code = models.CharField(max_length=32, unique=True)

    @staticmethod
    def generate() -> str:
        return (
            f'{random.choice(_WORDS)}-'
            f'{random.randint(1000, 9999)}-'
            f'{random.choice(_WORDS)}-'
            f'{random.randint(1000, 9999)}'
        )

    def __str__(self):
        return f'{self.user.username}: {self.code}'


class UserProfile(models.Model):
    user      = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    game_nick = models.CharField(max_length=50, blank=True)
    game_clan = models.CharField(max_length=50, blank=True)
    game_rank = models.CharField(max_length=50, blank=True)
    game_rank_idx = models.IntegerField(default=0) # Index do rank (0-99)

    # PvP Stats
    pvp_em = models.FloatField(default=0.0, null=True, blank=True)
    pvp_win_rate = models.FloatField(default=0.0, null=True, blank=True)
    pvp_matches = models.IntegerField(default=0, null=True, blank=True)
    pvp_hours = models.IntegerField(default=0, null=True, blank=True)
    pvp_best_rank_rp = models.IntegerField(default=0, null=True, blank=True)
    pvp_best_rank_name = models.CharField(max_length=50, blank=True, null=True)

    # PvE Stats
    pve_em = models.FloatField(default=0.0)
    pve_win_rate = models.FloatField(default=0.0)
    pve_matches = models.IntegerField(default=0)
    pve_mission_easy = models.IntegerField(default=0)
    pve_mission_medium = models.IntegerField(default=0)
    pve_mission_hard = models.IntegerField(default=0)
    pve_hours = models.IntegerField(default=0)

    # Class Stats (JSON format for flexibility)
    # Expected: [{ name: 'Fuzileiro', color: '#...', em: 1.2, winRate: 50, hours: 10 }, ...]
    pvp_classes = models.JSONField(default=list, blank=True)
    pve_classes = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f'{self.user.username} → {self.game_nick}'

# Signals to ensure profile exists
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
    else:
        UserProfile.objects.get_or_create(user=instance)


class DiscordProfile(models.Model):
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='discord')
    discord_id = models.CharField(max_length=32, unique=True)
    avatar     = models.CharField(max_length=256, blank=True)

    def __str__(self):
        return f'{self.user.username} (Discord {self.discord_id})'


class Banner(models.Model):
    user     = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='banners')
    nick     = models.CharField(max_length=100)
    clan     = models.CharField(max_length=100, blank=True)
    marca    = models.CharField(max_length=255, blank=True)
    insignia = models.CharField(max_length=255, blank=True)
    fita     = models.CharField(max_length=255, blank=True)
    patente  = models.CharField(max_length=255, blank=True)
    banner_data = models.TextField(blank=True)  # base64 canvas image
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.nick} ({self.clan}) - {self.created_at:%Y-%m-%d %H:%M}'
