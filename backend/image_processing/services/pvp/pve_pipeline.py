import os
import logging
from .image_utils import load_image, normalize_resolution, normalize_resolution_ai
from .validator import validate_is_pve
from .pve_stats_extractor import extract_pve_stats
from .class_stats_extractor import extract_class_stats
from .debug_utils import save_debug_images
from ...log_styles import (
    C_MAGENTA, C_GREEN, C_YELLOW, C_RED, C_BLUE, C_BOLD, C_END, SEP_IMAGE
)

logger = logging.getLogger(__name__)

def run_pve_pipeline(image_path: str):
    """
    Executa o pipeline completo para extracao de dados do modo PvE (JxA).
    """
    fname = os.path.basename(image_path)
    logger.info(f"\n{C_BOLD}{C_MAGENTA}[PIPELINE PVE]{C_END} 🔍 Analisando (Modo Normal 1080p): {fname}")
    
    try:
        # 1. Carregar e normalizar para 4K usando LANCZOS4 (Alta velocidade)
        img_raw = load_image(image_path)
        img = normalize_resolution_ai(img_raw, 3840)
        logger.info(f"   {C_GREEN}√ Upscale 4K (LANCZOS4) concluído.{C_END}")
        
        # 2. Validação de Modo (Ultra High Fidelity)
        save_debug_images(img, prefix=f"pve_{fname}")
        
        is_pve, error_msg = validate_is_pve(img)
        if not is_pve:
            logger.error(f"{C_RED}[VALIDAÇÃO]{C_END} Imagem não é PvE: {error_msg}")
            return {"error": error_msg}

        logger.info(f"{C_GREEN}[VALIDAÇÃO]{C_END} Modo JxA (PvE) detectado com sucesso.")

        # 3. Extracao de Estatisticas Principais e Missoes (DPI Aware)
        logger.info(f"{C_BLUE}[EXTRAÇÃO]{C_END} Raspando estatísticas principais e missões...")
        main_stats = extract_pve_stats(img)
        
        m_easy = main_stats.get("missions", {}).get("easy", 0)
        m_med  = main_stats.get("missions", {}).get("medium", 0)
        m_hard = main_stats.get("missions", {}).get("hard", 0)
        
        logger.info(f"   {C_MAGENTA}» Nickname:{C_END} {C_BOLD}{main_stats.get('nickname', '???')}{C_END}")
        logger.info(f"   {C_MAGENTA}» Missões:{C_END} Fácil: {m_easy} | Médio: {m_med} | Difícil: {m_hard}")
        logger.info(f"   {C_MAGENTA}» Stats:{C_END} {main_stats.get('kd_ratio', 0.0)} EM | {main_stats.get('win_rate', 0.0)}% WR")

        # 4. Extracao de Estatisticas por Classe (DPI Aware)
        logger.info(f"{C_BLUE}[EXTRAÇÃO]{C_END} Raspando dados por classe...")
        class_stats = extract_class_stats(img)
        for s in class_stats:
            kd = s.get('em') or 0.0
            wr = s.get('winRate') or 0.0
            hrs = s.get('hours') or 0
            logger.info(f"      • {C_BOLD}{s['name']:<15}{C_END} | KD: {kd:<4} | WR: {wr:<4}% | Horas: {hrs}")

        # 5. Montagem do Resultado Final
        result = {
            "nickname": main_stats.get("nickname"),
            "mode": "pve",
            "pve_stats": main_stats,
            "time_played_hours": main_stats.get("total_hours", 0),
            "classes": class_stats
        }

        logger.info(f"{C_GREEN}[COMPLETO]{C_END} Pipeline PvE finalizado com sucesso.\n")
        return result

    except Exception as e:
        logger.error(f"{C_RED}[ERRO CRÍTICO]{C_END} {e}", exc_info=True)
        return { "error": f"Erro interno do pipeline PvE: {str(e)}" }

