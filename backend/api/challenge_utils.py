from pathlib import Path
from django.conf import settings
import json
import difflib
import logging
import re

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

# Palavras que definem variantes e NÃO podem ser confundidas de forma alguma
VARIANT_KEYWORDS = {
    "dourada", "crystal", "bang", "gold", "ouro", "normal", 
    "permanente", "elite", "especial", "aniversário", "aniversario",
    "carbono", "magma", "ice", "gelo", "earthquake", "terremoto",
    "faroeste", "neon", "fluor", "flúor", "obsidian", "obsidiana",
    "anúbis", "anubis", "absolute", "apache", "pharaoh", "hidden war", "valquíria", "valquiria",
    "special", "pyrite", "godfather", "scar", "viridian", "umbra", "santa muerte", "aztec",
    "corporate", "shroud", "apostate", "armament company", "hydra", "atlas", "morion",
    "ônyx", "onyx", "sindicato", "fobos", "berserk", "particle", "rogue", "guardian",
    "inverno", "imperador amarelo", "galáxia", "galaxia", "infernal", "torneio mundial",
    "papai noel maligno", "great gatsby", "gorgon", "medusa", "mechanical", "heat",
    "frankenstein", "quebra-gelo", "yakuza", "caimão", "caimao", "rust", "banshee",
    "red dusk", "road block", "higwayman", "moray", "deimos", "light circle", "cyber pro", "tribal"
}

def find_best_challenge_match(ocr_name, threshold=0.75):
    """
    Compara o nome vindo do OCR com a lista de desafios oficiais com proteção contra variantes.
    """
    if not ocr_name or len(ocr_name.strip()) < 3:
        return None

    challenges = get_all_challenges()
    names = list(challenges.keys())
    
    # Normalização base
    ocr_name_raw = ocr_name.strip()
    ocr_name_low = ocr_name_raw.lower()
    ocr_name_clean = re.sub(r'\s+', ' ', ocr_name_low)
    ocr_name_no_space = ocr_name_low.replace(' ', '').replace('!', '').replace('.', '').replace('-', '')
    ocr_words = set(ocr_name_clean.split())

    # 0. Busca por Correções Manuais (Prioridade Máxima)
    try:
        from image_processing.models import OCRCorrection
        # Usamos o texto limpo para o match
        corr = OCRCorrection.objects.filter(raw_text=ocr_name_clean).first()
        if corr:
            challenges = get_all_challenges()
            # Procurar o desafio pelo ID (filename)
            for name_key, data in challenges.items():
                if data['filename'] == corr.correct_item_id:
                    match_data = data.copy()
                    match_data.update({
                        'match_type': 'exact', 
                        'similarity': 1.0,
                        'is_manual_correction': True
                    })
                    return match_data
    except Exception as e:
        logger.error(f"Erro ao buscar correção OCR: {e}")

    # 1. Busca exata (Literal limpo)
    if ocr_name_clean in challenges:
        match_data = challenges[ocr_name_clean].copy()
        match_data.update({'match_type': 'exact', 'similarity': 1.0})
        return match_data

    # 2. Busca exata (Sem espaços/pontuação)
    for name_key, data in challenges.items():
        name_no_space = name_key.replace(' ', '').replace('!', '').replace('.', '').replace('-', '')
        if ocr_name_no_space == name_no_space:
            match_data = data.copy()
            match_data.update({'match_type': 'exact_normalized', 'similarity': 1.0})
            return match_data

    # 3. Busca por similaridade robusta
    # n=40 para pegar todas as variantes possíveis e filtrar
    matches = difflib.get_close_matches(ocr_name_clean, names, n=40, cutoff=0.5) # Cutoff menor para aceitar candidatos inicialmente
    
    if matches:
        best_match = None
        highest_score = 0
        
        for m_name in matches:
            ratio = difflib.SequenceMatcher(None, ocr_name_clean, m_name).ratio()
            match_words = m_name.split()
            
            # 3a. Identificar conflitos específicos de variantes
            ocr_variants = ocr_words.intersection(VARIANT_KEYWORDS)
            match_variants = set(match_words).intersection(VARIANT_KEYWORDS)
            
            # Se uma variante está em um mas não no outro (ex: 'Bang!' no OCR mas 'Crystal' no Match)
            # Isso é um conflito FATAL para a similaridade.
            variant_collision = len(ocr_variants ^ match_variants) > 0

            # 3b. Validação por palavras
            ocr_significant = [w for w in ocr_words if len(w) >= 3]
            match_significant = [w for w in match_words if len(w) >= 3]
            
            matches_count = 0
            matched_match_indices = set()
            for ow in ocr_significant:
                for idx, mw in enumerate(match_words):
                    if idx in matched_match_indices: continue
                    if difflib.SequenceMatcher(None, ow, mw).ratio() > 0.85:
                        matches_count += 1
                        matched_match_indices.add(idx)
                        break

            word_ratio = matches_count / len(match_significant) if match_significant else 0
            
            # 3c. Calculo do Score com Penalidades
            len_penalty = (abs(len(ocr_name_clean) - len(m_name)) / max(len(ocr_name_clean), len(m_name))) * 0.3
            collision_penalty = 0.8 if variant_collision else 0 # Penalidade pesadíssima
            
            final_score = (ratio * 0.3) + (word_ratio * 0.7) - len_penalty - collision_penalty
            
            # Exigência: 
            # 1. Word ratio deve ser alto (semântica)
            # 2. Não pode haver colisão de variantes
            # 3. O score final deve superar o threshold
            if final_score > highest_score and word_ratio >= 0.8 and not variant_collision:
                if final_score >= threshold:
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
