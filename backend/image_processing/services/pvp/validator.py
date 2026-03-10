from .image_utils import crop_roi, load_image
from .ocr_utils_win import read_text_win
from .roi_map import ROI_MODE

def validate_image_mode(img, expected_mode: str = "pvp"):
    """
    Valida se a imagem é do modo esperado (pvp ou pve).
    No jogo, PvP é 'JvJ' e PvE é 'JxA'.
    """
    if img is None:
        return False, "Imagem inválida."
    
    # O ROI_MODE é o mesmo para ambos os modos
    mode_text = read_text_win(crop_roi(img, ROI_MODE)).upper().strip()
    
    if expected_mode == "pvp":
        # Procura por JvJ ou variações comuns do OCR
        if any(m in mode_text for m in ["JVJ", "JV J", "JW", "JV", "VJ"]):
            return True, ""
        else:
            return False, f"Imagem não é PvP (JvJ). Detectado: '{mode_text}'"
    else: # pve
        # Procura estritamente por JxA ou o que o OCR ler (PxA, IXA, etc)
        if any(m in mode_text for m in ["JXA", "JX A", "IXA", "PXA", "XA"]):
            return True, ""
        else:
            return False, f"Imagem não é PvE (JxA). Detectado: '{mode_text}'"

def validate_is_pvp(img):
    return validate_image_mode(img, "pvp")

def validate_is_pve(img):
    return validate_image_mode(img, "pve")
