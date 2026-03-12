import os
import json
import urllib.parse
from pathlib import Path
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.models import User
from django.http import HttpResponseRedirect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Banner, RecoveryCode, DiscordProfile, UserProfile, SupportTicket, TicketResponse
from .serializers import BannerSerializer, CommunityBannerSerializer
import requests as http
import sys

# Adiciona o caminho do processamento ao sys.path para importação
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR / 'processamento_nomes_desc_desafios'))

try:
    from processador_detalhado import obter_dataframes_completos
except ImportError:
    obter_dataframes_completos = None

CATEGORIES = ['marcas', 'insignias', 'fitas', 'patentes']

_color_index: dict | None = None
_challenge_data: dict | None = None

def _load_challenge_data():
    global _challenge_data
    if _challenge_data is None and obter_dataframes_completos:
        try:
            df_m, df_i, df_f = obter_dataframes_completos()
            
            def process_df(df):
                # Normaliza para lowercase para evitar problemas de sensibilidade
                df = df.copy()
                df['imagem'] = df['imagem'].str.lower()
                return df.drop_duplicates('imagem').set_index('imagem').to_dict('index')
            
            _challenge_data = {
                'marcas': process_df(df_m),
                'insignias': process_df(df_i),
                'fitas': process_df(df_f)
            }
            print(f"[DATA] Base de nomes/descrições carregada: {len(_challenge_data['marcas'])} marcas, {len(_challenge_data['insignias'])} insígnias, {len(_challenge_data['fitas'])} fitas.")
        except Exception as e:


            print(f"Erro ao carregar dados dos desafios: {e}")
            _challenge_data = {}
    return _challenge_data or {}


def _load_color_index() -> dict:
    global _color_index
    if _color_index is None:
        path = Path(settings.MEDIA_ROOT) / 'color_index.json'
        _color_index = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    return _color_index


def filename_to_name(filename: str) -> str:
    stem = Path(filename).stem
    return stem.replace('_', ' ').replace('-', ' ').title()


def _natural_key(path):
    import re
    parts = re.split(r'(\d+)', path.name)
    return [int(p) if p.isdigit() else p.lower() for p in parts]


def scan_category(category: str) -> list:
    subfolder = f'site/{category}' if category == 'patentes' else f'desafios/{category}'
    folder = Path(settings.MEDIA_ROOT) / subfolder
    if not folder.exists():
        return []
    
    color_index = _load_color_index()
    challenge_data = _load_challenge_data()
    cat_data = challenge_data.get(category, {})
    
    items = []
    for f in sorted(folder.iterdir(), key=_natural_key):
        if f.suffix.lower() == '.png':
            if f.name.lower().endswith('default.png'):
                continue
            key = f'{subfolder}/{f.name}'
            stem = f.stem.lower()
            
            # Tenta pegar dados do DataFrame processado
            info = cat_data.get(stem, {})

            
            items.append({
                'name': info.get('nome') or filename_to_name(f.name),
                'description': info.get('descrição', ''),
                'amount': info.get('quantidade', ''),
                'filename': f.name,
                'url': f'/media/{subfolder}/{f.name}',
                'color': color_index.get(key, 'outro'),
            })
    return items


def _get_tokens(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def _user_info(user: User) -> dict:
    avatar = getattr(getattr(user, 'discord', None), 'avatar', None)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return {
        'id':        user.id,
        'username':  user.username,
        'email':     user.email,
        'avatar':    avatar or '',
        'game_nick': profile.game_nick or '',
        'game_clan': profile.game_clan or '',
        'game_rank': profile.game_rank or '',
        'game_rank_idx': profile.game_rank_idx,
        'role': profile.role,
        'is_staff': user.is_staff,
        'warchaos_solicitou': profile.warchaos_solicitou,
        'warchaos_solicitou_at': profile.warchaos_solicitou_at.isoformat() if profile.warchaos_solicitou_at else None,
        'warchaos_user': profile.warchaos_user,
        'warchaos_nick': profile.warchaos_nick,
        'warchaos_migrado': profile.warchaos_migrado,
    }


# ── Media ────────────────────────────────────────────────────────────────────

@api_view(['GET'])
def items(request):
    data = {cat: scan_category(cat) for cat in CATEGORIES}
    return Response(data)


@api_view(['GET'])
def music_list(request):
    folder = Path(settings.MUSIC_ROOT)
    if not folder.exists():
        return Response([])
    AUDIO_EXTS = {'.mp3', '.ogg', '.wav', '.flac', '.m4a'}
    tracks = []
    for f in sorted(folder.iterdir()):
        if f.suffix.lower() in AUDIO_EXTS:
            tracks.append({'name': f.stem, 'url': f'/music/{f.name}'})
    return Response(tracks)


@api_view(['GET'])
def backgrounds(request):
    video_folder = Path(settings.MEDIA_ROOT) / 'site' / 'background' / 'video'
    if not video_folder.exists():
        return Response([])
    VIDEO_EXTS = {'.mp4', '.webm', '.mov'}
    result = []
    for f in sorted(video_folder.iterdir()):
        if f.suffix.lower() in VIDEO_EXTS:
            result.append({'name': f.stem, 'url': f'/media/site/background/video/{f.name}', 'type': 'video'})
    return Response(result)


@api_view(['GET'])
def gifs(request):
    folder = Path(settings.MEDIA_ROOT) / 'site' / 'gif'
    if not folder.exists():
        return Response([])
    result = [
        {'name': f.stem, 'url': f'/media/site/gif/{f.name}'}
        for f in sorted(folder.iterdir())
        if f.suffix.lower() == '.gif'
    ]
    return Response(result)


# ── Community feed ───────────────────────────────────────────────────────────

PAGE_SIZE = 100

@api_view(['GET'])
def community_latest(request):
    """Retorna os 6 banners mais recentes para o carrossel."""
    banners = Banner.objects.select_related('user').order_by('-created_at')[:4]
    serializer = CommunityBannerSerializer(banners, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def community(request):
    page = max(1, int(request.query_params.get('page', 1)))
    sort = request.query_params.get('sort', 'newest')
    group = request.query_params.get('group', '')  # 'player', 'clan', 'both'

    offset = (page - 1) * PAGE_SIZE
    
    # 1. Base query + Sort
    order_by = '-created_at' if sort == 'newest' else 'created_at'
    qs = Banner.objects.select_related('user').all()

    # 2. Grouping logic (using Window functions or distinct for more complex cases, but simple order if only ordering by group)
    # To properly group and still support pagination, we need a consistent sort strategy.
    if group == 'clan_player':
        qs = qs.order_by('clan', 'user__username', order_by)
    elif group == 'clan':
        qs = qs.order_by('clan', order_by)
    elif group == 'player':
        qs = qs.order_by('user__username', order_by)
    else:
        qs = qs.order_by(order_by)

    total = qs.count()
    banners = qs[offset:offset + PAGE_SIZE]
    serializer = CommunityBannerSerializer(banners, many=True)
    return Response({
        'banners': serializer.data,
        'total': total,
        'has_more': offset + PAGE_SIZE < total,
    })


# ── History ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def history_list(request):
    if request.method == 'GET':
        if not request.user.is_authenticated:
            return Response([], status=200)
        banners = Banner.objects.filter(user=request.user)
        serializer = BannerSerializer(banners, many=True)
        return Response(serializer.data)

    if not request.user.is_authenticated:
        return Response({'error': 'Login necessário para salvar banners.'}, status=status.HTTP_401_UNAUTHORIZED)

    serializer = BannerSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def history_delete(request, pk):
    try:
        banner = Banner.objects.get(pk=pk)
    except Banner.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not request.user.is_authenticated or banner.user_id != request.user.id:
        return Response(status=status.HTTP_403_FORBIDDEN)
    banner.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Auth: register / login / recover / me ────────────────────────────────────

@api_view(['POST'])
def auth_register(request):
    username     = request.data.get('username', '').strip()
    email        = request.data.get('email', '').strip()
    password     = request.data.get('password', '')
    password2    = request.data.get('password2', '')

    game_nick = request.data.get('game_nick', '').strip()
    game_clan = request.data.get('game_clan', '').strip()
    game_rank = request.data.get('game_rank', '').strip()

    if not username or not password or not email:
        return Response({'error': 'Username, email e senha são obrigatórios.'}, status=400)
    if len(username) < 3:
        return Response({'error': 'Username deve ter pelo menos 3 caracteres.'}, status=400)
    if len(password) < 6:
        return Response({'error': 'Senha deve ter pelo menos 6 caracteres.'}, status=400)
    if password != password2:
        return Response({'error': 'As senhas não coincidem.'}, status=400)
    if User.objects.filter(username__iexact=username).exists():
        return Response({'error': 'Username já em uso.'}, status=400)
    if User.objects.filter(email__iexact=email).exists():
        return Response({'error': 'Email já em uso.'}, status=400)

    user = User.objects.create_user(username=username, password=password, email=email)
    profile = user.profile
    profile.game_nick = game_nick
    profile.game_clan = game_clan
    profile.game_rank = game_rank
    profile.save()
    
    if game_rank:
        patentes = scan_category('patentes')
        for i, p in enumerate(patentes):
            if p['filename'] == game_rank:
                profile.game_rank_idx = i
                profile.save()
                break

    code = RecoveryCode.generate()
    RecoveryCode.objects.create(user=user, code=code)

    tokens = _get_tokens(user)
    tokens['user'] = _user_info(user)
    tokens['recovery_code'] = code
    return Response(tokens, status=201)


@api_view(['POST'])
def auth_login(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    try:
        user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response({'error': 'Usuário ou senha incorretos.'}, status=401)

    if not user.check_password(password):
        return Response({'error': 'Usuário ou senha incorretos.'}, status=401)

    tokens = _get_tokens(user)
    tokens['user'] = _user_info(user)
    return Response(tokens)


@api_view(['POST'])
def auth_recover(request):
    email        = request.data.get('email', '').strip()
    code         = request.data.get('code', '').strip().upper()
    new_password = request.data.get('new_password', '')

    if len(new_password) < 6:
        return Response({'error': 'Senha deve ter pelo menos 6 caracteres.'}, status=400)

    try:
        user = User.objects.get(email__iexact=email)
        rc   = user.recovery_code
    except (User.DoesNotExist, RecoveryCode.DoesNotExist):
        return Response({'error': 'Dados inválidos ou código não encontrado.'}, status=400)

    if rc.code != code:
        return Response({'error': 'Código inválido.'}, status=400)

    user.set_password(new_password)
    user.save()

    tokens = _get_tokens(user)
    tokens['user'] = _user_info(user)
    tokens['recovery_code'] = rc.code
    return Response(tokens)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_me(request):
    return Response(_user_info(request.user))


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def auth_update_profile(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if 'game_nick' in request.data:
        profile.game_nick = request.data['game_nick'].strip()
    if 'game_clan' in request.data:
        profile.game_clan = request.data['game_clan'].strip()
    if 'game_rank' in request.data:
        gr = request.data['game_rank'].strip()
        profile.game_rank = gr
        patentes = scan_category('patentes')
        for i, p in enumerate(patentes):
            if p['filename'] == gr:
                profile.game_rank_idx = i
                break
    profile.save()
    return Response(_user_info(request.user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auth_change_password(request):
    current  = request.data.get('current_password', '')
    new_pass = request.data.get('new_password', '')
    confirm  = request.data.get('confirm_password', '')

    if not request.user.check_password(current):
        return Response({'error': 'Senha atual incorreta.'}, status=400)
    if len(new_pass) < 6:
        return Response({'error': 'Nova senha deve ter pelo menos 6 caracteres.'}, status=400)
    if new_pass != confirm:
        return Response({'error': 'As senhas não coincidem.'}, status=400)

    request.user.set_password(new_pass)
    request.user.save()
    return Response({'ok': True})


# ── Discord OAuth2 ───────────────────────────────────────────────────────────

@api_view(['GET'])
def discord_auth_url(request):
    params = {
        'client_id':     settings.DISCORD_CLIENT_ID,
        'redirect_uri':  settings.DISCORD_REDIRECT_URI,
        'response_type': 'code',
        'scope':         'identify',
    }
    url = 'https://discord.com/oauth2/authorize?' + urllib.parse.urlencode(params)
    return Response({'url': url})


def discord_callback(request):
    """Browser redirect handler — not wrapped in @api_view to allow HttpResponseRedirect."""
    code = request.GET.get('code')
    if not code:
        return HttpResponseRedirect(f'{settings.FRONTEND_URL}/login?error=discord_cancelado')

    # Troca o code pelo access token do Discord
    token_res = http.post(
        'https://discord.com/api/oauth2/token',
        data={
            'client_id':     settings.DISCORD_CLIENT_ID,
            'client_secret': settings.DISCORD_CLIENT_SECRET,
            'grant_type':    'authorization_code',
            'code':          code,
            'redirect_uri':  settings.DISCORD_REDIRECT_URI,
        },
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        timeout=10,
    )
    if not token_res.ok:
        return HttpResponseRedirect(f'{settings.FRONTEND_URL}/login?error=discord_falhou')

    discord_access = token_res.json().get('access_token')

    # Obtém dados do usuário no Discord
    user_res = http.get(
        'https://discord.com/api/users/@me',
        headers={'Authorization': f'Bearer {discord_access}'},
        timeout=10,
    )
    if not user_res.ok:
        return HttpResponseRedirect(f'{settings.FRONTEND_URL}/login?error=discord_falhou')

    d_user      = user_res.json()
    discord_id  = d_user['id']
    d_username  = d_user['username']
    avatar_hash = d_user.get('avatar', '')
    avatar_url  = f'https://cdn.discordapp.com/avatars/{discord_id}/{avatar_hash}.png' if avatar_hash else ''

    # Encontra ou cria usuário local associado ao Discord ID
    try:
        profile      = DiscordProfile.objects.get(discord_id=discord_id)
        user         = profile.user
        profile.avatar = avatar_url
        profile.save()
    except DiscordProfile.DoesNotExist:
        username = d_username
        base, counter = username, 1
        while User.objects.filter(username__iexact=username).exists():
            username = f'{base}{counter}'
            counter += 1
        user = User.objects.create_user(username=username, password=None)
        DiscordProfile.objects.create(user=user, discord_id=discord_id, avatar=avatar_url)

    tokens = _get_tokens(user)
    qs = urllib.parse.urlencode({'token': tokens['access'], 'refresh': tokens['refresh']})
    return HttpResponseRedirect(f'{settings.FRONTEND_URL}?{qs}')


# ── Support System ───────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def ticket_list_create(request):
    if request.method == 'GET':
        # Usuário comum vê só os seus. Staff vê todos.
        if request.user.is_staff:
            tickets = SupportTicket.objects.all()
        else:
            tickets = SupportTicket.objects.filter(user=request.user)
        
        data = []
        for t in tickets:
            # Calcula mensagens não lidas
            last_viewed = t.last_viewed_by_staff if request.user.is_staff else t.last_viewed_by_user
            
            # Conta respostas após a última visualização
            unread_qs = t.responses.all()
            if last_viewed:
                unread_qs = unread_qs.filter(created_at__gt=last_viewed)
            
            # Se for usuário, só contam as respostas da staff
            # Se for staff, só contam as respostas do usuário (ou outros staffs?)
            # O pedido diz "quando houver resposta do outro lado"
            if request.user.is_staff:
                unread_count = unread_qs.filter(is_staff_response=False).count()
                # A mensagem inicial também conta se for nova? Geralmente sim.
                if not last_viewed or t.created_at > last_viewed:
                    unread_count += 1
            else:
                unread_count = unread_qs.filter(is_staff_response=True).count()

            data.append({
                'id': t.id,
                'name': t.name,
                'category': t.category,
                'status': t.status,
                'assigned_to': t.assigned_to.username if t.assigned_to else None,
                'created_at': t.created_at,
                'updated_at': t.updated_at,
                'username': t.user.username,
                'unread_count': unread_count
            })
        return Response(data)

    elif request.method == 'POST':
        name = request.data.get('name', '').strip()
        category = request.data.get('category', '').strip()
        message = request.data.get('message', '').strip()
        
        if not name or not category or not message:
            return Response({'error': 'Nome, categoria e mensagem são obrigatórios.'}, status=400)

        if len(message) > 1000:
            return Response({'error': 'A mensagem não pode exceder 1000 caracteres.'}, status=400)

        # Verifica se já possui chamado ativo (aguardando ou em atendimento)
        active_exists = SupportTicket.objects.filter(
            user=request.user, 
            status__in=['waiting', 'in_progress']
        ).exists()
        
        if active_exists:
            return Response({'error': 'Você já possui um chamado ativo. Aguarde a resolução antes de abrir outro.'}, status=400)
            
        ticket = SupportTicket.objects.create(
            user=request.user,
            name=name,
            category=category,
            message=message
        )
        return Response({'id': ticket.id, 'status': ticket.status}, status=201)


@api_view(['GET', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated])
def ticket_detail(request, pk):
    try:
        ticket = SupportTicket.objects.get(pk=pk)
    except SupportTicket.DoesNotExist:
        return Response({'error': 'Chamado não encontrado.'}, status=404)

    # Permissão: Staff ou o dono
    if not request.user.is_staff and ticket.user != request.user:
        return Response({'error': 'Acesso negado.'}, status=403)

    if request.method == 'GET':
        # Marcar como lido ao visualizar
        if request.user.is_staff:
            ticket.last_viewed_by_staff = timezone.now()
        else:
            ticket.last_viewed_by_user = timezone.now()
        ticket.save(update_fields=['last_viewed_by_staff', 'last_viewed_by_user'])

        responses = ticket.responses.all()
        return Response({
            'id': ticket.id,
            'name': ticket.name,
            'category': ticket.category,
            'message': ticket.message,
            'status': ticket.status,
            'assigned_to': ticket.assigned_to.username if ticket.assigned_to else None,
            'assigned_to_nick': ticket.assigned_to.profile.game_nick if ticket.assigned_to and hasattr(ticket.assigned_to, 'profile') else None,
            'assigned_to_role': ticket.assigned_to.profile.role if ticket.assigned_to and hasattr(ticket.assigned_to, 'profile') else None,
            'created_at': ticket.created_at,
            'username': ticket.user.username,
            'unread_count': 0, # Já que acabamos de ler
            'responses': [{
                'id': r.id,
                'user': r.user.username,
                'message': r.message,
                'is_staff_response': r.is_staff_response,
                'created_at': r.created_at
            } for r in responses]
        })

    elif request.method == 'POST':
        # Responder chamado
        message = request.data.get('message', '').strip()
        if not message:
            return Response({'error': 'Mensagem é obrigatória.'}, status=400)
            
        TicketResponse.objects.create(
            ticket=ticket,
            user=request.user,
            message=message,
            is_staff_response=request.user.is_staff
        )
        
        # Se estava resolvido ou sem solução e alguém respondeu, talvez reabrir? 
        # O pedido não especifica isso, mas para o Kanban:
        if not request.user.is_staff and ticket.status in ['resolved', 'unsolved']:
            ticket.status = 'waiting' # Reabre se o usuário respondeu
            
        ticket.save()
        return Response({'ok': True})

    elif request.method == 'PATCH':
        # Mudar status (Staff apenas)
        if not request.user.is_staff:
            return Response({'error': 'Apenas staff pode alterar o status.'}, status=403)
            
        new_status = request.data.get('status')
        if new_status in ['waiting', 'in_progress', 'resolved', 'unsolved']:
            
            # Quando movido para 'in_progress' (Em Atendimento), atribui ao staff atual
            if new_status == 'in_progress' and ticket.status == 'waiting':
                ticket.assigned_to = request.user

            ticket.status = new_status
            ticket.save()
            return Response({
                'status': ticket.status,
                'assigned_to': ticket.assigned_to.username if ticket.assigned_to else None
            })
        
        return Response({'error': 'Status inválido.'}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def community_statistics(request):
    profiles = list(UserProfile.objects.select_related('user', 'user__discord').all())
    user_profile = request.user.profile
    
    def fmt(p, value):
        return {
            'username': p.user.username,
            'nick': p.game_nick,
            'avatar': p.user.discord.avatar if hasattr(p.user, 'discord') else None,
            'rank_idx': p.game_rank_idx or 0,
            'value': value
        }

    def get_top_5_with_user(profiles, key_fn, user_profile):
        sorted_profiles = sorted(profiles, key=key_fn, reverse=True)
        top_5 = [fmt(p, key_fn(p)) for p in sorted_profiles[:5]]
        
        user_rank = 0
        for i, p in enumerate(sorted_profiles):
            if p.id == user_profile.id:
                user_rank = i + 1
                break
        
        user_data = fmt(user_profile, key_fn(user_profile))
        user_data['rank'] = user_rank
        
        return {
            'top5': top_5,
            'user': user_data
        }

    # Rankings solicitados (Top 5 + User)
    ranking_pvp_kd = get_top_5_with_user(profiles, lambda x: x.pvp_em or 0, user_profile)
    ranking_pvp_matches = get_top_5_with_user(profiles, lambda x: x.pvp_matches or 0, user_profile)
    ranking_pvp_hours = get_top_5_with_user(profiles, lambda x: x.pvp_hours or 0, user_profile)
    ranking_pvp_rank = get_top_5_with_user(profiles, lambda x: x.game_rank_idx or 0, user_profile)

    ranking_pve_total = get_top_5_with_user(profiles, lambda x: x.pve_matches or 0, user_profile)
    ranking_pve_easy = get_top_5_with_user(profiles, lambda x: x.pve_mission_easy or 0, user_profile)
    ranking_pve_normal = get_top_5_with_user(profiles, lambda x: x.pve_mission_medium or 0, user_profile)
    ranking_pve_hard = get_top_5_with_user(profiles, lambda x: x.pve_mission_hard or 0, user_profile)

    # Médias da Comunidade
    count = len(profiles) or 1
    avg_pvp_kd = sum(p.pvp_em or 0 for p in profiles) / count
    avg_pvp_matches = sum(p.pvp_matches or 0 for p in profiles) / count
    avg_pvp_hours = sum(p.pvp_hours or 0 for p in profiles) / count
    avg_pvp_rank = sum(p.game_rank_idx or 0 for p in profiles) / count

    avg_pve_total = sum(p.pve_matches or 0 for p in profiles) / count
    avg_pve_hours = sum(p.pve_hours or 0 for p in profiles) / count
    avg_pve_easy = sum(p.pve_mission_easy or 0 for p in profiles) / count
    avg_pve_normal = sum(p.pve_mission_medium or 0 for p in profiles) / count
    avg_pve_hard = sum(p.pve_mission_hard or 0 for p in profiles) / count

    # Global Stats
    global_total_pvp_matches = sum(p.pvp_matches or 0 for p in profiles)
    global_total_pve_matches = sum(p.pve_matches or 0 for p in profiles)
    global_total_pve_easy = sum(p.pve_mission_easy or 0 for p in profiles)
    global_total_pve_normal = sum(p.pve_mission_medium or 0 for p in profiles)
    global_total_pve_hard = sum(p.pve_mission_hard or 0 for p in profiles)
    global_total_hours = sum((p.pvp_hours or 0) + (p.pve_hours or 0) for p in profiles)
    global_player_count = count

    return Response({
        'general': {
            'player_count': global_player_count,
            'total_pvp_matches': global_total_pvp_matches,
            'total_pve_matches': global_total_pve_matches,
            'total_pve_easy': global_total_pve_easy,
            'total_pve_normal': global_total_pve_normal,
            'total_pve_hard': global_total_pve_hard,
            'total_hours': round(global_total_hours, 1),
        },
        'pvp': {
            'ranking_kd': ranking_pvp_kd,
            'ranking_matches': ranking_pvp_matches,
            'ranking_hours': ranking_pvp_hours,
            'ranking_rank': ranking_pvp_rank,
            'community_avgs': {
                'kd': round(avg_pvp_kd, 2),
                'matches': round(avg_pvp_matches, 1),
                'hours': round(avg_pvp_hours, 1),
                'rank': round(avg_pvp_rank, 1),
            },
            'user_stats': {
                'kd': user_profile.pvp_em or 0,
                'matches': user_profile.pvp_matches or 0,
                'hours': user_profile.pvp_hours or 0,
                'rank': user_profile.game_rank_idx or 0,
            }
        },
        'pve': {
            'ranking_total': ranking_pve_total,
            'ranking_easy': ranking_pve_easy,
            'ranking_normal': ranking_pve_normal,
            'ranking_hard': ranking_pve_hard,
            'community_avgs': {
                'total': round(avg_pve_total, 1),
                'hours': round(avg_pve_hours, 1),
                'easy': round(avg_pve_easy, 1),
                'normal': round(avg_pve_normal, 1),
                'hard': round(avg_pve_hard, 1),
            },
            'user_stats': {
                'total': user_profile.pve_matches or 0,
                'hours': user_profile.pve_hours or 0,
                'easy': user_profile.pve_mission_easy or 0,
                'normal': user_profile.pve_mission_medium or 0,
                'hard': user_profile.pve_mission_hard or 0,
            }
        }
    })
