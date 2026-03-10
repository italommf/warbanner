from django.contrib.auth.models import User
from api.models import UserProfile

for user in User.objects.all():
    profile, created = UserProfile.objects.get_or_create(user=user)
    if created:
        print(f"Profile created for {user.username}")
    else:
        print(f"Profile already exists for {user.username}")

print("All profiles verified.")
