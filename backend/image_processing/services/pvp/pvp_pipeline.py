import os
import logging
from .image_utils import load_image, normalize_resolution
from .validator import validate_is_pvp
from .main_stats_extractor import extract_main_stats
from .class_stats_extractor import extract_class_stats
from .parsers import validate_pvp_stats
from .debug_utils import save_debug_images

logger = logging.getLogger(__name__)

def run_pvp_pipeline(image_path):
    """
    Fluxo completo para extrair estatísticas PvP usando Windows OCR.
    Baseado no novo paradigma de alta precisão nativa.
    """
    print(f"\n[PIPELINE] Inciando processamento: {os.path.basename(image_path)}")
    try:
        # 1. Carregar e Normalizar
        img = load_image(image_path)
        norm = normalize_resolution(img)
        
        # 2. Debug e Validação de Modo
        save_debug_images(norm, prefix=os.path.basename(image_path))
        
        is_pvp, error = validate_is_pvp(norm)
        if not is_pvp:
            print(f"[PIPELINE] ERROR: {error}")
            return { "error": error }
        print("[PIPELINE] Modo JvJ validado.")

        # 3. Extrair Estatísticas Principais (Nickname, KD, WR, Matches, Total Hours)
        print("[PIPELINE] Extraindo Estatísticas Principais...")
        main_stats = extract_main_stats(norm)
        nickname = main_stats.get("nickname", "Não detectado")
        total_hours = main_stats.get("total_hours", 0)
        
        print(f"    -> Nick: {nickname}")
        print(f"    -> Horas: {total_hours}h | KD: {main_stats['kd_ratio']} | WR: {main_stats['win_rate']}%")

        # 4. Extrair Estatísticas por Classe
        print("[PIPELINE] Extraindo Estatísticas por Classe...")
        classes = extract_class_stats(norm)
        for s in classes:
            print(f"    - {s['name']}: KD={s['em']}, WR={s['winRate']}, Horas={s['hours']}")

        # 5. Montar JSON Estruturado
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
            print(f"[PIPELINE] WARNING: {val_error}")
            result["warning"] = val_error
            
        print("[PIPELINE] Processamento finalizado com sucesso.\n")
        return result

    except Exception as e:
        logger.error(f"[PIPELINE] Erro Crítico: {e}")
        return { "error": f"Erro interno do pipeline: {str(e)}" }
