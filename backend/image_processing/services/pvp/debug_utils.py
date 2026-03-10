import os
import cv2
from .image_utils import crop_roi
from .roi_map import MAIN_ROIS, CLASS_ROIS

DEBUG_DIR = "debug_outputs"

def save_debug_images(img, prefix="debug"):
    """
    Saves ROI crops and a visualization of all ROIs for debugging purposes.
    Updated for absolute coordinates paradigm.
    """
    if not os.path.exists(DEBUG_DIR):
        os.makedirs(DEBUG_DIR)
        
    # Salva a imagem normalizada base
    cv2.imwrite(os.path.join(DEBUG_DIR, f"{prefix}_normalized.png"), img)
    
    # Criar uma cópia para desenhar os retângulos
    debug_vis = img.copy()

    # 1. Processar ROIs Principais
    for name, roi_def in MAIN_ROIS.items():
        x, y, w, h = roi_def["x"], roi_def["y"], roi_def["w"], roi_def["h"]
        
        # Desenhar retângulo
        cv2.rectangle(debug_vis, (x, y), (x+w, y+h), (0, 165, 255), 2)
        cv2.putText(debug_vis, name, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
        
        # Salvar recorte
        crop = crop_roi(img, roi_def)
        cv2.imwrite(os.path.join(DEBUG_DIR, f"{prefix}_roi_{name}.png"), crop)

    # 2. Processar ROIs de Classes
    for item in CLASS_ROIS:
        c_name = item["name"].lower().replace("-atirador", "_sniper").replace("médico", "medico")
        for stat, roi_def in item["rois"].items():
            x, y, w, h = roi_def["x"], roi_def["y"], roi_def["w"], roi_def["h"]
            full_name = f"{c_name}_{stat}"
            
            cv2.rectangle(debug_vis, (x, y), (x+w, y+h), (0, 255, 0), 1)
            
            crop = crop_roi(img, roi_def)
            cv2.imwrite(os.path.join(DEBUG_DIR, f"{prefix}_roi_{full_name}.png"), crop)

    # 3. Processar ROIs de PvE (se existirem no prefixo ou imagem)
    from .roi_map import PVE_ROIS
    if "pve" in prefix.lower():
        for name, roi_def in PVE_ROIS.items():
            x, y, w, h = roi_def["x"], roi_def["y"], roi_def["w"], roi_def["h"]
            cv2.rectangle(debug_vis, (x, y), (x+w, y+h), (255, 0, 0), 2)
            cv2.putText(debug_vis, f"pve_{name}", (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
            crop = crop_roi(img, roi_def)
            cv2.imwrite(os.path.join(DEBUG_DIR, f"{prefix}_roi_pve_{name}.png"), crop)

    # Salva a imagem final com todos os retângulos desenhados
    cv2.imwrite(os.path.join(DEBUG_DIR, f"{prefix}_normalized_with_rois.png"), debug_vis)
    print(f"[DEBUG] Imagens de diagnóstico salvas em: {DEBUG_DIR}/")
