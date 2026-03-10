import os
import json
import urllib.parse
from pathlib import Path
from django.conf import settings
from django.contrib.auth.models import User
from django.http import HttpResponseRedirect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Banner, RecoveryCode, DiscordProfile, UserProfile
from .serializers import BannerSerializer, CommunityBannerSerializer
import requests as http

CATEGORIES = ['marcas', 'insignias', 'fitas', 'patentes']

_color_index: dict | None = None


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
    subfolder = f'site/{category}' if category == 'patentes' else category
    folder = Path(settings.MEDIA_ROOT) / subfolder
    if not folder.exists():
        return []
    color_index = _load_color_index()
    items = []
    for f in sorted(folder.iterdir(), key=_natural_key):
        if f.suffix.lower() == '.png':
            key = f'{subfolder}/{f.name}'
            items.append({
                'name': filename_to_name(f.name),
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
    banners = Banner.objects.select_related('user').order_by('-created_at')[:6]
    serializer = CommunityBannerSerializer(banners, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def community(request):
    page = max(1, int(request.query_params.get('page', 1)))
    offset = (page - 1) * PAGE_SIZE
    qs = Banner.objects.select_related('user').order_by('-created_at')
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
