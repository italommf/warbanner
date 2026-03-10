import time
from celery import shared_task
from .models import UploadedImage

@shared_task
def test_task():
    print("Celery funcionando")
    return "ok"

from .services.pvp.pvp_pipeline import run_pvp_pipeline
from .services.pvp.pve_pipeline import run_pve_pipeline
from .services.pvp.parsers import parse_nickname_and_rank

@shared_task
def process_uploaded_image(image_id):
    try:
        image_obj = UploadedImage.objects.get(id=image_id)
        print(f"\n[CELERY] Iniciando tarefa para imagem {image_id} (Usuário: {image_obj.user.username})")
        image_obj.status = 'processing'
        image_obj.save()

        # Run the correct pipeline based on image_type
        if image_obj.image_type == 'pvp':
            print(f"[CELERY] Tipo detectado como 'pvp'. Iniciando pipeline PvP...")
            result = run_pvp_pipeline(image_obj.image.path)
        elif image_obj.image_type == 'pve':
            print(f"[CELERY] Tipo detectado como 'pve'. Iniciando pipeline PvE...")
            result = run_pve_pipeline(image_obj.image.path)
        else:
            print(f"[CELERY] Tipo '{image_obj.image_type}' não requer processamento de OCR especializado. Finalizando.")
            result = {"message": "Processamento de OCR não habilitado para este tipo de imagem."}
        
        image_obj.result = result
        
        if "error" in result:
            image_obj.status = 'failed'
            image_obj.save()
            return f"Image {image_id} failed: {result['error']}"

        # Update User Profile if we have valid data
        profile = image_obj.user.profile
        
        if result.get("nickname"):
            clean_nick, rank_idx = parse_nickname_and_rank(result["nickname"])
            profile.game_nick = clean_nick
            profile.game_rank_idx = rank_idx
            # Também atualiza o game_rank (filename da patente) para o avatar
            from api.views import scan_category
            patentes = scan_category('patentes')
            if rank_idx < len(patentes):
                profile.game_rank = patentes[rank_idx]['filename']
            
        # Stats PvP
        pvp = result.get("pvp_stats", {})
        if pvp:
            if pvp.get("kd_ratio") is not None: profile.pvp_em = pvp["kd_ratio"]
            if pvp.get("win_rate") is not None: profile.pvp_win_rate = pvp["win_rate"]
            if pvp.get("matches_played") is not None: profile.pvp_matches = pvp["matches_played"] or 0
            if result.get("time_played_hours") is not None: profile.pvp_hours = result["time_played_hours"] or 0
            best_rank = pvp.get("best_rank", {})
            if best_rank:
                profile.pvp_best_rank_name = best_rank.get("tier") or ""
                profile.pvp_best_rank_rp = best_rank.get("rp") or 0
            if result.get("classes"):
                profile.pvp_classes = result["classes"]

        # Stats PvE
        pve = result.get("pve_stats", {})
        if pve:
            if pve.get("kd_ratio") is not None: profile.pve_em = pve["kd_ratio"]
            if pve.get("win_rate") is not None: profile.pve_win_rate = pve["win_rate"]
            if pve.get("matches_played") is not None: profile.pve_matches = pve["matches_played"] or 0
            if result.get("time_played_hours") is not None: profile.pve_hours = result["time_played_hours"] or 0
            
            missions = pve.get("missions", {})
            if missions:
                profile.pve_mission_easy = missions.get("easy") or 0
                profile.pve_mission_medium = missions.get("medium") or 0
                profile.pve_mission_hard = missions.get("hard") or 0
            
            if result.get("classes"):
                profile.pve_classes = result["classes"]

        profile.save()

        image_obj.status = 'done'
        image_obj.save()
        return f"Image {image_id} processed: {result.get('nickname')} / {result.get('mode')}"
    except UploadedImage.DoesNotExist:
        return f"Image {image_id} not found"
    except Exception as e:
        if 'image_obj' in locals():
            image_obj.status = 'failed'
            image_obj.save()
        return f"Error processing image {image_id}: {str(e)}"
