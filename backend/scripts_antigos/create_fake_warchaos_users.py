import os
import sys
import django
import random
from faker import Faker
from django.utils import timezone

# Add current directory to path
sys.path.append(os.getcwd())

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warface.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile

fake = Faker()

def create_fake_users(count=50):
    for i in range(count):
        username = f"fake_{fake.user_name()}_{random.randint(100, 999)}"
        email = f"{username}@gmail.com"
        
        # Create User
        user, created = User.objects.get_or_create(username=username, defaults={'email': email})
        if not created:
            continue
            
        # Profile is created via signals, so we just get it
        profile = user.profile
        profile.game_nick = fake.name()[:50]
        profile.warchaos_user = f"wc_{username}"
        profile.warchaos_nick = f"Nick_{fake.first_name()}"
        profile.warchaos_solicitou = True
        profile.warchaos_solicitou_at = timezone.now()
        
        # Total challenges between 30 and 200
        total_challenges = random.randint(30, 200)
        
        # Distribute among marcas, insignias, fitas
        n_marcas = random.randint(0, total_challenges)
        n_insignias = random.randint(0, total_challenges - n_marcas)
        n_fitas = total_challenges - n_marcas - n_insignias
        
        profile.my_marcas = [f"marca_{x}" for x in range(n_marcas)]
        profile.my_insignias = [f"insignia_{x}" for x in range(n_insignias)]
        profile.my_fitas = [f"fita_{x}" for x in range(n_fitas)]
        
        profile.save()
        print(f"User {username} created with {total_challenges} challenges.")

if __name__ == "__main__":
    create_fake_users(50)
