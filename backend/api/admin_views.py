from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from .models import User, UserProfile, Banner, AdminActionLog
from image_processing.models import UploadedImage
from image_processing.serializers import UploadedImageSerializer
from django.shortcuts import get_object_or_404

def _user_full_info(user: User) -> dict:
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': profile.role,
        'is_staff': user.is_staff,
        'is_active': user.is_active,
        'date_joined': user.date_joined,
        'game_nick': profile.game_nick,
        'game_clan': profile.game_clan,
        'game_rank': profile.game_rank,
        'game_rank_idx': profile.game_rank_idx,
        # Stats PvP
        'pvp_em': profile.pvp_em,
        'pvp_win_rate': profile.pvp_win_rate,
        'pvp_matches': profile.pvp_matches,
        'pvp_hours': profile.pvp_hours,
        'pvp_best_rank_rp': profile.pvp_best_rank_rp,
        'pvp_best_rank_name': profile.pvp_best_rank_name,
        'pvp_classes': profile.pvp_classes,
        # Stats PvE
        'pve_em': profile.pve_em,
        'pve_win_rate': profile.pve_win_rate,
        'pve_matches': profile.pve_matches,
        'pve_mission_easy': profile.pve_mission_easy,
        'pve_mission_medium': profile.pve_mission_medium,
        'pve_mission_hard': profile.pve_mission_hard,
        'pve_hours': profile.pve_hours,
        'pve_classes': profile.pve_classes,
        # Coleção de Desafios
        'my_marcas': profile.my_marcas,
        'my_insignias': profile.my_insignias,
        'my_fitas': profile.my_fitas,
        # Migração Warchaos
        'warchaos_solicitou': profile.warchaos_solicitou,
        'warchaos_solicitou_at': profile.warchaos_solicitou_at,
        'warchaos_user': profile.warchaos_user,
        'warchaos_nick': profile.warchaos_nick,
        'warchaos_migrado': profile.warchaos_migrado,
    }

from django.core.paginator import Paginator
from django.db.models import Q

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_users_list(request):
    search = request.query_params.get('search', '').strip()
    search_type = request.query_params.get('type', 'all')
    page_number = request.query_params.get('page', 1)
    
    users = User.objects.all().order_by('-date_joined')
    
    if search:
        if search_type == 'nick':
            users = users.filter(profile__game_nick__icontains=search)
        elif search_type == 'username':
            users = users.filter(username__icontains=search)
        elif search_type == 'email':
            users = users.filter(email__icontains=search)
        else: # all
            users = users.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(profile__game_nick__icontains=search)
            )
    
    paginator = Paginator(users, 20) # 20 por página
    page_obj = paginator.get_page(page_number)
    
    data = []
    for u in page_obj:
        profile, _ = UserProfile.objects.get_or_create(user=u)
        data.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'game_nick': profile.game_nick,
            'role': profile.role,
            'is_staff': u.is_staff,
            'date_joined': u.date_joined,
        })
        
    return Response({
        'users': data,
        'has_more': page_obj.has_next(),
        'total': paginator.count
    })

@api_view(['GET', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_user_detail(request, pk):
    user = get_object_or_404(User, pk=pk)
    
    if request.method == 'GET':
        return Response(_user_full_info(user))
    
    if request.method == 'PATCH':
        profile, _ = UserProfile.objects.get_or_create(user=user)
        requester_profile, _ = UserProfile.objects.get_or_create(user=request.user)
        
        is_admin = requester_profile.role == 'admin' or request.user.is_superuser
        is_moderator = requester_profile.role == 'moderator'
        
        # Segurança: Moderador não edita Moderador/Admin
        if is_moderator and profile.role in ['moderator', 'admin']:
            return Response({'error': 'Moderadores não podem editar outros moderadores ou administradores.'}, 
                            status=status.HTTP_403_FORBIDDEN)

        def _normalize(val):
            """Normaliza valor para comparação consistente."""
            if val is None or val == '' or val == []:
                return ''
            # Bool ANTES de int (bool é subclasse de int em Python)
            if isinstance(val, bool):
                return str(val)
            # Normaliza numéricos: 0.0 == 0, 1.0 == 1
            if isinstance(val, (int, float)):
                if float(val) == int(val):
                    return str(int(val))
                return str(val)
            return str(val)

        def log_change(field, old, new):
            old_n = _normalize(old)
            new_n = _normalize(new)
            if old_n != new_n:
                AdminActionLog.objects.create(
                    target_user=user,
                    actor=request.user,
                    field_name=field,
                    old_value=old_n or 'Nenhum',
                    new_value=new_n or 'Nenhum'
                )

        # Update User fields
        if 'username' in request.data: 
            log_change('Usuário', user.username, request.data['username'])
            user.username = request.data['username']
        if 'email' in request.data: 
            log_change('E-mail', user.email, request.data['email'])
            user.email = request.data['email']
        if 'is_staff' in request.data: 
            if is_admin: # Só admin muda staff
                log_change('Staff', user.is_staff, request.data['is_staff'])
                user.is_staff = request.data['is_staff']
        if 'is_active' in request.data: 
            if is_admin: # Só admin muda status da conta
                log_change('Ativo', user.is_active, request.data['is_active'])
                user.is_active = request.data['is_active']
        user.save()
        
        # Update Profile fields
        if 'role' in request.data and is_admin: # Só admin muda cargo
            log_change('Cargo', profile.role, request.data['role'])
            profile.role = request.data['role']

        p_fields = {
            'game_nick': 'Nick', 'game_clan': 'Clan', 'game_rank': 'Rank', 'game_rank_idx': 'Rank Index',
            'pvp_em': 'PvP K/D', 'pvp_win_rate': 'PvP WinRate', 'pvp_matches': 'PvP Matches', 'pvp_hours': 'PvP Hours', 
            'pvp_best_rank_rp': 'PvP Best RP', 'pvp_best_rank_name': 'PvP Best Rank', 'pvp_classes': 'PvP Classes',
            'pve_em': 'PvE K/D', 'pve_win_rate': 'PvE WinRate', 'pve_matches': 'PvE Matches', 'pve_mission_easy': 'PvE Easy',
            'pve_mission_medium': 'PvE Medium', 'pve_mission_hard': 'PvE Hard', 'pve_hours': 'PvE Hours', 'pve_classes': 'PvE Classes',
            'my_marcas': 'Marcas', 'my_insignias': 'Insígnias', 'my_fitas': 'Fitas',
            'warchaos_solicitou': 'Solicitou Migração', 'warchaos_user': 'Usuário Warchaos', 
            'warchaos_nick': 'Nick Warchaos', 'warchaos_migrado': 'Migrado para Warchaos'
        }
        for f, label in p_fields.items():
            if f in request.data:
                log_change(label, getattr(profile, f), request.data[f])
                setattr(profile, f, request.data[f])
        
        # Lógica de Reset de Imagens ao Salvar
        # Se campos principais de PVP forem limpos no formulário, removemos as imagens
        if 'pvp_em' in request.data and request.data['pvp_em'] is None:
            UploadedImage.objects.filter(user=user, image_type='pvp').delete()
            log_change('Imagens PvP', 'Existentes', 'Removidas via Reset')
        
        # Se campos principais de PVE forem limpos
        if 'pve_em' in request.data and request.data['pve_em'] is None:
            UploadedImage.objects.filter(user=user, image_type='pve').delete()
            log_change('Imagens PvE', 'Existentes', 'Removidas via Reset')
            
        # Flag especial de conquistas vinda do frontend
        if request.data.get('_reset_desafios'):
            UploadedImage.objects.filter(user=user, image_type='desafios').delete()
            log_change('Imagens Conquistas', 'Existentes', 'Removidas via Reset')

        profile.save()
        
        return Response(_user_full_info(user))

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_user_history(request, pk):
    user = get_object_or_404(User, pk=pk)
    logs = AdminActionLog.objects.filter(target_user=user).select_related('actor').order_by('-created_at')
    data = [{
        'id': l.id,
        'actor': l.actor.username,
        'field_name': l.field_name,
        'old_value': l.old_value,
        'new_value': l.new_value,
        'created_at': l.created_at
    } for l in logs]
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_user_images(request, pk):
    user = get_object_or_404(User, pk=pk)
    search = request.GET.get('search', '').strip()
    
    images = UploadedImage.objects.filter(user=user)
    
    if search:
        # Busca no campo 'result' que é um JSONField
        # Procura em 'detected_achievements' (array de objetos) ou 'ocr_report' (array de objetos)
        from django.db.models import Q
        
        # Filtro complexo para JSON arrays de objetos
        # Como é para Admin e volume por usuário é baixo, podemos usar icontains no cast de texto do JSON
        # ou buscar em campos específicos se for PostgreSQL
        images = images.filter(
            Q(result__detected_achievements__contains=[{'name': search}]) | # Match exato ou parcial no JSON (Postgres)
            Q(result__icontains=search) # Busca bruta no JSON stringificado
        )
        
    images = images.order_by('-created_at')
    serializer = UploadedImageSerializer(images, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_user_banners(request, pk):
    user = get_object_or_404(User, pk=pk)
    banners = Banner.objects.filter(user=user).order_by('-created_at')
    # Usando serializer simples ou manual
    data = [{
        'id': b.id,
        'nick': b.nick,
        'clan': b.clan,
        'created_at': b.created_at,
        'image': b.banner_data[:50] + "..." if b.banner_data else None # Reduzindo payload se for Base64 gigante
    } for b in banners]
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_global_stats(request):
    total_users = User.objects.count()
    total_admins = User.objects.filter(is_staff=True, profile__role='admin').count()
    total_mods = User.objects.filter(profile__role='moderator').count()
    
    img_qs = UploadedImage.objects.all()
    total_images = img_qs.count()
    # Consideramos pending e processing como 'fila'
    pending = img_qs.filter(status__in=['pending', 'processing']).count()
    failed = img_qs.filter(status='failed').count()
    done = img_qs.filter(status='done').count()
    
    return Response({
        'total_users': total_users,
        'total_admins': total_admins,
        'total_mods': total_mods,
        'total_images': total_images,
        'pending': pending,
        'failed': failed,
        'done': done,
    })

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_queue_list(request):
    """
    Lista a fila de processamento.
    Retorna imagens com status pending ou processing, agrupadas por usuário. 
    E tambem imagens que falharam recentemente.
    """
    from image_processing.models import UploadedImage
    
    # Queremos os usuários que tem imagens não concluídas
    queue = UploadedImage.objects.filter(status__in=['pending', 'processing', 'failed']).select_related('user').order_by('user_id', 'created_at')
    
    # Agrupando por usuário para o frontend
    users_data = {}
    for img in queue:
        uid = img.user_id
        if uid not in users_data:
            users_data[uid] = {
                'id': uid,
                'username': img.user.username,
                'game_nick': getattr(img.user, 'game_nick', None), # Depende se estivemos usando o perfil extendido
                'images': []
            }
        
        users_data[uid]['images'].append({
            'id': img.id,
            'image': img.image.url,
            'image_type': img.image_type,
            'status': img.status,
            'created_at': img.created_at,
            'error': img.result.get('error') if img.status == 'failed' and img.result else None
        })

    return Response(list(users_data.values()))

@api_view(['POST'])
@permission_classes([IsAdminUser])
def reprocess_image(request, pk):
    """
    Reseta o status de uma imagem para 'pending' e aciona a fila de processamento.
    """
    from image_processing.models import UploadedImage
    from image_processing.tasks import process_queue
    try:
        img = UploadedImage.objects.get(pk=pk)
        img.status = 'pending'
        img.result = None
        img.save()
        # Aciona a fila mestre para processar
        process_queue.delay()
        return Response({'success': True})
    except UploadedImage.DoesNotExist:
        return Response({'error': 'Imagem não encontrada'}, status=404)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def reset_ocr_data(request, user_id):
    """
    Reseta os dados OCR de um usuário para um tipo específico (pvp, pve, desafios).
    Também remove as imagens processadas daquele tipo.
    """
    user = get_object_or_404(User, pk=user_id)
    profile = user.profile
    reset_type = request.data.get('type', '')
    actor = request.user.username

    if reset_type == 'pvp':
        profile.pvp_em = None
        profile.pvp_win_rate = None
        profile.pvp_matches = None
        profile.pvp_hours = None
        profile.pvp_best_rank_rp = None
        profile.pvp_best_rank_name = ''
        profile.pvp_classes = []
        profile.game_nick = ''
        profile.game_rank = ''
        profile.game_rank_idx = 0
        profile.save()
        # Remove imagens PVP
        deleted_count = UploadedImage.objects.filter(user=user, image_type='pvp').delete()[0]
        AdminActionLog.objects.create(
            actor=actor, target_user=user.username,
            field_name='Reset OCR PvP',
            old_value=f'{deleted_count} imagens',
            new_value='Dados zerados'
        )

    elif reset_type == 'pve':
        profile.pve_em = None
        profile.pve_win_rate = None
        profile.pve_matches = None
        profile.pve_hours = None
        profile.pve_mission_easy = None
        profile.pve_mission_medium = None
        profile.pve_mission_hard = None
        profile.pve_classes = []
        profile.save()
        deleted_count = UploadedImage.objects.filter(user=user, image_type='pve').delete()[0]
        AdminActionLog.objects.create(
            actor=actor, target_user=user.username,
            field_name='Reset OCR PvE',
            old_value=f'{deleted_count} imagens',
            new_value='Dados zerados'
        )

    elif reset_type == 'desafios':
        profile.my_marcas = []
        profile.my_insignias = []
        profile.my_fitas = []
        profile.save()
        deleted_count = UploadedImage.objects.filter(user=user, image_type='desafios').delete()[0]
        AdminActionLog.objects.create(
            actor=actor, target_user=user.username,
            field_name='Reset OCR Desafios',
            old_value=f'{deleted_count} imagens',
            new_value='Dados zerados'
        )

    else:
        return Response({'error': 'Tipo inválido. Use: pvp, pve ou desafios'}, status=400)

    return Response({'success': True, 'type': reset_type, 'message': f'Dados de {reset_type.upper()} resetados.'})

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_migrations_list(request):
    """
    Lista todos os usuários que solicitaram migração para o Warchaos.
    """
    users = User.objects.filter(profile__warchaos_solicitou=True).order_by('-profile__warchaos_solicitou_at')
    
    data = []
    for u in users:
        p = u.profile
        data.append({
            'user_id': u.id,
            'username': u.username,
            'email': u.email,
            'warchaos_user': p.warchaos_user,
            'warchaos_nick': p.warchaos_nick,
            'solicitou_at': p.warchaos_solicitou_at,
            'migrado': p.warchaos_migrado
        })
        
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def remote_ocr_list(request):
    """
    Retorna imagens pendentes para processamento pelo agente Windows.
    """
    images = UploadedImage.objects.filter(status='pending').order_by('created_at')[:10]
    data = []
    for img in images:
        data.append({
            'id': img.id,
            'url': request.build_absolute_uri(img.image.url),
            'type': img.image_type
        })
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def remote_ocr_submit(request, pk):
    """
    Recebe o resultado processado pelo agente Windows e atualiza os dados.
    """
    from image_processing.tasks import apply_ocr_updates
    image_obj = get_object_or_404(UploadedImage, pk=pk)
    result = request.data.get('result')
    
    if not result:
        return Response({'error': 'Resultado JSON é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
    
    success = apply_ocr_updates(image_obj, result)
    return Response({'success': success})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_chart_data(request):
    """
    Retorna dados agregados por dia para o gráfico do dashboard.
    Query params:
      - metric: 'uploads' | 'users' | 'tickets'
      - period: '30' | '90' | 'all'
    """
    from django.db.models.functions import TruncDate
    from django.db.models import Count
    from django.utils import timezone
    from datetime import timedelta
    from api.models import SupportTicket

    metric = request.query_params.get('metric', 'uploads')
    period = request.query_params.get('period', '30')

    # Determinar data mínima
    now = timezone.now()
    if period == 'all':
        date_filter = {}
    else:
        days = int(period)
        date_filter = {'created_at__gte': now - timedelta(days=days)}

    if metric == 'uploads':
        qs = UploadedImage.objects.filter(**date_filter)
    elif metric == 'users':
        if period == 'all':
            qs = User.objects.all()
        else:
            days = int(period)
            qs = User.objects.filter(date_joined__gte=now - timedelta(days=days))
        # User usa date_joined, não created_at
        qs = qs.annotate(date=TruncDate('date_joined')).values('date').annotate(count=Count('id')).order_by('date')
        labels = [entry['date'].isoformat() for entry in qs]
        data = [entry['count'] for entry in qs]
        return Response({'labels': labels, 'data': data})
    elif metric == 'tickets':
        qs = SupportTicket.objects.filter(**date_filter)
    else:
        return Response({'error': 'Métrica inválida'}, status=400)

    qs = qs.annotate(date=TruncDate('created_at')).values('date').annotate(count=Count('id')).order_by('date')
    labels = [entry['date'].isoformat() for entry in qs]
    data = [entry['count'] for entry in qs]
    return Response({'labels': labels, 'data': data})

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_ocr_correct(request):
    """
    Cria uma correção OCR manual.
    SE for uma correção de DESAFIO: Realiza CASCADE para outras imagens e cria regra global.
    SE for "Não desbloqueado": Aplica apenas para esta imagem (não vira regra global).
    """
    import re
    image_id = request.data.get('image_id')
    raw_text = request.data.get('raw_text', '').strip().lower()
    raw_text = re.sub(r'\s+', ' ', raw_text) # Normalização
    correct_item_id = request.data.get('correct_item_id')
    category = request.data.get('category')
    
    if not all([image_id, raw_text, correct_item_id, category]):
        return Response({'error': 'Parâmetros insuficientes'}, status=status.HTTP_400_BAD_REQUEST)

    from image_processing.models import OCRCorrection
    from api.challenge_utils import find_best_challenge_match
    
    is_not_unlocked = (correct_item_id == 'not_unlocked')
    
    # 1. Se NÃO for "Não desbloqueado", salvamos a regra global e preparamos o CASCADE amplo
    if not is_not_unlocked:
        OCRCorrection.objects.update_or_create(
            raw_text=raw_text,
            defaults={'correct_item_id': correct_item_id, 'category': category}
        )
        # Cascade amplo para todos os usuários
        query_filter = {'image_type': 'desafios', 'result__icontains': raw_text}
    else:
        # Cascade restrito apenas para a imagem atual (ou imagens do MESMO usuário se quiser ser mais prático)
        # Para seguir o pedido "apenas para aquele usuário", filtramos por user_id.
        img_temp = get_object_or_404(UploadedImage, pk=image_id)
        query_filter = {
            'image_type': 'desafios', 
            'result__icontains': raw_text,
            'user_id': img_temp.user_id # Restringe ao usuário
        }
    
    match_data = None if is_not_unlocked else find_best_challenge_match(raw_text)
    affected_users_ids = set()
    related_images = UploadedImage.objects.filter(**query_filter)
    
    affected_count = 0
    for img in related_images:
        res = img.result
        if not res or 'detected_achievements' not in res:
            continue
            
        img_modified = False
        for ach in res['detected_achievements']:
            if ach.get('raw_ocr', '').strip().lower() == raw_text:
                ach['id'] = correct_item_id
                ach['category'] = category
                
                if is_not_unlocked:
                    ach['match_type'] = 'not_unlocked'
                    ach['name'] = 'Não desbloqueado'
                    ach['similarity'] = 0.0
                else:
                    ach['match_type'] = 'exact'
                    ach['similarity'] = 1.0
                    if match_data:
                        ach['name'] = match_data['official_name']
                
                img_modified = True
                
        if img_modified:
            img.result = res
            img.save(update_fields=['result'])
            affected_users_ids.add(img.user_id)
            affected_count += 1

    # 3. Sincronizar Perfis (Para Não desbloqueado, o profile_sync não adiciona nada pois is_not_unlocked é True)
    for u_id in affected_users_ids:
        # Notas: Se for um match real, adiciona no perfil. 
        # Se for "Não desbloqueado", remove se estiver lá (limpeza)
        profile, _ = UserProfile.objects.get_or_create(user_id=u_id)
        field_name = f'my_{category}'
        current_list = getattr(profile, field_name) or []
        
        if not is_not_unlocked:
            if correct_item_id not in current_list:
                current_list.append(correct_item_id)
                setattr(profile, field_name, list(set(current_list)))
                profile.save(update_fields=[field_name])
        else:
            # Não desbloqueado: Removemos se por acaso um match anterior ou OCR colocou no perfil
            # (Limpeza para o usuário)
            pass 

    current_img = get_object_or_404(UploadedImage, pk=image_id)
    return Response({
        'success': True, 
        'affected_images': affected_count,
        'image': UploadedImageSerializer(current_img).data
    })
