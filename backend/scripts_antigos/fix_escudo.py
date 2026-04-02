import json
import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warface.settings')
django.setup()

from image_processing.models import UploadedImage
from api.models import UserProfile

try:
    img = UploadedImage.objects.get(id=4)
    res = img.result
    # Slot 6 é o índice 5
    slot6 = res['detected_achievements'][5]
    target_id = slot6.get('id')
    
    print(f"Antigo: {slot6['name']} ({target_id})")
    
    slot6['id'] = None
    slot6['name'] = 'Desafio não encontrado'
    slot6['match_type'] = 'failed'
    
    img.result = res
    img.save()
    print("Imagem ID 4 atualizada.")
    
    profile = UserProfile.objects.get(user__username='italommf')
    if target_id and target_id in profile.my_insignias:
        profile.my_insignias.remove(target_id)
        profile.save()
        print(f"ID {target_id} removido do perfil de italommf.")
    else:
        print(f"ID {target_id} não encontrado no perfil.")
    
except Exception as e:
    print(f"Erro: {e}")
