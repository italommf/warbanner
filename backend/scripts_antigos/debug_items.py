import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path.cwd() / 'backend'))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warface.settings')
django.setup()

from api.views import scan_category, CATEGORIES
from django.conf import settings

print(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")
for cat in CATEGORIES:
    items = scan_category(cat)
    print(f"Category {cat}: {len(items)} items")
