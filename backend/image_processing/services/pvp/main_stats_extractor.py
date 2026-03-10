import logging
import cv2
from .image_utils import crop_roi
from .parsers import parse_float, parse_int, parse_win_rate
from .roi_map import MAIN_ROIS
from .ocr_utils_win import read_text_win

logger = logging.getLogger(__name__)

def extract_main_stats(img):
    """
    Extrai as estatísticas principais (Nickname, Win Rate, KD Geral, etc.)
    usando o motor native Windows OCR.
    """
    results = {}
    
    # 2. Nickname
    results["nickname"] = read_text_win(crop_roi(img, MAIN_ROIS["nickname"])).strip()
    
    # 3. KD Geral (O E/M do PvP)
    kd_text = read_text_win(crop_roi(img, MAIN_ROIS["kd_geral"])).replace(" ", "").replace("o", "0").replace("O", "0")
    results["kd_ratio"] = parse_float(kd_text)
    
    # 4. Win Rate Geral (Float/Percent)
    wr_text = read_text_win(crop_roi(img, MAIN_ROIS["win_rate_geral"])).replace(" ", "").replace("o", "0").replace("O", "0")
    results["win_rate"] = parse_win_rate(wr_text)
    
    # 5. Partidas (Int)
    matches_text = read_text_win(crop_roi(img, MAIN_ROIS["partidas"])).replace(" ", "").replace("o", "0").replace("O", "0")
    results["matches_played"] = parse_int(matches_text)
    
    # 6. Melhor Divisão (Best Rank) - Ex: "Bronze I 150 RP"
    best_rank_text = read_text_win(crop_roi(img, MAIN_ROIS["best_rank"])).strip()
    
    import re
    # Limpeza: Mantém letras, números e espaços
    clean_br = re.sub(r'[^a-zA-Z0-9\s]', ' ', best_rank_text)
    
    # 1. Tentar achar RP explicitamente
    rp_match = re.search(r'(\d+)\s*RP', clean_br, re.IGNORECASE)
    if rp_match:
        rp_value = int(rp_match.group(1))
    else:
        # 2. Se não achou "RP", pega o primeiro número que sobrar (se houver)
        nums = re.findall(r'\d+', clean_br)
        rp_value = int(nums[0]) if nums else 0
    
    # 3. Extrair o nome da divisão (Tier)
    tier_keywords = r'(PRATA|OURO|BRONZE|PLATINA|DIAMANTE|MESTRE|ELITE|GRAND\s*MESTRE|COPA|IV|III|II|I|1|2|3|4)'
    tier_found = re.findall(tier_keywords, clean_br, re.IGNORECASE)
    
    if tier_found:
        # Reconstrói o nome (Ex: ["PRATA", "I"] -> "PRATA I")
        tier_name = " ".join(tier_found).upper()
        # Se o OCR leu "1" no lugar de "I", padronizamos para algarismo romano
        tier_name = tier_name.replace(" 1", " I").replace(" 2", " II").replace(" 3", " III").replace(" 4", " IV")
    else:
        tier_name = "N/A"

    results["best_rank"] = {
        "tier": tier_name,
        "rp": rp_value
    }
    
    # 7. Horas Totais
    hours_text = read_text_win(crop_roi(img, MAIN_ROIS["total_hours"])).replace(" ", "").replace("o", "0").replace("O", "0")
    results["total_hours"] = parse_int(hours_text)

    return results
