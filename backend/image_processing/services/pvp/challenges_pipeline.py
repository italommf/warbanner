import os
import logging
import time
from .image_utils import load_image, normalize_resolution_ai, crop_roi
from .roi_map import get_challenge_slots
from .ocr_utils_win import WindowsOCR
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
            items = []
            for i, roi_def in enumerate(slots):
                crop = crop_roi(img, roi_def)
                logger.info(f"      {C_CYAN}[OCR]{C_END} Lendo Slot {i+1}...")
                
                text = await WindowsOCR.recognize_async(crop)
                
                if text and len(text.strip()) > 1:
                    raw_name = " ".join(text.split()).strip()
                    logger.info(f"      {C_CYAN}leitura do ocr:{C_END} '{raw_name}'")
                    
                    # Tenta encontrar o desafio oficial
                    match = find_best_challenge_match(raw_name)
                    
                    if match:
                        is_exact = match['match_type'] == 'exact'
                        display_name = match['official_name']
                        similarity = match['similarity']
                        
                        logger.info(f"      {C_CYAN}desafio encontrado com o ocr:{C_END} {C_BOLD}{str(is_exact).lower()}{C_END}")
                        if not is_exact:
                            logger.info(f"      {C_CYAN}similaridade:{C_END} {C_YELLOW}{similarity}{C_END} (Match: '{display_name}')")
                        else:
                            logger.info(f"      {C_GREEN}√ Slot {i+1} (Match Exato):{C_END} {C_BOLD}{display_name}{C_END}")

                        items.append({
                            "id": match['filename'],
                            "name": display_name,
                            "category": match['category'],
                            "score": 1.0,
                            "slot": i + 1
                        })
                    else:
                        logger.info(f"      {C_CYAN}desafio encontrado com o ocr:{C_END} {C_RED}false{C_END}")
                        logger.warning(f"      {C_YELLOW}[!] Slot {i+1} não mapeado.{C_END}")
                else:
                    logger.debug(f"      Slot {i+1}: Vazio.")
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
