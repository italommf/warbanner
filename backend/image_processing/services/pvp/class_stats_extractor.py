import cv2
import logging
from .image_utils import crop_roi
from .parsers import parse_float, parse_int
from .roi_map import CLASS_ROIS
from .ocr_utils_win import read_text_win

logger = logging.getLogger(__name__)

def extract_class_stats(img):
    """
    Extracts stats for the 4 classes using Native Windows OCR.
    Highly accurate and faster than common OCR libraries.
    """
    results = []

    for item in CLASS_ROIS:
        name = item["name"]
        rois = item["rois"]
        
        def read_value_win(roi_def, is_int=False):
            try:
                crop = crop_roi(img, roi_def)
                # O motor do Windows costuma ser melhor em cores normais
                text = read_text_win(crop).strip()
                
                if text:
                    # Limpeza básica (ex: "o" -> "0")
                    text = text.replace(" ", "").replace("o", "0").replace("O", "0")
                    return parse_int(text) if is_int else parse_float(text)
            except Exception as e:
                logger.error(f"[WIN-OCR] Falha ao ler {name}: {e}")
            return 0 if is_int else 0.0

        results.append({
            "name": name,
            "color": item["color"],
            "em": read_value_win(rois["kd"], is_int=False),
            "winRate": read_value_win(rois["wr"], is_int=False),
            "hours": read_value_win(rois["time"], is_int=True)
        })
            
    return results
