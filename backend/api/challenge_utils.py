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

def find_best_challenge_match(ocr_name, threshold=0.75):
    """
    Compara o nome vindo do OCR com a lista de desafios oficiais.
    Prioriza Match Exato (case-insensitive). 
    Apenas se não encontrar, tenta similaridade equilibrada (0.75) + trava de palavras.
    """
    if not ocr_name or len(ocr_name.strip()) < 3:
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
    matches = difflib.get_close_matches(ocr_name_clean, names, n=3, cutoff=threshold)
    
    if matches:
        # Filtro extra: vamos garantir que as palavras principais façam sentido
        # Isso evita que "Equipamento de X" bata com "Mestre de X" apenas pelo "de X"
        ocr_words = set(ocr_name_clean.split())
        
        best_match = None
        highest_ratio = 0
        
        for m_name in matches:
            ratio = difflib.SequenceMatcher(None, ocr_name_clean, m_name).ratio()
            
            # Verificação de palavras: pelo menos 60% das palavras do OCR devem ser parecidas
            # com alguma palavra do match (evita trocar palavras inteiras cruciais)
            match_words = m_name.split()
            word_matches = 0
            for ow in ocr_words:
                if any(difflib.SequenceMatcher(None, ow, mw).ratio() > 0.8 for mw in match_words):
                    word_matches += 1
            
            word_ratio = word_matches / len(ocr_words) if ocr_words else 0
            
            if ratio > highest_ratio and word_ratio >= 0.6:
                highest_ratio = ratio
                best_match = m_name

        if best_match:
            match_data = challenges[best_match].copy()
            match_data['match_type'] = 'similarity'
            match_data['similarity'] = round(highest_ratio, 2)
            return match_data
    
    return None
