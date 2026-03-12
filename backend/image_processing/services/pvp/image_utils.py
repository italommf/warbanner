import cv2
import numpy as np
import os
from .realesrgan_service import upscale_image_ai

def load_image(image_path):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Imagem não encontrada: {image_path}")
    img = cv2.imread(image_path)
    if img is None:
        raise Exception(f"Erro ao carregar imagem: {image_path}")
    
    # Validação de Resolução Mínima (720p = 1280 wide)
    h, w = img.shape[:2]
    if w < 1280:
        raise Exception(f"Resolução insuficiente ({w}x{h}). O mínimo permitido é 720p (1280px de largura).")
        
    return img

def normalize_resolution(img, target_width=1920):
    """
    Normaliza a imagem para FullHD (1080p).
    """
    h, w = img.shape[:2]
    if w == target_width:
        return img
    
    aspect_ratio = h / w
    target_height = int(target_width * aspect_ratio)
    # INTER_LANCZOS4 é o melhor algoritmo matemático para redimensionamento de alta fidelidade
    return cv2.resize(img, (target_width, target_height), interpolation=cv2.INTER_LANCZOS4)

def normalize_resolution_ai(img, target_width=3840):
    """
    Normaliza a imagem para 4K usando Upscale Matemático de alta fidelidade (LANCZOS4).
    Muito mais rápido que a IA e mantém excelente nitidez para o reconhecimento de dígitos.
    """
    return normalize_resolution(img, target_width=target_width)

def crop_roi(img, roi_def, enhance_for_ocr=True):
    """
    Recorta uma região de interesse (ROI) com upscale de alta qualidade.
    DPI-Aware: Garante que os pixels originais sejam preservados independente da resolução.
    """
    img_h, img_w = img.shape[:2]
    
    # Usa a base definida no ROI ou 1920 (FullHD) por padrão
    base_width = roi_def.get("base", 1920)
    scale = img_w / float(base_width)
    
    x = int(roi_def["x"] * scale)
    y = int(roi_def["y"] * scale)
    w = int(roi_def["w"] * scale)
    h = int(roi_def["h"] * scale)
    zoom = roi_def.get("zoom", 1.0)
    
    # Garante que não extrapole os limites da imagem original
    x = max(0, min(x, img_w - 1))
    y = max(0, min(y, img_h - 1))
    w = max(1, min(w, img_w - x))
    h = max(1, min(h, img_h - y))
    
    crop = img[y:y+h, x:x+w]
    
    if crop.size == 0:
        return crop
    
    # Se a imagem for pequena or zoom for pedido, aplicamos upscale de alta fidelidade
    # Aumentar um pouco a imagem ajuda o motor do Windows a ler fontes pequenas
    base_zoom = 1.0
    if img_w < 1920: base_zoom = 1920 / img_w
    
    final_zoom = zoom * base_zoom
    
    if final_zoom > 1.0:
        new_w = int(crop.shape[1] * final_zoom)
        new_h = int(crop.shape[0] * final_zoom)
        # INTER_CUBIC preserva melhor as bordas dos caracteres do que LINEAR ou NEAREST
        crop = cv2.resize(crop, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    
    return crop
