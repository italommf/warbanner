import os
import django
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warface.settings')
django.setup()

from api.models import User, UserProfile

try:
    print("Deleting user bugtest if exists...")
    User.objects.filter(username='bugtest').delete()
    
    print("Creating user bugtest...")
    u = User.objects.create_user(username='bugtest', password='password')
    print(f"User created: {u.id} (Type: {type(u.id)})")
    
    # Check if profile already exists (due to signal)
    print("Searching for profile...")
    p = UserProfile.objects.filter(user=u).first()
    if p:
        print(f"Profile already exists (ID: {p.id}) due to signal.")
        p.game_nick = 'bugnick'
        p.save()
        print("Profile updated successfully.")
    else:
        print("Profile does not exist, creating manually...")
        p = UserProfile.objects.create(user=u, game_nick='bugnick')
        print(f"Profile created manually (ID: {p.id}).")
    print("Final Success!")
except Exception:
    traceback.print_exc()
