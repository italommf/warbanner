from .image_utils import crop_roi, load_image
from .ocr_utils import read_text_win

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
    Retorna (results, ocr_report)
    """
    if img is None:
        return {"error": "Imagem inválida"}, []

    results = {}
    ocr_report = []
    h, w = img.shape[:2]
    rois = get_main_rois(w)
    pve_rois = get_pve_rois(w)
    
    def add_to_report(name, roi_def, raw_text, val):
        base_w = roi_def.get("base", 1920)
        scale = w / float(base_w)
        ocr_report.append({
            "name": name,
            "raw_ocr": str(raw_text),
            "assigned_value": val,
            "roi": {
                "x": int(roi_def["x"] * scale),
                "y": int(roi_def["y"] * scale),
                "w": int(roi_def["w"] * scale),
                "h": int(roi_def["h"] * scale)
            }
        })

    # 1. Nickname e Rank
    nick_roi = crop_roi(img, rois["nickname"])
    logger.info(f"   {C_CYAN}[OCR]{C_END} Extraindo Nickname...")
    raw_nick = read_text_win(nick_roi).strip()
    results["nickname"] = raw_nick
    rank_tm = extract_rank_from_nickname(nick_roi)
    if rank_tm is not None: results["nickname_rank"] = rank_tm
    add_to_report("Nickname", rois["nickname"], raw_nick, raw_nick)
    
    # 2. E/M (KD)
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo E/M (KD)...")
    kd_val = recognize_decimal(crop_roi(img, rois["kd_geral"]))
    results["kd_ratio"] = kd_val
    add_to_report("E/M (PvE)", rois["kd_geral"], kd_val, kd_val)
    
    # 3. Índice de Vitórias
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Índice de Vitórias...")
    wr_raw = recognize_number(crop_roi(img, rois["win_rate_geral"]), is_percentage=True)
    results["win_rate"] = wr_raw
    add_to_report("Win Rate (PvE)", rois["win_rate_geral"], wr_raw, wr_raw)
    
    # 4. Partidas Jogadas
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Partidas Jogadas...")
    matches_val = recognize_number(crop_roi(img, rois["partidas"]))
    results["matches_played"] = matches_val
    add_to_report("Partidas (PvE)", rois["partidas"], matches_val, matches_val)
    
    # 5. Horas Totais
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Horas Totais...")
    hours_val = recognize_number(crop_roi(img, rois["total_hours"]))
    results["total_hours"] = hours_val
    add_to_report("Horas Totais", rois["total_hours"], hours_val, hours_val)

    # 6. Missões Concluídas
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Missões (Caveiras)...")
    m_easy = recognize_number(crop_roi(img, pve_rois["easy"]))
    m_med = recognize_number(crop_roi(img, pve_rois["medium"]))
    m_hard = recognize_number(crop_roi(img, pve_rois["hard"]))
    
    results["missions"] = {"easy": m_easy, "medium": m_med, "hard": m_hard}
    add_to_report("Missões Fácil", pve_rois["easy"], m_easy, m_easy)
    add_to_report("Missões Normal", pve_rois["medium"], m_med, m_med)
    add_to_report("Missões Pro", pve_rois["hard"], m_hard, m_hard)

    return results, ocr_report
