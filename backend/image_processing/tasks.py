import time
import logging
from celery import shared_task
from django.db import transaction
from .models import UploadedImage

logger = logging.getLogger(__name__)

from .services.pvp.pvp_pipeline import run_pvp_pipeline
from .services.pvp.pve_pipeline import run_pve_pipeline
from .services.pvp.challenges_pipeline import run_challenges_pipeline
from .services.pvp.parsers import parse_nickname_and_rank


from .log_styles import (
    C_GREEN, C_YELLOW, C_RED, C_BLUE, C_CYAN, C_MAGENTA, C_WHITE, C_BOLD, C_END,
    SEP_HEAVY, SEP_LIGHT, SEP_IMAGE
)

_queue_running = False

@shared_task
def test_task():
    print(f"{C_GREEN}Celery funcionando{C_END}")
    return "ok"


def _process_single_image(image_obj):
    """
    Processa UMA imagem com garantia de atualização atômica e isolamento de campos.
    """
    max_ocr_attempts = 2
    type_color = C_CYAN if image_obj.image_type == 'pvp' else C_MAGENTA if image_obj.image_type == 'pve' else C_YELLOW
    type_label = image_obj.image_type.upper()
    
    for ocr_attempt in range(max_ocr_attempts):
        try:
            image_obj.status = 'processing'
            image_obj.save(update_fields=['status', 'updated_at'])

            # Separador dinâmico de cor baseado no tipo
            sep_color = type_color
            logger.info(f"{sep_color}{'━' * 50}{C_END}")
            logger.info(f"{sep_color}{C_BOLD}[{type_label}]{C_END} Processando Imagem ID: {C_BOLD}{image_obj.id}{C_END} (Tentativa {ocr_attempt + 1})")
            logger.info(f"{sep_color}{'━' * 50}{C_END}")

            # OCR Execution (pipelines use prints/loggers too)
            if image_obj.image_type == 'pvp':
                result = run_pvp_pipeline(image_obj.image.path)
            elif image_obj.image_type == 'pve':
                result = run_pve_pipeline(image_obj.image.path)
            elif image_obj.image_type == 'desafios':
                result = run_challenges_pipeline(image_obj.image.path)
            else:
                result = {"error": "Tipo de imagem desconhecido."}
            
            image_obj.result = result

            if "error" in result:
                image_obj.status = 'failed'
                image_obj.save(update_fields=['status', 'result', 'updated_at'])
                logger.error(f"{C_RED}[ERRO OCR]{C_END} Falha: {result['error']}")
                return False

            # Prepare updates...
            updates = {}
            # Extração de Rank (ID do Rank)
            # Nota: O Nickname não é mais atualizado via OCR seguindo solicitação do usuário.
            # No entanto, ainda usamos a área do nickname para extrair a patente (rank).
            if result.get("nickname") or result.get("nickname_rank") is not None:
                rank_idx = 0
                if result.get("nickname"):
                    _, rank_idx = parse_nickname_and_rank(result["nickname"])
                
                if result.get("nickname_rank") is not None:
                    rank_idx = result["nickname_rank"]
                    logger.info(f"{C_CYAN}[MATCH-RANK]{C_END} Usando rank visual: {C_BOLD}{rank_idx}{C_END}")
                
                updates['game_rank_idx'] = rank_idx + 1 # 1-based
                from api.views import scan_category
                patentes = scan_category('patentes')
                if rank_idx < len(patentes):
                    updates['game_rank'] = patentes[rank_idx]['filename']


            if image_obj.image_type == 'pvp':
                pvp = result.get("pvp_stats", {})
                if pvp:
                    if pvp.get("kd_ratio") is not None: updates['pvp_em'] = pvp["kd_ratio"]
                    if pvp.get("win_rate") is not None: updates['pvp_win_rate'] = pvp["win_rate"]
                    if pvp.get("matches_played") is not None: updates['pvp_matches'] = max(0, pvp["matches_played"])
                    if result.get("time_played_hours") is not None: updates['pvp_hours'] = max(0, result["time_played_hours"])
                    best_rank = pvp.get("best_rank", {})
                    if best_rank:
                        if best_rank.get("tier"): updates['pvp_best_rank_name'] = best_rank["tier"]
                        if best_rank.get("rp") is not None: updates['pvp_best_rank_rp'] = max(0, best_rank["rp"])
                    if result.get("classes"): updates['pvp_classes'] = result["classes"]

            elif image_obj.image_type == 'pve':
                pve = result.get("pve_stats", {})
                if pve:
                    if pve.get("kd_ratio") is not None: updates['pve_em'] = pve["kd_ratio"]
                    if pve.get("win_rate") is not None: updates['pve_win_rate'] = pve["win_rate"]
                    if pve.get("matches_played") is not None: updates['pve_matches'] = max(0, pve["matches_played"])
                    if result.get("time_played_hours") is not None: updates['pve_hours'] = max(0, result["time_played_hours"])
                    missions = pve.get("missions", {})
                    if missions:
                        if missions.get("easy") is not None: updates['pve_mission_easy'] = max(0, missions["easy"])
                        if missions.get("medium") is not None: updates['pve_mission_medium'] = max(0, missions["medium"])
                        if missions.get("hard") is not None: updates['pve_mission_hard'] = max(0, missions["hard"])
                    if result.get("classes"): updates['pve_classes'] = result["classes"]

            elif image_obj.image_type == 'desafios':
                detected = result.get("detected_achievements", [])
                if detected:
                    # Agrupar por categoria para atualizar listas do UserProfile
                    new_conquistas = {"marcas": [], "insignias": [], "fitas": []}
                    for item in detected:
                        cat = item.get("category")
                        filename = item.get("id")
                        if cat in new_conquistas and filename:
                            new_conquistas[cat].append(filename)
                    
                    # Marcar para processamento especial no loop do DB
                    updates['_special_challenges'] = new_conquistas

            if not updates:
                logger.info(f"{C_YELLOW}[AVISO]{C_END} Nenhum dado raspado para atualizar.")
                image_obj.status = 'done'
                image_obj.save(update_fields=['status', 'result', 'updated_at'])
                return True

            # Database Update
            from api.models import UserProfile
            max_db_retries = 2
            
            for db_retry in range(max_db_retries):
                try:
                    with transaction.atomic():
                        profile = UserProfile.objects.select_for_update().get(user=image_obj.user)
                        
                        logger.info(f"{type_color}[DB {type_label}]{C_END} Gravando {C_BOLD}{len([k for k in updates if not k.startswith('_')])}{C_END} campos no perfil...")
                        
                        modified_fields = []
                        for key, val in updates.items():
                            if key == '_special_challenges':
                                # Lógica especial para listas de conquistas (não sobrescrever, apenas adicionar novos)
                                for cat, files in val.items():
                                    field_name = f'my_{cat}'
                                    current_list = getattr(profile, field_name) or []
                                    # Adicionar apenas o que não tem na lista
                                    added_count = 0
                                    for f in files:
                                        if f not in current_list:
                                            current_list.append(f)
                                            added_count += 1
                                    
                                    if added_count > 0:
                                        setattr(profile, field_name, current_list)
                                        modified_fields.append(field_name)
                                        logger.info(f"   {C_GREEN}√{C_END} Adicionadas {C_BOLD}{added_count}{C_END} novas conquistas em {C_BOLD}{cat}{C_END}")
                            else:
                                setattr(profile, key, val)
                                modified_fields.append(key)
                        
                        if modified_fields:
                            profile.save(update_fields=modified_fields)

                    profile.refresh_from_db()
                    # Ignorar chaves internas (como _special_challenges) na checagem de igualdade
                    mismatches = [k for k, v in updates.items() if not k.startswith('_') and getattr(profile, k) != v]
                    
                    if not mismatches:
                        logger.info(f"{C_GREEN}[SUCESSO {type_label}]{C_END} Imagem {image_obj.id} processada e salva.")
                        image_obj.status = 'done'
                        image_obj.save(update_fields=['status', 'result', 'updated_at'])
                        return True
                    else:
                        logger.warning(f"{C_RED}[AVISO]{C_END} Inconsistência nos campos: {mismatches}")
                        logger.info(f"Re-checando em 1 segundo...")
                        time.sleep(1)
                        profile.refresh_from_db()
                        if all(getattr(profile, k) == updates[k] for k in updates):
                            image_obj.status = 'done'
                            image_obj.save(update_fields=['status', 'result', 'updated_at'])
                            return True
                            
                except Exception as db_e:
                    logger.error(f"{C_RED}[ERRO DB]{C_END} Falha na transação: {db_e}")
                    time.sleep(0.5)

            logger.warning(f"{C_YELLOW}[AVISO]{C_END} Conflito persistente. Refazendo OCR do zero...")

        except Exception as e:
            logger.error(f"{C_RED}[ERRO CRÍTICO]{C_END} Imagem {image_obj.id}: {e}", exc_info=True)
            break

    image_obj.status = 'failed'
    image_obj.result = {"error": "Falha de consistência após retentativas"}
    image_obj.save(update_fields=['status', 'result', 'updated_at'])
    return False


@shared_task(bind=True)
def process_queue(self):
    """
    Task mestre que processa a fila de imagens AGRUPADA POR USUÁRIO.
    Processa todas as imagens pendentes de um usuário antes de passar para o próximo.
    Apenas uma instância desta task roda por vez (via lock do Celery).
    """
    global _queue_running
    
    # Evita execuções paralelas
    if _queue_running:
        logger.info("[QUEUE] Fila já está sendo processada. Ignorando.")
        return "Queue already running"
    
    _queue_running = True
    total_processed = 0
    total_failed = 0
    
    try:
        from django.db.models import Min
        
        # Agrupa por usuário e ordena pelo que tem a imagem pendente mais antiga
        user_queue = list(
            UploadedImage.objects
            .filter(status='pending')
            .values('user_id')
            .annotate(oldest_image=Min('created_at'))
            .order_by('oldest_image')  # Quem esperou mais tempo primeiro
        )
        
        user_ids_ordered = [u['user_id'] for u in user_queue]
        
        if not user_ids_ordered:
            logger.info("[QUEUE] Fila vazia. Nada para processar.")
            return "Queue empty"
        
        logger.info(f"\n{SEP_HEAVY}")
        logger.info(f"{C_BOLD}{C_GREEN}[FILA] Iniciando processamento de {len(user_ids_ordered)} usuários.{C_END}")
        logger.info(f"{SEP_HEAVY}\n")
        
        for user_id in user_ids_ordered:
            pending_images = (
                UploadedImage.objects
                .filter(user_id=user_id, status='pending')
                .select_related('user', 'user__profile')
                .order_by('created_at')
            )
            
            count = pending_images.count()
            if count == 0:
                continue
            
            user_obj = pending_images.first().user
            username = user_obj.username
            
            logger.info(f"\n{SEP_LIGHT}")
            logger.info(f"{C_BOLD}{C_BLUE}USUÁRIO: {username.upper()}{C_END} (ID: {user_id}) | {count} imagens pendentes")
            logger.info(f"{SEP_LIGHT}")
            
            for img in pending_images:
                success = _process_single_image(img)
                if success:
                    total_processed += 1
                else:
                    total_failed += 1
            
            logger.info(f"\n{SEP_LIGHT}")
            logger.info(f"{C_GREEN}√ FINALIZADO: {C_BOLD}{username}{C_END}")
            logger.info(f"{SEP_LIGHT}")
        
        summary = f"Fila processada: {total_processed} OK, {total_failed} falhas."
        logger.info(f"\n{SEP_HEAVY}")
        logger.info(f"{C_BOLD}{C_GREEN}RESUMO: {summary}{C_END}")
        logger.info(f"{SEP_HEAVY}\n")
        return summary
        
    except Exception as e:
        logger.error(f"\n{C_RED}[FILA ERROR] Erro fatal: {e}{C_END}\n")
        return f"Queue error: {e}"
    finally:
        _queue_running = False


@shared_task
def process_uploaded_image(image_id):
    """
    Compatibilidade: dispara o processamento da fila inteira.
    Quando uma nova imagem é enviada, agenda a fila mestre.
    A imagem individual será processada junto com as outras do mesmo usuário.
    """
    process_queue.delay()
    return f"Queue triggered for image {image_id}"


def apply_ocr_updates(image_obj, result):
    """
    Função chamada pelo admin_views para aplicar resultados de OCR remoto.
    Centraliza a lógica de atualização do Perfil e dos Banners.
    """
    from api.models import UserProfile, Banner
    from api.views import scan_category, _load_challenge_data
    
    user = image_obj.user
    profile, _ = UserProfile.objects.get_or_create(user=user)
    
    modified_profile = []
    
    # Rank (Patente)
    # Nickname não é mais atualizado via OCR.
    if result.get("nickname") or result.get("nickname_rank") is not None:
        rank_idx = 0
        if result.get("nickname"):
            _, rank_idx = parse_nickname_and_rank(result["nickname"])
        
        if result.get("nickname_rank") is not None:
             rank_idx = result["nickname_rank"]
             
        # Atualiza apenas Rank no Perfil
        profile.game_rank_idx = rank_idx + 1 # 1-based
        
        patentes = scan_category('patentes')
        if rank_idx < len(patentes):
            profile.game_rank = patentes[rank_idx]['filename']
        
        modified_profile.extend(['game_rank_idx', 'game_rank'])
        
        # Sincroniza Banners com a nova patente (Nick permanece o que já estava no perfil/banner)
        Banner.objects.filter(user=user).update(
            patente=profile.game_rank
        )
        logger.info(f"[OCR] Banners de {user.username} atualizados com patente '{profile.game_rank}'")


    # PvP Stats
    pvp = result.get("pvp_stats", {})
    if pvp:
        if pvp.get("kd_ratio") is not None:
            profile.pvp_em = pvp["kd_ratio"]
            modified_profile.append('pvp_em')
        if pvp.get("matches_played") is not None:
            profile.pvp_matches = max(0, pvp["matches_played"])
            modified_profile.append('pvp_matches')
        if result.get("time_played_hours") is not None:
            profile.pvp_hours = max(0, result["time_played_hours"])
            modified_profile.append('pvp_hours')

    # PvE Stats
    pve = result.get("pve_stats", {})
    if pve:
        if pve.get("matches_played") is not None:
            profile.pve_matches = max(0, pve["matches_played"])
            modified_profile.append('pve_matches')
        if result.get("time_played_hours") is not None:
            profile.pve_hours = max(0, result["time_played_hours"])
            modified_profile.append('pve_hours')
        missions = pve.get("missions", {})
        if missions:
            if missions.get("easy") is not None:
                profile.pve_mission_easy = max(0, missions["easy"])
                modified_profile.append('pve_mission_easy')
            if missions.get("medium") is not None:
                profile.pve_mission_medium = max(0, missions["medium"])
                modified_profile.append('pve_mission_medium')
            if missions.get("hard") is not None:
                profile.pve_mission_hard = max(0, missions["hard"])
                modified_profile.append('pve_mission_hard')

    # Conquistas (Desafios)
    detected = result.get("detected_achievements", [])
    if detected:
        for item in detected:
            cat = item.get("category")
            filename = item.get("id")
            if cat in ['marcas', 'insignias', 'fitas'] and filename:
                field_name = f'my_{cat}'
                current_list = getattr(profile, field_name) or []
                if filename not in current_list:
                    current_list.append(filename)
                    setattr(profile, field_name, current_list)
                    if field_name not in modified_profile:
                        modified_profile.append(field_name)

    if modified_profile:
        profile.save(update_fields=modified_profile)
        image_obj.status = 'done'
        image_obj.result = result
        image_obj.save(update_fields=['status', 'result', 'updated_at'])
        return True
    
    return False
