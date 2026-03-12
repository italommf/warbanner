from django.contrib.auth.models import User
from api.models import UserProfile

def run():
    # Transform staff users into admins
    updated = User.objects.filter(is_staff=True).update() # This doesn't work for profile
    
    admins = 0
    for user in User.objects.filter(is_staff=True):
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if profile.role == 'user':
            profile.role = 'admin'
            profile.save()
            admins += 1
            print(f"User {user.username} updated to admin")
            
    print(f"Total: {admins} users updated.")

if __name__ == "__main__":
    import os
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warface.settings')
    django.setup()
    run()
