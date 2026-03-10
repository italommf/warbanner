import os
import logging
from .image_utils import load_image, normalize_resolution
from .validator import validate_is_pve
from .pve_stats_extractor import extract_pve_stats
from .class_stats_extractor import extract_class_stats
from .debug_utils import save_debug_images

logger = logging.getLogger(__name__)

def run_pve_pipeline(image_path: str):
    """
    Executa o pipeline completo para extracao de dados do modo PvE (JxA).
    """
    print(f"\n[PIPELINE PVE] Iniciando processamento: {os.path.basename(image_path)}")
    
    try:
        # 1. Carregar e Normalizar
        img = load_image(image_path)
        norm = normalize_resolution(img)

        # 2. Debug e Validação de Modo
        save_debug_images(norm, prefix=f"pve_{os.path.basename(image_path)}")
        
        is_pve, error_msg = validate_is_pve(norm)
        if not is_pve:
            print(f"[PIPELINE PVE] Falha na validação: {error_msg}")
            return {"error": error_msg}

        print("[PIPELINE PVE] Imagem validada com sucesso como modo PvE (JxA).")

        # 3. Extracao de Estatisticas Principais e Missoes
        print("[PIPELINE PVE] Extraindo estatísticas principais e missões...")
        main_stats = extract_pve_stats(norm)
        
        # 4. Extracao de Estatisticas por Classe
        print("[PIPELINE PVE] Extraindo estatísticas por classe...")
        class_stats = extract_class_stats(norm)

        # 5. Montagem do Resultado Final
        result = {
            "nickname": main_stats.get("nickname"),
            "mode": "pve",
            "pve_stats": main_stats,
            "time_played_hours": main_stats.get("total_hours", 0),
            "classes": class_stats
        }

        print("[PIPELINE PVE] Pipeline finalizado com sucesso.\n")
        return result

    except Exception as e:
        logger.error(f"[PIPELINE PVE] Erro Crítico: {e}")
        return { "error": f"Erro interno do pipeline PvE: {str(e)}" }
