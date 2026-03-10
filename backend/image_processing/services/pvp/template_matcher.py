import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

class TemplateMatcher:
    def __init__(self, font_path, base_size=40):
        self.font_path = font_path
        self.base_size = base_size
        self.templates_by_size = {}
        # Pre-gerar tamanhos comuns para performance
        for size in [32, 40, 48, 56, 64, 72]:
            self._generate_templates_for_size(size)

    def _generate_templates_for_size(self, size):
        chars = "0123456789h.%"
        try:
            font = ImageFont.truetype(self.font_path, size)
        except: return
        
        self.templates_by_size[size] = {}
        for char in chars:
            img = Image.new('L', (size * 2, size * 2), color=0)
            draw = ImageDraw.Draw(img)
            bbox = draw.textbbox((0, 0), char, font=font)
            w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
            draw.text((size - w//2, size - h//2), char, font=font, fill=255)
            templ = np.array(img)
            coords = cv2.findNonZero(templ)
            if coords is not None:
                x, y, cw, ch = cv2.boundingRect(coords)
                self.templates_by_size[size][char] = templ[y:y+ch, x:x+cw]

    def match_characters(self, img, threshold=0.75):
        if img is None or img.size == 0:
            return ""

        # Limpeza de ruído
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(img, connectivity=8)
        clean_img = np.zeros_like(img)
        for i in range(1, num_labels):
            if stats[i, cv2.CC_STAT_AREA] > 10:
                clean_img[labels == i] = 255

        all_matches = []
        # Tenta em todos os tamanhos gerados
        for size, templates in self.templates_by_size.items():
            for char, templ in templates.items():
                tw, th = templ.shape[1], templ.shape[0]
                if tw > clean_img.shape[1] or th > clean_img.shape[0]:
                    continue
                
                res = cv2.matchTemplate(clean_img, templ, cv2.TM_CCOEFF_NORMED)
                locs = np.where(res >= threshold)
                
                for pt in zip(*locs[::-1]):
                    all_matches.append({
                        "x": pt[0],
                        "char": char,
                        "conf": res[pt[1], pt[0]],
                        "w": tw,
                        "size": size
                    })

        if not all_matches:
            # Tentar com threshold menor se nada for achado
            if threshold > 0.6:
                return self.match_characters(img, threshold=threshold-0.1)
            return ""

        # NMS robusto
        all_matches.sort(key=lambda x: x["conf"], reverse=True)
        final_chars = []
        for m in all_matches:
            overlap = False
            for f in final_chars:
                # Se o centro do novo match está dentro de um match existente
                m_center = m["x"] + m["w"] / 2
                if f["x"] <= m_center <= f["x"] + f["w"]:
                    overlap = True
                    break
            if not overlap:
                final_chars.append(m)

        final_chars.sort(key=lambda x: x["x"])
        return "".join([m["char"] for m in final_chars])

# Singleton instance
FONT_PATH = r'd:\Git\Projetos Pessoais\Warface Desafios\frontend\public\fonts\warfaceregularenglish.ttf'
_matcher = None

def get_template_matcher():
    global _matcher
    if _matcher is None and os.path.exists(FONT_PATH):
        _matcher = TemplateMatcher(FONT_PATH, font_size=48)
    return _matcher
