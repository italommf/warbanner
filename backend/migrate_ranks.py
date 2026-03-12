
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warface.settings')
django.setup()

from api.models import UserProfile
from api.views import scan_category

patentes = scan_category('patentes')
filenames = [p['filename'] for p in patentes]
updated = 0

for p in UserProfile.objects.all():
    if p.game_rank in filenames:
        idx = filenames.index(p.game_rank) + 1
        if p.game_rank_idx != idx:
            p.game_rank_idx = idx
            p.save()
            updated += 1
    elif not p.game_rank and filenames:
        p.game_rank = filenames[0]
        p.game_rank_idx = 1
        p.save()
        updated += 1

print(f"Updated {updated} user profiles.")
