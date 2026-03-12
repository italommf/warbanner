import os
import cv2
from .image_utils import crop_roi
from .roi_map import get_main_rois, get_pve_rois, get_class_rois, get_challenge_slots

DEBUG_DIR = "debug_outputs"

def save_debug_images(img, prefix="debug"):
    """
    Saves ROI crops and a visualization of all ROIs for debugging purposes.
    DPI-Aware: Ajusta o desenho dos retângulos conforme a resolução da imagem (ex: 4K).
    """
    if not os.path.exists(DEBUG_DIR):
        os.makedirs(DEBUG_DIR)
        
    # Salva a imagem normalizada base
    cv2.imwrite(os.path.join(DEBUG_DIR, f"{prefix}_normalized.png"), img)
    
    # Criar uma cópia para desenhar os retângulos
    debug_vis = img.copy()
    is_challenge = "ch_" in prefix.lower()

    if not is_challenge:
        img_h, img_w = img.shape[:2]
        
        # Carregar ROIs específicas para esta resolução
        main_rois = get_main_rois(img_w)
        class_rois = get_class_rois(img_w)
        pve_rois = get_pve_rois(img_w)

        # 1. Processar ROIs Principais
        for name, roi_def in main_rois.items():
            # A escala aqui é interna do ROI_MAP (ex: base 3840 ou 1920)
            base_w = roi_def.get("base", 1920)
            scale = img_w / float(base_w)
            
            x = int(roi_def["x"] * scale)
            y = int(roi_def["y"] * scale)
            w = int(roi_def["w"] * scale)
            h = int(roi_def["h"] * scale)
            
            # Desenhar retângulo
            cv2.rectangle(debug_vis, (x, y), (x+w, y+h), (0, 165, 255), 2 * int(scale))
            cv2.putText(debug_vis, name, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6 * scale, (0, 165, 255), int(2 * scale))
            
            # Salvar recorte
            crop = crop_roi(img, roi_def)
            cv2.imwrite(os.path.join(DEBUG_DIR, f"{prefix}_roi_{name}.png"), crop)

        # 2. Processar ROIs de Classes
        for item in class_rois:
            c_name = item["name"].lower().replace("-atirador", "_sniper").replace("médico", "medico")
            for stat, roi_def in item["rois"].items():
                base_w = roi_def.get("base", 1920)
                scale = img_w / float(base_w)
                
                x = int(roi_def["x"] * scale)
                y = int(roi_def["y"] * scale)
                w = int(roi_def["w"] * scale)
                h = int(roi_def["h"] * scale)
                full_name = f"{c_name}_{stat}"
                
                cv2.rectangle(debug_vis, (x, y), (x+w, y+h), (0, 255, 0), int(1 * scale))
                
                crop = crop_roi(img, roi_def)
                cv2.imwrite(os.path.join(DEBUG_DIR, f"{prefix}_roi_{full_name}.png"), crop)

        # 3. Processar ROIs de PvE
        if "pve" in prefix.lower():
            for name, roi_def in pve_rois.items():
                base_w = roi_def.get("base", 1920)
                scale = img_w / float(base_w)
                
                x = int(roi_def["x"] * scale)
                y = int(roi_def["y"] * scale)
                w = int(roi_def["w"] * scale)
                h = int(roi_def["h"] * scale)
                cv2.rectangle(debug_vis, (x, y), (x+w, y+h), (255, 0, 0), int(2 * scale))
                cv2.putText(debug_vis, f"pve_{name}", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6 * scale, (255, 0, 0), int(2 * scale))
                crop = crop_roi(img, roi_def)
                cv2.imwrite(os.path.join(DEBUG_DIR, f"{prefix}_roi_pve_{name}.png"), crop)

    else:
        # 4. Processar APENAS ROIs de Conquistas (Desafios)
        img_h, img_w = img.shape[:2]
        slots = get_challenge_slots(img_w)
        if slots:
            color = (255, 0, 255) # Rosa para todos os slots de desafio
            for i, roi_def in enumerate(slots):
                base_w = roi_def.get("base", 1920)
                scale = img_w / float(base_w)
                
                x = int(roi_def["x"] * scale)
                y = int(roi_def["y"] * scale)
                w = int(roi_def["w"] * scale)
                h = int(roi_def["h"] * scale)
                cv2.rectangle(debug_vis, (x, y), (x+w, y+h), color, int(2 * scale))
                cv2.putText(debug_vis, f"slot_{i+1}", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6 * scale, color, int(2 * scale))
                
                crop = crop_roi(img, roi_def)
                cv2.imwrite(os.path.join(DEBUG_DIR, f"{prefix}_roi_slot_{i+1}.png"), crop)

    # Salva a imagem final com todos os retângulos desenhados
    cv2.imwrite(os.path.join(DEBUG_DIR, f"{prefix}_normalized_with_rois.png"), debug_vis)
    print(f"[DEBUG] Imagens de diagnóstico salvas em: {DEBUG_DIR}/")
