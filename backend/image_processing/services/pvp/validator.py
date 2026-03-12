import cv2
import numpy as np
import os
import logging
import glob
from .image_utils import crop_roi, load_image
from .roi_map import get_main_rois, ROI_PVP_MARKER, ROI_PVE_MARKER
from ...log_styles import C_CYAN, C_END, C_YELLOW

logger = logging.getLogger(__name__)

# Pasta base de templates de modo
MODOS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'template_matching', 'modos'))

def validate_image_mode(img, expected_mode: str = "pvp"):
    """
    Valida se a imagem é do modo esperado usando Redundância Estrutural:
    1. Verifica o label do menu (JxJ ou JxA).
    2. Verifica a presença de marcadores exclusivos (Best Rank ou Missões).
    """
    if img is None:
        return False, "Imagem inválida."
    
    h, w = img.shape[:2]
    rois = get_main_rois(w)
    
    # --- PASSO 1: Validação por Label (JxJ / JxA) ---
    # Busca recursiva nas subpastas (ex: modos/pvp/pvp*.png)
    search_pattern = os.path.join(MODOS_DIR, expected_mode, f"{expected_mode}*.png")
    templates = glob.glob(search_pattern, recursive=True)
    
    label_res = False
    best_label_score = 0
    
    for tpl_path in templates:
        res, score_msg, score_val = check_template_in_roi_raw(img, rois["mode"], tpl_path)
        if res:
            label_res = True
            best_label_score = max(best_label_score, score_val)
            break
        best_label_score = max(best_label_score, score_val)

    # --- PASSO 2: Validação Estrutural (Best Rank / Missões) ---
    marker_filename = f"{expected_mode}_marker.png"
    # O marcador pode estar na raiz da pasta do modo
    marker_path = os.path.join(MODOS_DIR, expected_mode, marker_filename)
    
    marker_res, marker_msg, marker_score = check_template_in_roi_raw(img, 
        ROI_PVP_MARKER if expected_mode == "pvp" else ROI_PVE_MARKER, 
        marker_path
    )
    
    # Lógica de Decisão:
    # Se ambos passarem -> 100% certeiro
    # Se apenas um passar -> Pode ser um print cortado ou template ruim, mas damos um aviso
    
    if label_res and marker_res:
        logger.info(f"   {C_CYAN}[VALIDATOR]{C_END} Modo {expected_mode.upper()} validado com redundância.")
        return True, ""
    
    if label_res:
        logger.warning(f"   {C_YELLOW}[AVISO]{C_END} Modo detectado por Label, mas marcador estrutural ({marker_filename}) falhou.")
        return True, "" # Por enquanto deixamos passar se o label principal bater
        
    if marker_res:
        logger.info(f"   {C_CYAN}[VALIDATOR]{C_END} Modo identificado por Estrutura (Label falhou).")
        return True, ""
        
    return False, f"A imagem não contém os elementos característicos de {expected_mode.upper()}."

def check_template_in_roi_raw(img, roi_def, template_path):
    """
    Versão RAW: Sem grayscale, sem processamento.
    Apenas redimensiona o template para caber no ROI e compara em BGR.
    """
    if not os.path.exists(template_path):
        return False, "Não encontrado", 0.0

    try:
        tpl = cv2.imread(template_path)
        if tpl is None: return False, "Erro leitura", 0.0
        
        mode_roi = crop_roi(img, roi_def)
        if mode_roi.size == 0: return False, "ROI vazio", 0.0
        
        h_roi, w_roi = mode_roi.shape[:2]
        
        # Redimensiona o template para o tamanho exato do ROI (Matching RAW)
        tpl_resized = cv2.resize(tpl, (w_roi, h_roi), interpolation=cv2.INTER_AREA)
        
        # Matching Colorido (BGR)
        res = cv2.matchTemplate(mode_roi, tpl_resized, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, _ = cv2.minMaxLoc(res)
        
        tpl_name = os.path.basename(template_path)
        logger.info(f"      {C_CYAN}[TM]{C_END}  Score {tpl_name}: {max_val:.3f}")
        
        return (max_val >= 0.70), "", max_val
    except Exception as e:
        logger.error(f"Erro no check_template RAW {template_path}: {e}")
        return False, str(e), 0.0

def validate_is_pvp(img):
    return validate_image_mode(img, "pvp")

def validate_is_pve(img):
    return validate_image_mode(img, "pve")
