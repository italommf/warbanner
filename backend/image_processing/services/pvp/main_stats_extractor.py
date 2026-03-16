import logging
import cv2
import re
from .image_utils import crop_roi
from .parsers import parse_float, parse_int, parse_win_rate
from .roi_map import get_main_rois
from .ocr_utils import read_text_win
from .digit_recognizer import extract_rank_from_nickname, recognize_number, recognize_decimal
from ...log_styles import C_CYAN, C_END

logger = logging.getLogger(__name__)

def extract_main_stats(img):
    """
    Extrai as estatísticas principais (Nickname, Win Rate, KD Geral, etc.)
    usando OCR e Template Matching para Rank.
    Retorna (results, ocr_report)
    """
    results = {}
    ocr_report = []
    h, w = img.shape[:2]
    rois = get_main_rois(w)
    
    def add_to_report(name, roi_def, raw_text, val, color="#ffaa00"):
        base_w = roi_def.get("base", 1920)
        scale = w / float(base_w)
        ocr_report.append({
            "name": name,
            "raw_ocr": str(raw_text),
            "assigned_value": val,
            "color": color,
            "roi": {
                "x": int(roi_def["x"] * scale),
                "y": int(roi_def["y"] * scale),
                "w": int(roi_def["w"] * scale),
                "h": int(roi_def["h"] * scale)
            }
        })

    # 1. Nickname e Rank visual
    nick_roi = crop_roi(img, rois["nickname"])
    logger.info(f"   {C_CYAN}[OCR]{C_END} Extraindo Nickname...")
    raw_nick = read_text_win(nick_roi).strip()
    results["nickname"] = raw_nick
    
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Rank Numérico...")
    rank_tm = extract_rank_from_nickname(nick_roi)
    if rank_tm is not None:
        results["nickname_rank"] = rank_tm
    
    add_to_report("Nickname/Rank", rois["nickname"], raw_nick, raw_nick, color="#4a90e2")

    # 2. KD Geral
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo KD Geral...")
    kd_val = recognize_decimal(crop_roi(img, rois["kd_geral"]))
    results["kd_ratio"] = kd_val
    add_to_report("KD Geral", rois["kd_geral"], kd_val, kd_val, color="#e67e22")
    
    # 3. Win Rate
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Win Rate...")
    wr_raw = recognize_number(crop_roi(img, rois["win_rate_geral"]), is_percentage=True)
    results["win_rate"] = wr_raw
    add_to_report("Win Rate", rois["win_rate_geral"], wr_raw, wr_raw, color="#2ecc71")
    
    # 4. Partidas
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Partidas...")
    matches_val = recognize_number(crop_roi(img, rois["partidas"]))
    results["matches_played"] = matches_val
    add_to_report("Partidas", rois["partidas"], matches_val, matches_val, color="#9b59b6")
    
    # 5. Melhor Divisão
    logger.info(f"   {C_CYAN}[OCR]{C_END} Extraindo Melhor Divisão (Best Rank)...")
    br_roi = crop_roi(img, rois["best_rank"])
    raw_br = read_text_win(br_roi).strip()
    
    clean_br = re.sub(r'[^a-zA-Z0-9\s]', ' ', raw_br)
    rp_match = re.search(r'(\d+)\s*RP', clean_br, re.IGNORECASE)
    rp_value = int(rp_match.group(1)) if rp_match else (int(re.findall(r'\d+', clean_br)[0]) if re.findall(r'\d+', clean_br) else 0)
    
    tier_keywords = r'(PRATA|OURO|BRONZE|PLATINA|DIAMANTE|MESTRE|ELITE|GRAND\s*MESTRE|COPA|IV|III|II|I|1|2|3|4)'
    tier_found = re.findall(tier_keywords, clean_br, re.IGNORECASE)
    tier_name = " ".join(tier_found).upper().replace(" 1", " I").replace(" 2", " II").replace(" 3", " III").replace(" 4", " IV") if tier_found else "N/A"

    results["best_rank"] = {"tier": tier_name, "rp": rp_value}
    add_to_report("Melhor Divisão", rois["best_rank"], raw_br, f"{tier_name} ({rp_value} RP)", color="#f1c40f")
    
    # 6. Horas Totais
    logger.info(f"   {C_CYAN}[TM]{C_END}  Extraindo Horas Totais...")
    hours_val = recognize_number(crop_roi(img, rois["total_hours"]))
    results["total_hours"] = hours_val
    add_to_report("Horas Totais", rois["total_hours"], hours_val, hours_val, color="#1abc9c")

    return results, ocr_report
