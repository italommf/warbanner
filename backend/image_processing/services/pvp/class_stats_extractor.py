import cv2
import logging
from .image_utils import crop_roi
from .parsers import parse_float, parse_int
from .roi_map import get_class_rois
from .ocr_utils import read_text_win

from .digit_recognizer import recognize_number, recognize_decimal
from ...log_styles import C_CYAN, C_END, C_BLUE

logger = logging.getLogger(__name__)

def extract_class_stats(img):
    """
    Extrai estatísticas por classe usando Template Matching.
    Retorna (results, ocr_report)
    """
    results = []
    ocr_report = []

    logger.info(f"   {C_BLUE}📊 Extraindo dados por classe...{C_END}")
    
    h, w = img.shape[:2]
    class_rois = get_class_rois(w)
    
    for item in class_rois:
        name = item["name"]
        rois = item["rois"]
        class_data = {"name": name, "color": item["color"]}
        
        for stat_key, roi_def in rois.items():
            base_w = roi_def.get("base", 1920)
            scale = w / float(base_w)
            is_int = (stat_key in ["wr", "time"])
            is_percentage = (stat_key == "wr")
            
            crop = crop_roi(img, roi_def)
            logger.info(f"      {C_CYAN}[TM]{C_END}  Lendo {name} ({stat_key})...")
            
            if is_int:
                val = recognize_number(crop, is_percentage=is_percentage)
            else:
                val = recognize_decimal(crop)
            
            if val is None: val = 0 if is_int else 0.0
            
            # Map stat key to class_data field
            if stat_key == "kd": class_data["em"] = val
            elif stat_key == "wr": class_data["winRate"] = float(val)
            elif stat_key == "time": class_data["hours"] = val
            
            ocr_report.append({
                "name": f"{name} - {stat_key.upper()}",
                "raw_ocr": str(val),
                "assigned_value": val,
                "roi": {
                    "x": int(roi_def["x"] * scale),
                    "y": int(roi_def["y"] * scale),
                    "w": int(roi_def["w"] * scale),
                    "h": int(roi_def["h"] * scale)
                }
            })
            
        results.append(class_data)
            
    return results, ocr_report
