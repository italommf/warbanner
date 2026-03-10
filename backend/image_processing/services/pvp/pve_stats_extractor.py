from .image_utils import crop_roi, load_image
from .ocr_utils_win import read_text_win
from .roi_map import MAIN_ROIS, PVE_ROIS
from .parsers import parse_int, parse_float, parse_win_rate
import re

def extract_pve_stats(img):
    """
    Extrai estatísticas específicas do modo PvE (JxA).
    """
    if img is None:
        return {"error": "Imagem inválida"}

    results = {}
    
    # 1. Nickname
    results["nickname"] = read_text_win(crop_roi(img, MAIN_ROIS["nickname"])).strip()
    
    # 3. E/M (Eliminações / Mortes)
    em_text = read_text_win(crop_roi(img, MAIN_ROIS["kd_geral"])).strip()
    clean_em = re.sub(r'[^\d]', '', em_text)
    if len(clean_em) >= 3:
        # Warface PvE E/M tem 2 decimais
        results["kd_ratio"] = float(clean_em) / 100.0
    else:
        results["kd_ratio"] = parse_float(em_text)
    
    # 4. Índice de Vitórias
    wr_text = read_text_win(crop_roi(img, MAIN_ROIS["win_rate_geral"])).strip()
    results["win_rate"] = parse_win_rate(wr_text)
    
    # 5. Partidas Jogadas
    matches_text = read_text_win(crop_roi(img, MAIN_ROIS["partidas"])).strip()
    results["matches_played"] = parse_int(matches_text)
    
    # 6. Horas Totais
    hours_text = read_text_win(crop_roi(img, MAIN_ROIS["total_hours"])).strip()
    # O Windows OCR lê 1.540h como "1.540 h" ou "1540"
    results["total_hours"] = parse_int(hours_text.replace(".", "").replace(",", ""))

    # 7. Missões Concluídas (Caveiras)
    results["missions"] = {
        "easy": parse_int(read_text_win(crop_roi(img, PVE_ROIS["easy"]))),
        "medium": parse_int(read_text_win(crop_roi(img, PVE_ROIS["medium"]))),
        "hard": parse_int(read_text_win(crop_roi(img, PVE_ROIS["hard"])))
    }

    return results
