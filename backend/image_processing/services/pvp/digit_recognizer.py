import cv2
import numpy as np
import os
import logging
from ...log_styles import C_YELLOW, C_CYAN, C_GREEN, C_RED, C_BOLD, C_END

logger = logging.getLogger(__name__)

# Caminho das imagens de referência (0-9, h, [], ., %)
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'template_matching', '0a9 h [ ]')

# Cache dos templates binarizados
_templates_cache = None

def _load_templates():
    """
    Carrega todas as imagens de referência (.png) da pasta de templates.
    Agrupa variantes (ex: 1.png, 1-1080.png) em listas por caractere.
    """
    global _templates_cache
    if _templates_cache is not None:
        return _templates_cache
    
    templates = {}
    if not os.path.exists(TEMPLATES_DIR):
        logger.error(f"[DIGIT-MATCH] Pasta de templates não encontrada: {TEMPLATES_DIR}")
        return {}

    count = 0
    for filename in os.listdir(TEMPLATES_DIR):
        if not filename.endswith(".png"):
            continue
            
        path = os.path.join(TEMPLATES_DIR, filename)
        
        # Extrai o caractere base (primeiro caractere do nome do arquivo)
        # Ex: "1.png" -> "1", "1-1080.png" -> "1", "%4kup.png" -> "%"
        base_name = filename.split('.')[0]
        if not base_name: continue
        char_key = base_name[0]
            
        img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        if img is not None:
            # Binarização idêntica à da ROI (Otsu)
            _, binary = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            # Normaliza para Texto Branco em Fundo Preto
            if np.mean(binary) > 127:
                binary = cv2.bitwise_not(binary)
                
            if char_key not in templates:
                templates[char_key] = []
            templates[char_key].append(binary)
            count += 1
    
    _templates_cache = templates
    logger.info(f"[DIGIT-MATCH] {len(templates)} caracteres únicos carregados ({count} variantes no total).")
    return templates

def _segment_digits_with_x(roi_crop):
    """
    Segmenta caracteres individuais retornando a imagem e a posição X.
    """
    if len(roi_crop.shape) == 3:
        gray = cv2.cvtColor(roi_crop, cv2.COLOR_BGR2GRAY)
    else:
        gray = roi_crop.copy()
    
    # Binarização adaptativa
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Se fundo for mais claro que os caracteres, inverte
    if np.mean(binary) > 127:
        binary = cv2.bitwise_not(binary)
    
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours: return []
    
    h_img = binary.shape[0]
    # Filtro de altura flexível (30% a 95% da ROI)
    min_h = h_img * 0.3
    
    boxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        # Mantém dígitos (altura >= 30%) OU pontos decimais (pequenos, mas existentes)
        if (h >= min_h and w >= 2) or (h >= 2 and w >= 2):
            boxes.append((x, y, w, h))
    
    boxes.sort(key=lambda b: b[0])
    
    elements = []
    for (x, y, w, h) in boxes:
        elements.append((binary[y:y+h, x:x+w], x))
    return elements

def _match_digit(digit_img, templates, x_pos=0):
    """
    Compara um recorte contra os templates disponíveis.
    """
    best_score = -1
    best_char = "?"
    
    target_size = (40, 60)
    try:
        digit_resized = cv2.resize(digit_img, target_size, interpolation=cv2.INTER_CUBIC)
    except:
        return "?", 0
    
    scores = {}
    for char, variant_list in templates.items():
        best_variant_score = -1
        for template in variant_list:
            try:
                tmpl_resized = cv2.resize(template, target_size, interpolation=cv2.INTER_CUBIC)
                result = cv2.matchTemplate(digit_resized, tmpl_resized, cv2.TM_CCOEFF_NORMED)
                score = float(result[0][0])
                
                if score > best_variant_score:
                    best_variant_score = score
            except:
                continue
        
        scores[char] = best_variant_score
        if best_variant_score > best_score:
            best_score = best_variant_score
            best_char = char
    
    # Filtro de confiança mínima
    if best_score < 0.60:
        best_char = "?"

    # Log formatado dos Top 4 matches
    s_sorted = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:4]
    scores_str = " | ".join([f"'{k}':{v:.2f}" for k, v in s_sorted])
    
    color = C_GREEN if best_score >= 0.8 else C_YELLOW if best_score >= 0.60 else C_RED
    logger.info(f"      [Match X:{x_pos:03d}] {scores_str} => {C_BOLD}{color}{best_char}{C_END} ({best_score:.3f})")
    
    return best_char, best_score

def recognize_number(roi_crop, is_percentage=False):
    """
    Extrai número inteiro de uma ROI.
    """
    templates = _load_templates()
    elements = _segment_digits_with_x(roi_crop)
    if not elements: return None
    
    chars = []
    total_score = 0
    symbols_found = []
    
    for img, x in elements:
        char, score = _match_digit(img, templates, x_pos=x)
        if char.isdigit():
            chars.append(char)
            total_score += score
        elif char in ["%", "h"]:
            symbols_found.append(char)
    
    res_str = "".join(chars)
    if not res_str: return None
    val = int(res_str)
    
    # Normalização agressiva para porcentagens (0-100)
    if is_percentage or "%" in symbols_found:
        # Enquanto for maior que 100, dividimos por 10 para remover "zeros extras" do símbolo %
        while val > 100:
            val = val // 10
            
    avg = total_score / len(chars)
    logger.info(f"   {C_GREEN}√ Resultado FINAL {C_CYAN}INT{C_GREEN}: {C_BOLD}{val}{C_END} (Confia: {avg:.2f})")
    return val

def recognize_decimal(roi_crop):
    """
    Extrai decimal (float) de uma ROI.
    """
    templates = _load_templates()
    elements = _segment_digits_with_x(roi_crop)
    if not elements: return None
    
    final_elements = []
    sum_s = 0
    count_s = 0
    
    h_img = roi_crop.shape[0]
    
    for img, x in elements:
        char, score = _match_digit(img, templates, x_pos=x)
        if char.isdigit():
            final_elements.append((x, char))
            sum_s += score
            count_s += 1
        elif img.shape[0] < h_img * 0.3 and img.shape[1] < h_img * 0.3:
            # Ponto decimal é pequeno
            final_elements.append((x, "."))
            
    if not final_elements: return None
    
    final_elements.sort(key=lambda e: e[0])
    res_str = "".join([e[1] for e in final_elements]).strip('.')
    
    # Garantir apenas um ponto
    if '.' in res_str:
        parts = res_str.split('.')
        res_str = f"{parts[0]}.{''.join(parts[1:])}"
        
    avg = sum_s / max(1, count_s)
    logger.info(f"   {C_GREEN}√ Resultado FINAL {C_CYAN}DEC{C_GREEN}: {C_BOLD}{res_str}{C_END} (Confia: {avg:.2f})")
    try:
        return float(res_str)
    except:
        return 0.0

def extract_rank_from_nickname(roi_crop):
    """
    Extrai o número de rank entre colchetes [ ] no final do nickname.
    Tenta múltiplas estratégias de binarização para lidar com fundos coloridos/ruidosos.
    """
    templates = _load_templates()
    if not templates: return None

    # Converter para cinza uma única vez
    if len(roi_crop.shape) == 3:
        gray = cv2.cvtColor(roi_crop, cv2.COLOR_BGR2GRAY)
    else:
        gray = roi_crop.copy()

    # Estratégias de binarização (Padrão, Hard-Threshold 200, CLAHE)
    strategies = [
        ("Otsu", lambda g: cv2.threshold(g, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]),
        ("High-Pass (Fixed 200)", lambda g: cv2.threshold(g, 200, 255, cv2.THRESH_BINARY)[1]),
        ("CLAHE + Otsu", lambda g: cv2.threshold(cv2.createCLAHE(clipLimit=2.5).apply(g), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1])
    ]

    for strat_name, binarize_func in strategies:
        try:
            binary = binarize_func(gray)
            
            # Se fundo for mais claro, inverte
            if np.mean(binary) > 127:
                binary = cv2.bitwise_not(binary)
            
            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not contours: continue

            h_img = binary.shape[0]
            boxes = []
            for cnt in contours:
                x, y, w, h = cv2.boundingRect(cnt)
                if h >= h_img * 0.3 and w >= 2:
                    boxes.append((binary[y:y+h, x:x+w], x))
            
            if not boxes: continue
            boxes.sort(key=lambda b: b[1])

            detected_chars = []
            for img, x in boxes:
                char, score = _match_digit(img, templates, x_pos=x)
                if char != "?":
                    detected_chars.append(char)
            
            full_str = "".join(detected_chars)
            
            import re
            match = re.search(r'\[(\d+)\]', full_str)
            if match:
                val = int(match.group(1))
                logger.info(f"   {C_GREEN}√ Rank Extraído ({strat_name}):{C_END} {C_BOLD}{val}{C_END}")
                return val
                
        except Exception:
            continue

    logger.warning(f"   {C_RED}[AVISO]{C_END} Não foi possível extrair rank numérico do nickname (fundos complexos).")
    return None
