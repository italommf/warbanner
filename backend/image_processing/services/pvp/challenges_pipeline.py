import os
import logging
import time
from .image_utils import load_image, normalize_resolution_ai, crop_roi
from .roi_map import get_challenge_slots
from .ocr_utils import WindowsOCR

import asyncio
from .debug_utils import save_debug_images
from api.challenge_utils import find_best_challenge_match
from ...log_styles import (
    C_CYAN, C_GREEN, C_YELLOW, C_RED, C_BLUE, C_BOLD, C_END, SEP_IMAGE
)

logger = logging.getLogger(__name__)

def run_challenges_pipeline(image_path):
    """
    Fluxo para extrair desafios/conquistas de uma screenshot dedicada (8 slots sequenciais).
    """
    start_time = time.time()
    fname = os.path.basename(image_path)
    logger.info(f"\n{C_BOLD}{C_YELLOW}[PIPELINE DESAFIOS]{C_END} 🏆 Analisando conquistas: {fname}")
    
    # Categorias para buscar por cada slot
    CATEGORIES = ["insignias", "marcas", "fitas"]
    
    try:
        # 1. Carregar e normalizar para 4K usando LANCZOS4 (Alta velocidade)
        img_raw = load_image(image_path)
        img = normalize_resolution_ai(img_raw, 3840)
        logger.info(f"   {C_GREEN}√ Upscale 4K (LANCZOS4) concluído.{C_END}")
        
        # 2. Salvar visualização dos ROIs (Ajuda o usuário a configurar no roi_map.py)
        save_debug_images(img, prefix=f"ch_{fname}")
        
        detected_items = []
        
        img_h, img_w = img.shape[:2]
        slots = get_challenge_slots(img_w)
        
        # 3. Processar cada slot sequencialmente (um por vez)
        async def process_slots_sequentially():
            import cv2
            import pytesseract
            items = []
            for i, roi_def in enumerate(slots):
                crop_full = crop_roi(img, roi_def)
                logger.info(f"      {C_CYAN}[OCR]{C_END} Lendo Slot {i+1}...")
                
                # O ícone ocupa os primeiros ~30% do slot. 
                # Vamos criar um crop secundário focado apenas no texto.
                text_x_offset = int(crop_full.shape[1] * 0.32)
                crop_text_only = crop_full[:, text_x_offset:]
                
                # Estratégia de múltiplas tentativas
                found_match = None
                # Técnicas: (imagem, nome, psm_mode)
                techniques = [
                    (crop_full, "Original", 6),
                    (crop_text_only, "Corte de Texto", 7), # PSM 7: Single line
                    (crop_text_only, "Otsu (Texto)", 7),
                    (crop_text_only, "CLAHE (Texto)", 7),
                    (crop_text_only, "Threshold Fixo (Texto)", 7)
                ]
                
                for processed_img, tech_name, psm_mode in techniques:
                    final_img = processed_img
                    
                    if "Otsu" in tech_name:
                        gray = cv2.cvtColor(processed_img, cv2.COLOR_BGR2GRAY) if len(processed_img.shape) == 3 else processed_img
                        _, final_img = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                    elif "CLAHE" in tech_name:
                        gray = cv2.cvtColor(processed_img, cv2.COLOR_BGR2GRAY) if len(processed_img.shape) == 3 else processed_img
                        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
                        final_img = clahe.apply(gray)
                    elif "Threshold Fixo" in tech_name:
                        gray = cv2.cvtColor(processed_img, cv2.COLOR_BGR2GRAY) if len(processed_img.shape) == 3 else processed_img
                        _, final_img = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
                    
                    # Tesseract Config customizada de acordo com a técnica
                    custom_config = f'--oem 3 --psm {psm_mode}'
                    
                    # Chamada direta ao pytesseract com config específica
                    try:
                        # Se for Windows, o path já foi configurado no ocr_utils_linux
                        text = pytesseract.image_to_string(final_img, lang='por+eng', config=custom_config)
                    except:
                        # Fallback para o wrapper se o pytesseract direto falhar por algum motivo
                        text = await WindowsOCR.recognize_async(final_img)
                    
                    if text and len(text.strip()) > 1:
                        raw_name = " ".join(text.split()).strip()
                        if tech_name != "Original":
                            logger.info(f"      {C_YELLOW}[Tentativa: {tech_name}]{C_END} leitura: '{raw_name}'")
                        else:
                            logger.info(f"      {C_CYAN}leitura do ocr:{C_END} '{raw_name}'")
                        
                        match = find_best_challenge_match(raw_name)
                        if match:
                            found_match = match
                            break # Encontrou!
                
                if found_match:
                    is_exact = found_match['match_type'] == 'exact'
                    display_name = found_match['official_name']
                    similarity = found_match['similarity']
                    
                    logger.info(f"      {C_CYAN}desafio encontrado com o ocr:{C_END} {C_BOLD}{str(is_exact).lower()}{C_END}")
                    if not is_exact:
                        logger.info(f"      {C_CYAN}similaridade:{C_END} {C_YELLOW}{similarity}{C_END} (Match: '{display_name}')")
                    else:
                        logger.info(f"      {C_GREEN}√ Slot {i+1} (Match Exato):{C_END} {C_BOLD}{display_name}{C_END}")

                    items.append({
                        "id": found_match['filename'],
                        "name": display_name,
                        "category": found_match['category'],
                        "score": 1.0,
                        "slot": i + 1
                    })
                else:
                    logger.info(f"      {C_CYAN}desafio encontrado com o ocr:{C_END} {C_RED}false{C_END}")
                    logger.warning(f"      {C_YELLOW}[!] Slot {i+1} não mapeado após {len(techniques)} tentativas.{C_END}")
            return items

        # Executa o bloco assíncrono sequencial
        detected_items = asyncio.run(process_slots_sequentially())

        total_found = len(detected_items)
        elapsed = time.time() - start_time
        logger.info(f"\n{C_GREEN}[COMPLETO]{C_END} Pipeline finalizado em {elapsed:.2f}s. {total_found} conquistas detectadas.")
        
        return {
            "type": "desafios",
            "detected_achievements": detected_items,
            "total_count": total_found
        }

    except Exception as e:
        logger.error(f"{C_RED}[ERRO CRÍTICO]{C_END} {e}", exc_info=True)
        return { "error": f"Erro interno no pipeline de desafios: {str(e)}" }
