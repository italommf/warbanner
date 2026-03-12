from pathlib import Path
from django.conf import settings
import json
import difflib
import logging

logger = logging.getLogger(__name__)

# Cache para os desafios
_challenge_cache = None

def get_all_challenges():
    """
    Retorna um dicionário consolidado de todos os desafios (marcas, insignias, fitas).
    Formato: { 'Nome do Desafio': {'filename': '...', 'category': '...'}, ... }
    """
    global _challenge_cache
    if _challenge_cache is not None:
        return _challenge_cache

    from api.views import scan_category, CATEGORIES
    
    mapping = {}
    # CATEGORIES = ['marcas', 'insignias', 'fitas', 'patentes']
    for cat in ['marcas', 'insignias', 'fitas']:
        items = scan_category(cat)
        for item in items:
            name = item['name'].lower().strip()
            mapping[name] = {
                'filename': item['filename'],
                'category': cat,
                'official_name': item['name']
            }
    
    _challenge_cache = mapping
    return mapping

def find_best_challenge_match(ocr_name, threshold=0.8):
    """
    Compara o nome vindo do OCR com a lista de desafios oficiais.
    Prioriza Match Exato (case-insensitive). 
    Apenas se não encontrar, tenta similaridade com threshold alto (0.8).
    """
    if not ocr_name:
        return None

    challenges = get_all_challenges()
    names = list(challenges.keys())
    
    ocr_name_clean = ocr_name.lower().strip()
    
    # 1. Busca exata primeiro
    if ocr_name_clean in challenges:
        match_data = challenges[ocr_name_clean].copy()
        match_data['match_type'] = 'exact'
        match_data['similarity'] = 1.0
        return match_data
    
    # 2. Busca por similaridade (apenas se exato falhar e o threshold for atingido)
    # difflib.SequenceMatcher pode dar o score exato de similaridade
    matches = difflib.get_close_matches(ocr_name_clean, names, n=1, cutoff=threshold)
    
    if matches:
        best_name = matches[0]
        # Calcula o score real de similaridade
        ratio = difflib.SequenceMatcher(None, ocr_name_clean, best_name).ratio()
        
        match_data = challenges[best_name].copy()
        match_data['match_type'] = 'similarity'
        match_data['similarity'] = round(ratio, 2)
        return match_data
    
    return None
