from .image_utils import crop_roi, load_image
from .ocr_utils_win import read_text_win
from .roi_map import get_main_rois, get_pve_rois
from .parsers import parse_int, parse_float, parse_win_rate
from ...log_styles import C_CYAN, C_END
import re
import logging
from .digit_recognizer import extract_rank_from_nickname, recognize_number, recognize_decimal

logger = logging.getLogger(__name__)

def extract_pve_stats(img):
    """
    Extrai estatísticas específicas do modo PvE (JxA).
    """
    if img is None:
        return {"error": "Imagem inválida"}

    results = {}
    h, w = img.shape[:2]
    rois = get_main_rois(w)
    pve_rois = get_pve_rois(w)
    
    # 1. Nickname e Rank via Template Matching
    nick_roi = crop_roi(img, rois["nickname"])
    logger.info(f"   {C_CYAN}[OCR]{C_END} Extraindo Nickname...")
    results["nickname"] = read_text_win(nick_roi).strip()
    
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Rank Numérico...")
    rank_tm = extract_rank_from_nickname(nick_roi)
    if rank_tm is not None:
        results["nickname_rank"] = rank_tm
    
    # 3. E/M (Eliminações / Mortes) - TM
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo E/M (KD)...")
    results["kd_ratio"] = recognize_decimal(crop_roi(img, rois["kd_geral"]))
    
    # 4. Índice de Vitórias - TM
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Índice de Vitórias...")
    # Mudado para recognize_number com flag de porcentagem para garantir 0-100% sem decimais
    wr_raw = recognize_number(crop_roi(img, rois["win_rate_geral"]), is_percentage=True)
    results["win_rate"] = wr_raw
    
    # 5. Partidas Jogadas - TM
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Partidas Jogadas...")
    results["matches_played"] = recognize_number(crop_roi(img, rois["partidas"]))
    
    # 6. Horas Totais - TM
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Horas Totais...")
    results["total_hours"] = recognize_number(crop_roi(img, rois["total_hours"]))

    # 7. Missões Concluídas (Caveiras) - TM
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Missões (Caveiras)...")
    results["missions"] = {
        "easy": recognize_number(crop_roi(img, pve_rois["easy"])),
        "medium": recognize_number(crop_roi(img, pve_rois["medium"])),
        "hard": recognize_number(crop_roi(img, pve_rois["hard"]))
    }

    return results
