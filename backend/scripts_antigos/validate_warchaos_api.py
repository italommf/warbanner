import os
import sys
import json

# Add current directory to path
sys.path.append(os.getcwd())

# Setup Django before any other imports
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warface.settings')
import django
django.setup()

import random
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth.models import User
from api.warchaos_views import warchaos_migration_api

def validate_api():
    factory = APIRequestFactory()
    try:
        user = User.objects.get(username='italommf') # Superuser
    except User.DoesNotExist:
        print("Superuser italommf not found. Please run the script with a valid user.")
        return
    
    # Simulate GET request
    request = factory.get('/api/warchaos/migration/')
    force_authenticate(request, user=user)
    
    response = warchaos_migration_api(request)
    
    if response.status_code == 200:
        print("API GET Success!")
        data = response.data
        print(f"Total entries: {len(data)}")
        if len(data) > 0:
            print("Sample entries verification:")
            for entry in data[:3]: # Let's show 3
                m = len(entry['my_marcas'])
                i = len(entry['my_insignias'])
                f = len(entry['my_fitas'])
                total = m + i + f
                print(f"- User: {entry['username']} | WC: {entry['warchaos_user']} | Nick: {entry['warchaos_nick']} | Challenges: {total} ({m} M / {i} I / {f} F)")
                
                # Verify total is between 30 and 200
                if 30 <= total <= 200:
                    print("  [OK] Challenges count within range [30-200]")
                else:
                    print(f"  [ERROR] Challenges count {total} OUT OF RANGE")
    else:
        print(f"API GET Failed with status {response.status_code}")
        print(response.data)

if __name__ == "__main__":
    validate_api()
