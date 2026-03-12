import logging
import cv2
from .image_utils import crop_roi
from .parsers import parse_float, parse_int, parse_win_rate
from .roi_map import get_main_rois
from .ocr_utils_win import read_text_win
from .digit_recognizer import extract_rank_from_nickname, recognize_number, recognize_decimal
from ...log_styles import C_CYAN, C_END
from ...log_styles import C_CYAN, C_END

logger = logging.getLogger(__name__)

def extract_main_stats(img):
    """
    Extrai as estatísticas principais (Nickname, Win Rate, KD Geral, etc.)
    usando OCR e Template Matching para Rank.
    """
    results = {}
    h, w = img.shape[:2]
    rois = get_main_rois(w)
    
    # 2. Nickname e Rank visual
    nick_roi = crop_roi(img, rois["nickname"])
    logger.info(f"   {C_CYAN}[OCR]{C_END} Extraindo Nickname...")
    results["nickname"] = read_text_win(nick_roi).strip()
    
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Rank Numérico...")
    rank_tm = extract_rank_from_nickname(nick_roi)
    if rank_tm is not None:
        results["nickname_rank"] = rank_tm
    
    # 3. KD Geral (O E/M do PvP) - Migrando para recognize_decimal (TM)
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo KD Geral...")
    results["kd_ratio"] = recognize_decimal(crop_roi(img, rois["kd_geral"]))
    
    # 4. Win Rate Geral (Inteiro/Percent) - Normalização robusta
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Win Rate...")
    # Mudado para recognize_number com flag de porcentagem para garantir 0-100% sem decimais
    wr_raw = recognize_number(crop_roi(img, rois["win_rate_geral"]), is_percentage=True)
    results["win_rate"] = wr_raw
    
    # 5. Partidas (Int) - Migrando para recognize_number (TM)
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Partidas...")
    results["matches_played"] = recognize_number(crop_roi(img, rois["partidas"]))
    
    # 6. Melhor Divisão (Best Rank)
    logger.info(f"   {C_CYAN}[OCR]{C_END} Extraindo Melhor Divisão (Best Rank)...")
    best_rank_text = read_text_win(crop_roi(img, rois["best_rank"])).strip()
    
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
    
    # 7. Horas Totais - Migrando para recognize_number (TM)
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Horas Totais...")
    results["total_hours"] = recognize_number(crop_roi(img, rois["total_hours"]))

    return results
