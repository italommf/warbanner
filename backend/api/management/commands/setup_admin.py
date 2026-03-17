from django.core.management.base import BaseCommand
from api.models import User, UserProfile

class Command(BaseCommand):
    help = 'Cria o usuário administrador italommf se não existir'

    def handle(self, *args, **options):
        username = 'italommf'
        password = 'Hefesto@45'
        email = 'italo.mageste@gmail.com'

        if not User.objects.filter(username=username).exists():
            user = User.objects.create_superuser(username=username, email=email, password=password)
            # Garantir que o perfil dele seja admin
            profile = user.profile
            profile.role = 'admin'
            profile.game_nick = '720p'
            profile.save()
            self.stdout.write(self.style.SUCCESS(f'Usuário {username} criado com sucesso.'))
        else:
            self.stdout.write(self.style.WARNING(f'Usuário {username} já existe.'))
