import os
import django
import random
from faker import Faker

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warface.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile, Banner

fake = Faker(['pt_BR'])

def populate(n=50):
    print(f'Populating database with {n} fake users...')
    
    # Challenges assets
    marks_dir = r'd:\Git\Projetos Pessoais\Warface Desafios\backend\imagens\desafios\marcas'
    insignias_dir = r'd:\Git\Projetos Pessoais\Warface Desafios\backend\imagens\desafios\insignias'
    ribbons_dir = r'd:\Git\Projetos Pessoais\Warface Desafios\backend\imagens\desafios\fitas'

    all_marks = [f for f in os.listdir(marks_dir) if f.endswith(('.png', '.jpg', '.jpeg')) and not f.lower().endswith('default.png')]
    all_insignias = [f for f in os.listdir(insignias_dir) if f.endswith(('.png', '.jpg', '.jpeg')) and not f.lower().endswith('default.png')]
    all_ribbons = [f for f in os.listdir(ribbons_dir) if f.endswith(('.png', '.jpg', '.jpeg')) and not f.lower().endswith('default.png')]

    def get_random_assets(all_assets, count):
        return random.sample(all_assets, min(len(all_assets), count))

    for i in range(n):
        username = fake.user_name() + str(random.randint(1, 999))
        email = fake.email()
        password = 'password123'
        
        if User.objects.filter(username=username).exists():
            continue
            
        user = User.objects.create_user(username=username, email=email, password=password)
        profile = user.profile # Auto-created by signal
        
        # Básicos
        profile.game_nick = fake.name().split()[0].upper() + str(random.randint(10, 99))
        profile.game_clan = random.choice(['Warface-Pro', 'Brazilian-Storm', 'Elite-Warriors', 'Chaos-Legion', None]) or ''
        profile.game_rank_idx = random.randint(1, 90)
        
        # PVP Stats
        profile.pvp_em = round(random.uniform(0.5, 2.5), 2)
        profile.pvp_win_rate = random.randint(30, 70)
        profile.pvp_matches = random.randint(50, 5000)
        profile.pvp_hours = random.randint(10, 2000)
        
        # PVE Stats
        profile.pve_win_rate = random.randint(50, 95)
        profile.pve_matches = random.randint(20, 3000)
        profile.pve_hours = random.randint(5, 1500)
        profile.pve_mission_easy = random.randint(10, 1000)
        profile.pve_mission_medium = random.randint(5, 800)
        profile.pve_mission_hard = random.randint(1, 500)
        
        # Desafios (Real filenames)
        profile.my_marcas = get_random_assets(all_marks, random.randint(5, 30))
        profile.my_insignias = get_random_assets(all_insignias, random.randint(5, 30))
        profile.my_fitas = get_random_assets(all_ribbons, random.randint(5, 30))
        
        profile.save()
        
        # Create a banner for some users to populate the community
        if random.random() > 0.5:
            Banner.objects.create(
                user=user,
                nick=profile.game_nick,
                clan=profile.game_clan,
                marca=random.choice(profile.my_marcas) if profile.my_marcas else '',
                insignia=random.choice(profile.my_insignias) if profile.my_insignias else '',
                fita=random.choice(profile.my_fitas) if profile.my_fitas else '',
                patente=f'Rank_{profile.game_rank_idx:02d}.png',
                banner_data='fake_base64_data'
            )

    print('Population finished successfully!')

if __name__ == '__main__':
    populate(50)
