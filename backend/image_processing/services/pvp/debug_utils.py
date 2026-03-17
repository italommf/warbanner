import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from .image_utils import crop_roi
from .roi_map import get_main_rois, get_pve_rois, get_class_rois, get_challenge_slots

from django.conf import settings

DEBUG_DIR = "debug_outputs"

def hex_to_bgr(hex_str: str):
    if not hex_str or not isinstance(hex_str, str): return (255, 255, 255)
    hex_str = hex_str.lstrip('#')
    try:
        r, g, b = tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))
        return (b, g, r)
    except:
        return (255, 128, 0)

def get_font(size):
    """Tenta carregar uma fonte que suporte UTF-8 no Windows."""
    paths = [
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\verdana.ttf"
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except:
                continue
    return ImageFont.load_default()

def draw_diagnostic_rois(canvas, report):
    """
    Desenha os textos de diagnóstico e caixas coloridas usando PIL (Pillow)
    para suportar acentos e caracteres especiais (UTF-8).
    """
    if not report:
        return canvas
        
    h, w = canvas.shape[:2]
    scale_factor = w / 3840.0
    
    # Converte OpenCV (BGR) para PIL (RGB)
    img_pil = Image.fromarray(cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(img_pil)
    
    # Configura fontes baseada na escala
    font_size = int(60 * (w / 3840.0))
    font = get_font(font_size)
    
    for item in report:
        roi = item.get("roi")
        if not roi: continue
        
        # Cores (PIL usa RGB)
        bgr = hex_to_bgr(item.get("color", "#ffaa00"))
        rgb = (bgr[2], bgr[1], bgr[0])
        
        x, y, rw, rh = roi["x"], roi["y"], roi["w"], roi["h"]
        
        # 1. Desenhar Retângulo (Borda)
        thickness = max(2, int(4 * scale_factor))
        # ImageDraw.rectangle não tem espessura em versões antigas, desenhamos manual se necessário
        # Mas vamos usar o canvas original para a caixa pra garantir precisão e simplificar
        cv2.rectangle(canvas, (x, y), (x + rw, y + rh), bgr, thickness)
        
        # 2. Desenhar Textos usando PIL
        slot = item.get("slot")
        if slot:
            # Lógica para converter slot (1-8) em grade L1-4 e C1-2
            row = ((slot - 1) % 4) + 1
            col = ((slot - 1) // 4) + 1
            main_label = f"L{row} C{col}"
        else:
            main_label = item.get("name") or item.get("assigned_value") or "???"

        match_type = item.get("match_type", "exact")
        is_similarity = match_type == "similarity"
        is_review = match_type in ["failed", "similarity"]
        
        # Medir texto para background
        try:
            left, top, right, bottom = font.getbbox(main_label)
            tw, th = right - left, bottom - top
        except:
            tw, th = draw.textsize(main_label, font=font)
        
        bg_w = tw + 40
        bg_h = th + 40
        
        # Se for muito perto do topo, desenha abaixo do ROI
        text_y = y - 20 if y > bg_h + 20 else y + rh + bg_h + 20
        
        # 1. Desenhar Fundo Principal (Sombra)
        draw.rectangle([x, text_y - bg_h, x + bg_w, text_y], fill=(0, 0, 0, 200), outline=rgb, width=2)
        
        # 2. Desenhar Badges (Style Mockup)
        badge_font_size = int(font_size * 0.7)
        badge_font = get_font(badge_font_size)
        
        # Badge REVISAR (Superior Direito do quadro de texto)
        if is_review:
            badge_text = "REVISAR"
            try:
                l, t, r, b = badge_font.getbbox(badge_text)
                bw, bh = r - l, b - t
            except:
                bw, bh = draw.textsize(badge_text, font=badge_font)
            
            bx, by = x + bg_w + 10, text_y - bg_h
            draw.rectangle([bx - 10, by - 5, bx + bw + 10, by + bh + 10], fill=(241, 196, 15), outline=(255, 255, 255))
            draw.text((bx, by), badge_text, font=badge_font, fill=(0, 0, 0))

        # Badge SIMILARIDADE (Ao lado do label principal)
        if is_similarity:
            similarity_text = f"{int(item.get('similarity', 0)*100)}%"
            try:
                l, t, r, b = badge_font.getbbox(similarity_text)
                sw, sh = r - l, b - t
            except:
                sw, sh = draw.textsize(similarity_text, font=badge_font)
            
            sx, sy = x + bg_w + 10, text_y - sh - 5
            # Se já tem o revisar em cima, desce esse badge
            if is_review: sy += 50

            draw.rectangle([sx - 10, sy - 5, sx + sw + 10, sy + sh + 10], fill=(230, 126, 34), outline=(255, 255, 255))
            draw.text((sx, sy), similarity_text, font=badge_font, fill=(255, 255, 255))

        # 3. Desenhar Label Principal
        draw.text((x + 20, text_y - bg_h + 10), main_label, font=font, fill=(255, 255, 255))
        
    # Converte de volta: PIL (RGB) -> OpenCV (BGR)
    final_img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
    
    # Como desenhamos o retângulo no 'canvas' (OpenCV) e o texto no 'img_pil', 
    # precisamos garantir que o final_img tenha a borda também.
    # A maneira mais segura é desenhar a borda no 'final_img' agora.
    for item in report:
        roi = item.get("roi")
        if not roi: continue
        bgr = hex_to_bgr(item.get("color", "#ffaa00"))
        x, y, rw, rh = roi["x"], roi["y"], roi["w"], roi["h"]
        thickness = max(2, int(4 * scale_factor))
        cv2.rectangle(final_img, (x, y), (x + rw, y + rh), bgr, thickness)

    return final_img

def save_debug_images(img, prefix="debug"):
    """
    Saves ROI crops and a visualization of all ROIs for debugging purposes.
    """
    if not settings.DEBUG:
        return
        
    if not os.path.exists(DEBUG_DIR):
        os.makedirs(DEBUG_DIR)
        
    cv2.imwrite(os.path.join(DEBUG_DIR, f"{prefix}_normalized.png"), img)
    
    debug_vis = img.copy()
    img_h, img_w = img.shape[:2]
    is_challenge = "ch_" in prefix.lower()

    if not is_challenge:
        main_rois = get_main_rois(img_w)
        for name, roi_def in main_rois.items():
            base_w = roi_def.get("base", 1920)
            scale = img_w / float(base_w)
            x, y, w, h = int(roi_def["x"]*scale), int(roi_def["y"]*scale), int(roi_def["w"]*scale), int(roi_def["h"]*scale)
            cv2.rectangle(debug_vis, (x, y), (x+w, y+h), (0, 165, 255), 2 * int(scale))
    else:
        slots = get_challenge_slots(img_w)
        for i, roi_def in enumerate(slots):
            base_w = roi_def.get("base", 1920)
            scale = img_w / float(base_w)
            x, y, w, h = int(roi_def["x"]*scale), int(roi_def["y"]*scale), int(roi_def["w"]*scale), int(roi_def["h"]*scale)
            cv2.rectangle(debug_vis, (x, y), (x+w, y+h), (255, 0, 255), 2 * int(scale))

    cv2.imwrite(os.path.join(DEBUG_DIR, f"{prefix}_normalized_with_rois.png"), debug_vis)
    return debug_vis
