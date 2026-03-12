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
    Extrai estatísticas por classe usando Template Matching (dígitos wf_0a9).
    Fallback para Windows OCR caso o template matching falhe.
    """
    results = []

    logger.info(f"   {C_BLUE}📊 Extraindo dados por classe...{C_END}")
    
    h, w = img.shape[:2]
    class_rois = get_class_rois(w)
    
    for item in class_rois:
        name = item["name"]
        rois = item["rois"]
        
        def read_value(roi_def, is_int=False, is_percentage=False):
            """
            Tenta reconhecer o valor usando Template Matching primeiro.
            Se falhar, volta para o Windows OCR como fallback.
            """
            try:
                crop = crop_roi(img, roi_def)
                
                # ===== FASE 1: Template Matching (preferido) =====
                logger.info(f"      {C_CYAN}[TM]{C_END}  Lendo {name} ({'int' if is_int else 'float'})...")
                if is_int:
                    val = recognize_number(crop, is_percentage=is_percentage)
                else:
                    val = recognize_decimal(crop)
                
                if val is not None:
                    return val
                
                # ===== FASE 2: Fallback OCR (DESATIVADO) =====
                # text = read_text_win(crop).strip()
                # if text:
                #     if 'h' in text.lower():
                #         text = text.lower().split('h')[0]
                #     text = text.replace(" ", "").replace("o", "0").replace("O", "0")
                #     return parse_int(text) if is_int else parse_float(text)
                return 0 if is_int else 0.0
                    
            except Exception as e:
                logger.error(f"[CLASS-EXTRACT] Falha ao ler {name}: {e}")
            return 0 if is_int else 0.0

        wr_val = read_value(rois["wr"], is_int=True, is_percentage=True)
            
        results.append({
            "name": name,
            "color": item["color"],
            "em": read_value(rois["kd"], is_int=False),
            "winRate": float(wr_val) if wr_val is not None else 0.0,
            "hours": read_value(rois["time"], is_int=True)
        })
            
    return results
