import cv2
import numpy as np
import os
import logging
import concurrent.futures
from ...log_styles import C_YELLOW, C_CYAN, C_GREEN, C_RED, C_BOLD, C_END

logger = logging.getLogger(__name__)

# Base path for achievement images (fitas, insignias, marcas) - Agora dentro de desafios/
BASE_DIR = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'imagens', 'desafios')

# Cache otimizado: { 'categoria': [ (filename, bgr_img, mask_img), ... ] }
_templates_cache = {}
TARGET_SIZE = (128, 128) # Tamanho fixo para matching ultra rápido

def _process_single_template(path, filename):
    """Lê e pré-processa uma única imagem para o cache."""
    try:
        img_path = os.path.join(path, filename)
        img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
        if img is None: return None
        
        # Redimensiona para o tamanho padrão de matching
        img_resized = cv2.resize(img, TARGET_SIZE)
        
        mask = None
        if len(img_resized.shape) == 3 and img_resized.shape[2] == 4:
            mask = img_resized[:, :, 3]
            bgr = img_resized[:, :, 0:3]
        else:
            bgr = img_resized
            if len(bgr.shape) == 2:
                bgr = cv2.cvtColor(bgr, cv2.COLOR_GRAY2BGR)
        
        # Calcula a cor média do template (apenas onde não é transparente)
        if mask is not None and np.sum(mask) > 0:
            avg_color = cv2.mean(bgr, mask=mask)[:3]
        else:
            avg_color = cv2.mean(bgr)[:3]
            
        return (filename, bgr, mask, avg_color)
    except Exception:
        return None

def _load_achievement_templates(ach_type):
    """Carrega imagens com processamento paralelo e redimensionamento fixo."""
    global _templates_cache
    if ach_type in _templates_cache:
        return _templates_cache[ach_type]
    
    path = os.path.join(BASE_DIR, ach_type)
    if not os.path.exists(path):
        logger.error(f"{C_RED}[ACHIEVEMENT]{C_END} Pasta não encontrada: {C_BOLD}{path}{C_END}")
        return []
    
    valid_extensions = ('.png', '.jpg', '.jpeg')
    files = [f for f in os.listdir(path) if f.lower().endswith(valid_extensions)]
    
    logger.info(f"{C_CYAN}[ACHIEVEMENT]{C_END} Indexando {len(files)} templates de {C_BOLD}{ach_type}{C_END}...")
    
    templates = []
    # Usa threads para carregar as imagens do disco mais rápido
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(_process_single_template, path, f) for f in files]
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res: templates.append(res)
             
    _templates_cache[ach_type] = templates
    logger.info(f"{C_GREEN}[ACHIEVEMENT]{C_END} {len(templates)} templates prontos para {C_BOLD}{ach_type}{C_END}.")
    return templates

def match_achievement(roi_img, ach_type, threshold=0.8):
    """
    Matching ultra otimizado com filtro de cor.
    Ignora fundos variados usando Alpha Mask.
    """
    templates = _load_achievement_templates(ach_type)
    if not templates: return None, 0
    
    # 1. Redimensiona a ROI de entrada para o mesmo tamanho fixo dos templates
    roi_resized = cv2.resize(roi_img, TARGET_SIZE)
    # Calcula a cor média da ROI para filtragem rápida
    roi_avg = cv2.mean(roi_resized)[:3]
    
    best_match = None
    best_score = -1
    
    # 2. Loop de matching ultra otimizado
    for filename, temp_bgr, temp_mask, temp_avg in templates:
        # FILTRO DE COR: Se a cor for muito diferente, pula (distância Euclidiana > 60)
        # Isso reduz drasticamente os arquivos processados por slot.
        color_dist = np.sqrt(sum((roi_avg[i] - temp_avg[i])**2 for i in range(3)))
        if color_dist > 70: # Ajuste esse valor se estiver ignorando demais
            continue

        try:
            # TM_CCOEFF_NORMED com máscara é muito preciso para ícones com fundo transparente
            res = cv2.matchTemplate(roi_resized, temp_bgr, cv2.TM_CCOEFF_NORMED, mask=temp_mask)
            _, max_val, _, _ = cv2.minMaxLoc(res)
            
            if max_val > best_score:
                best_score = max_val
                best_match = filename
                
            # Early exit se encontrar um match perfeito
            if best_score > 0.97: break # Match praticamente idêntico
                
        except Exception:
            continue
            
    if best_match and best_score >= threshold:
        return best_match, best_score
    
    return None, best_score
