import os
import logging
from .image_utils import load_image, normalize_resolution, normalize_resolution_ai
from .validator import validate_is_pvp
from .main_stats_extractor import extract_main_stats
from .class_stats_extractor import extract_class_stats
from .parsers import validate_pvp_stats
from .debug_utils import save_debug_images
from ...log_styles import (
    C_CYAN, C_GREEN, C_YELLOW, C_RED, C_BLUE, C_BOLD, C_END, SEP_IMAGE
)

logger = logging.getLogger(__name__)

def run_pvp_pipeline(image_path):
    """
    Fluxo completo para extrair estatísticas PvP usando Template Matching.
    """
    fname = os.path.basename(image_path)
    logger.info(f"\n{C_BOLD}{C_CYAN}[PIPELINE PVP]{C_END} 🔍 Analisando (Modo Normal 1080p): {fname}")
    
    try:
        # 1. Carregar e normalizar para 4K usando LANCZOS4 (Alta velocidade)
        img_raw = load_image(image_path)
        img = normalize_resolution_ai(img_raw, 3840)
        logger.info(f"   {C_GREEN}√ Upscale 4K (LANCZOS4) concluído.{C_END}")
        
        # 2. Debug e Validação de Modo (Ultra High Fidelity)
        save_debug_images(img, prefix=fname)
        
        is_pvp, error = validate_is_pvp(img)
        if not is_pvp:
            logger.error(f"{C_RED}[VALIDAÇÃO]{C_END} Imagem não é PvP: {error}")
            return { "error": error }
        
        logger.info(f"{C_GREEN}[VALIDAÇÃO]{C_END} Modo JvJ (PvP) detectado com sucesso.")

        # 3. Extrair Estatísticas Principais (DPI Aware)
        logger.info(f"{C_BLUE}[EXTRAÇÃO]{C_END} Raspando estatísticas principais...")
        main_stats = extract_main_stats(img)
        nickname = main_stats.get("nickname", "???")
        total_hours = main_stats.get("total_hours", 0)
        
        logger.info(f"   {C_CYAN}» Nickname:{C_END} {C_BOLD}{nickname}{C_END}")
        
        # Best Rank
        br = main_stats.get("best_rank", {})
        br_str = f"{br.get('tier', 'N/A')} ({br.get('rp', 0)} RP)"
        logger.info(f"   {C_CYAN}» Ranking:{C_END}  {C_BOLD}{br_str}{C_END}")
        
        logger.info(f"   {C_CYAN}» Stats:{C_END}    {total_hours}h | KD: {main_stats.get('kd_ratio', 0.0)} EM | WR: {main_stats.get('win_rate', 0.0)}%")
        
        # 4. Extrair Estatísticas por Classe (DPI Aware)
        logger.info(f"{C_BLUE}[EXTRAÇÃO]{C_END} Raspando dados por classe...")
        classes = extract_class_stats(img)
        for s in classes:
            kd = s.get('em') or 0.0
            wr = s.get('winRate') or 0.0
            hrs = s.get('hours') or 0
            logger.info(f"      • {C_BOLD}{s['name']:<15}{C_END} | KD: {kd:<4} | WR: {wr:<4}% | Horas: {hrs}")

        # 5. Montar JSON
        result = {
            "mode": "pvp",
            "nickname": nickname,
            "pvp_stats": main_stats,
            "time_played_hours": total_hours,
            "classes": classes
        }

        # 6. Validação Final
        is_valid, val_error = validate_pvp_stats(result)
        if not is_valid:
            logger.warning(f"{C_YELLOW}[AVISO]{C_END} {val_error}")
            result["warning"] = val_error
            
        logger.info(f"{C_GREEN}[COMPLETO]{C_END} Pipeline PvP finalizado sem erros.\n")
        return result

    except Exception as e:
        logger.error(f"{C_RED}[ERRO CRÍTICO]{C_END} {e}", exc_info=True)
        return { "error": f"Erro interno: {str(e)}" }

