import cv2
import numpy as np
import os

def load_image(image_path):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Imagem não encontrada: {image_path}")
    img = cv2.imread(image_path)
    if img is None:
        raise Exception(f"Erro ao carregar imagem: {image_path}")
    return img

def normalize_resolution(img, target_width=1920):
    """
    Redimensiona a imagem para uma largura padrão mantendo o aspect ratio.
    Isso garante que as coordenadas proporcionais do ROI_MAP funcionem.
    """
    h, w = img.shape[:2]
    aspect_ratio = h / w
    target_height = int(target_width * aspect_ratio)
    return cv2.resize(img, (target_width, target_height), interpolation=cv2.INTER_LANCZOS4)

def crop_roi(img, roi_def):
    """
    Recorta uma região de interesse (ROI).
    roi_def: {"x": start_x, "y": start_y, "w": width, "h": height, "zoom": magnification}
    """
    x, y, w, h = roi_def["x"], roi_def["y"], roi_def["w"], roi_def["h"]
    zoom = roi_def.get("zoom", 1.0)
    
    crop = img[y:y+h, x:x+w]
    
    if zoom > 1.0:
        new_w = int(w * zoom)
        new_h = int(h * zoom)
        crop = cv2.resize(crop, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        
    return crop
