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

import re

def find_best_challenge_match(ocr_name, threshold=0.75):
    """
    Compara o nome vindo do OCR com a lista de desafios oficiais.
    Prioriza Match Exato (case-insensitive e space-insensitive). 
    """
    if not ocr_name or len(ocr_name.strip()) < 3:
        return None

    challenges = get_all_challenges()
    names = list(challenges.keys())
    
    # Normalização base
    ocr_name_raw = ocr_name.strip()
    ocr_name_low = ocr_name_raw.lower()
    # Remove espaços duplos e pontuação básica para busca mais limpa
    ocr_name_clean = re.sub(r'\s+', ' ', ocr_name_low)
    ocr_name_no_space = ocr_name_low.replace(' ', '').replace('!', '').replace('.', '').replace('-', '')

    # 1. Busca exata (Primeira tentativa: literal limpo)
    if ocr_name_clean in challenges:
        match_data = challenges[ocr_name_clean].copy()
        match_data.update({'match_type': 'exact', 'similarity': 1.0})
        return match_data

    # 2. Busca exata (Segunda tentativa: sem espaços/pontuação)
    # Útil para "SureFire MGX" vs "SurefireMGX" ou "GrandPower" vs "Grand Power"
    for name_key, data in challenges.items():
        name_no_space = name_key.replace(' ', '').replace('!', '').replace('.', '').replace('-', '')
        if ocr_name_no_space == name_no_space:
            match_data = data.copy()
            match_data.update({'match_type': 'exact_normalized', 'similarity': 1.0})
            return match_data

    # 3. Busca por similaridade
    # Vamos aumentar o n para pegar mais candidatos e filtrar manualmente
    matches = difflib.get_close_matches(ocr_name_clean, names, n=10, cutoff=threshold)
    
    if matches:
        ocr_words = set(ocr_name_clean.split())
        best_match = None
        highest_score = 0
        
        for m_name in matches:
            # Ratio base do difflib
            ratio = difflib.SequenceMatcher(None, ocr_name_clean, m_name).ratio()
            
            # Verificação de palavras: garante que as palavras chaves existam
            match_words = m_name.split()
            word_matches = 0
            for ow in ocr_words:
                if any(difflib.SequenceMatcher(None, ow, mw).ratio() > 0.85 for mw in match_words):
                    word_matches += 1
            
            word_ratio = word_matches / len(ocr_words) if ocr_words else 0
            
            # --- CORREÇÃO DE GREEDY MATCH (Dourada vs Normal) ---
            # Penalidade por diferença de tamanho: 
            # Se o OCR é curto ("SureFire MGX") e o match é longo ("SureFire MGX Dourada"),
            # a penalidade empurra o score para baixo para favorecer o match mais curto/preciso.
            len_diff = abs(len(ocr_name_clean) - len(m_name))
            len_penalty = (len_diff / max(len(ocr_name_clean), len(m_name))) * 0.4
            
            # Bônus se um contém o outro exatamente (Sub-string match)
            contain_bonus = 0.1 if (ocr_name_clean in m_name or m_name in ocr_name_clean) else 0
            
            final_score = (ratio * 0.7) + (word_ratio * 0.3) - len_penalty + contain_bonus

            # Debug log interno (visível no console do servidor)
            # logger.debug(f"Match candidate: '{m_name}' | Ratio: {ratio:.2f} | WordMatch: {word_ratio:.2f} | Penalty: {len_penalty:.2f} | Final: {final_score:.2f}")

            if final_score > highest_score and word_ratio >= 0.6:
                highest_score = final_score
                best_match = m_name

        if best_match:
            match_data = challenges[best_match].copy()
            match_data.update({
                'match_type': 'similarity',
                'similarity': round(min(1.0, highest_score), 2),
                'debug_name': best_match
            })
            return match_data
    
    return None

