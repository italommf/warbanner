"""
Seed: 30 contas + 5-10 banners com imagens reais (marca/insignia/fita/patente).

Uso:
    python manage.py seed_community          # cria dados
    python manage.py seed_community --clear  # limpa TUDO (exceto italommf) e recria
"""

import base64
import io
import random
from pathlib import Path

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from api.models import Banner, UserProfile

# sem seed fixo — cada execucao gera combinacoes diferentes

# ── Caminhos ──────────────────────────────────────────────────────────────────

IMAGENS = Path(__file__).resolve().parents[3] / 'imagens'

# ── Dados para geração ────────────────────────────────────────────────────────

NICK_PREFIXES = [
    'Dark', 'Shadow', 'Ghost', 'Viper', 'Ice', 'Fire', 'Storm', 'Wolf',
    'Steel', 'Night', 'Blood', 'Neon', 'Toxic', 'Alpha', 'Omega', 'Blade',
    'Raptor', 'Cobra', 'Falcon', 'Hydra', 'Thunder', 'Phoenix', 'Reaper',
    'Sniper', 'Ranger', 'Striker', 'Warrior', 'Cyber', 'Death', 'Iron',
]
NICK_SUFFIXES = [
    'Shot', 'Hunter', 'Killer', 'Strike', 'Force', 'Eagle', 'Dragon',
    'Venom', 'Hawk', 'Fury', 'Sniper', 'Blade', 'Wolf', 'Ace', 'Pro',
    'Reaper', 'Claw', 'Fang', 'Storm', 'Sting',
]
CLANS = [
    'BR', 'PT', 'WF', 'GG', 'PVP', 'GLD', 'BLK', 'R6', 'TOP', 'ACE',
    'XTC', 'SWG', 'BTL', 'ELT', 'WAR', 'NVY', 'RED', 'PRO', '', '',
]
RANKS = [
    'Recruta', 'Soldado', 'Cabo', 'Sargento', 'Tenente',
    'Capitao', 'Major', 'Coronel', 'General', 'Marechal',
]

# ── Cache de arquivos ─────────────────────────────────────────────────────────

_FILES: dict[str, list[str]] = {}


def _files(category: str) -> list[str]:
    if category not in _FILES:
        folder = IMAGENS / category
        _FILES[category] = (
            [f.name for f in folder.iterdir() if f.suffix.lower() == '.png']
            if folder.is_dir() else []
        )
    return _FILES[category]


def _pick(category: str) -> str:
    files = _files(category)
    return random.choice(files) if files else ''


# ── Renderização do banner com Pillow ─────────────────────────────────────────

def _load(category: str, filename: str, size: tuple[int, int]):
    """Carrega e redimensiona uma imagem do jogo como RGBA."""
    if not filename:
        return None
    path = IMAGENS / category / filename
    if not path.exists():
        return None
    try:
        from PIL import Image
        return Image.open(path).convert('RGBA').resize(size, Image.LANCZOS)
    except Exception:
        return None


def _paste(base, overlay, x: int, y: int) -> None:
    """Cola overlay RGBA sobre base usando canal alpha."""
    if overlay is None:
        return
    base.paste(overlay, (x, y), mask=overlay.split()[3])


def _font(size: int):
    try:
        from PIL import ImageFont
        for path in [
            'C:/Windows/Fonts/arialn.ttf',
            'C:/Windows/Fonts/arial.ttf',
            'C:/Windows/Fonts/verdana.ttf',
        ]:
            if Path(path).exists():
                return ImageFont.truetype(path, size)
        return ImageFont.load_default()
    except Exception:
        return None


def _render_banner(nick: str, clan: str, marca: str, insignia: str,
                   fita: str, patente: str) -> str:
    """
    Renderiza um banner 520×110 com as imagens reais do jogo,
    replicando o layout de useCanvasDraw.ts.
    """
    from PIL import Image, ImageDraw

    W, H = 520, 110

    # Fundo: gradiente diagonal igual ao canvas (#0e1e34 -> #060e1c)
    img = Image.new('RGBA', (W, H))
    draw = ImageDraw.Draw(img)
    c1, c2 = (14, 30, 52), (6, 14, 28)
    for y in range(H):
        t = y / H
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        draw.line([(0, y), (W - 1, y)], fill=(r, g, b, 255))

    # Borda
    draw.rectangle([0, 0, W - 1, H - 1], outline=(30, 48, 72, 255), width=1)

    # ── Layout (espelha useCanvasDraw.ts) ──────────────────────────────────────
    fita_x = 60
    fita_w = int((W - 60) * 0.9)       # 414
    fita_h = int((H - 6) * 0.9)        # 93
    fita_y = (H - fita_h) // 2         # 8

    ins_cx = fita_x
    ins_cy = fita_y + fita_h // 2      # ~54

    # Camada 1: FITA
    _paste(img, _load('fitas', fita, (fita_w, fita_h)), fita_x, fita_y)

    # Camada 2: INSIGNIA
    ins_size = 84
    ins_x = ins_cx - ins_size // 2     # 18
    ins_y = ins_cy - ins_size // 2     # 12
    _paste(img, _load('insignias', insignia, (ins_size, ins_size)), ins_x, ins_y)

    # Camada 3: MARCA (sobre a insignia)
    _paste(img, _load('marcas', marca, (72, 72)), ins_cx - 36, ins_cy - 36)

    # Camada 4: PATENTE
    pat_x    = ins_cx + ins_size // 2 + 6   # 108
    pat_size = 44
    pat_y    = ins_cy - pat_size // 2        # 32
    pat_img  = _load('patentes', patente, (pat_size, pat_size))
    _paste(img, pat_img, pat_x, pat_y)

    # Texto
    text_x = pat_x + (pat_size + 8 if pat_img else 12)   # 160
    draw   = ImageDraw.Draw(img)

    clan_upper = clan.upper() if clan else ''
    if clan_upper:
        draw.text(
            (text_x, ins_cy - 16),
            clan_upper,
            fill=(154, 175, 192, 255),
            font=_font(11),
        )
    draw.text(
        (text_x, ins_cy + 2),
        nick,
        fill=(200, 212, 224, 255),
        font=_font(13),
    )

    # Export como PNG base64
    buf = io.BytesIO()
    img.convert('RGB').save(buf, format='PNG', optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f'data:image/png;base64,{b64}'


# ── Management Command ────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = 'Seed: 30 contas com 5-10 banners reais por conta'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Limpa TUDO (banners + usuarios exceto italommf) antes de criar',
        )
        parser.add_argument(
            '--accounts',
            type=int,
            default=30,
            help='Quantidade de contas a criar (padrao: 30)',
        )
        parser.add_argument(
            '--extra-banners',
            type=int,
            default=0,
            help='Cria N banners extras distribuidos entre usuarios existentes (sem criar contas)',
        )

    def _build_banner(self, user) -> Banner:
        """Renderiza um banner em memória (sem salvar no banco)."""
        b_nick   = f'{random.choice(NICK_PREFIXES)}{random.choice(NICK_SUFFIXES)}_BR'
        b_clan   = random.choice(CLANS)
        marca    = _pick('marcas')
        insignia = _pick('insignias')
        fita     = _pick('fitas')
        patente  = _pick('patentes')
        return Banner(
            user=user,
            nick=b_nick,
            clan=b_clan,
            marca=marca,
            insignia=insignia,
            fita=fita,
            patente=patente,
            banner_data=_render_banner(b_nick, b_clan, marca, insignia, fita, patente),
        )

    BULK_SIZE = 200  # salva em lotes para nao travar SQLite

    def _flush(self, batch: list) -> None:
        if batch:
            Banner.objects.bulk_create(batch)
            batch.clear()

    def handle(self, *args, **options):
        if options['clear']:
            b_del = Banner.objects.all().delete()[0]
            u_del = User.objects.exclude(username='italommf').delete()[0]
            self.stdout.write(self.style.WARNING(
                f'Limpo: {b_del} banners | {u_del} usuarios removidos (italommf preservado)'
            ))

        # ── Criar contas novas ─────────────────────────────────────────────────
        n_accounts    = options['accounts']
        total_banners = 0
        used_names    = set(User.objects.values_list('username', flat=True))

        if n_accounts > 0:
            self.stdout.write(f'Gerando {n_accounts} contas...')

        created_users = []
        for i in range(n_accounts):
            for _ in range(100):
                username = (
                    random.choice(NICK_PREFIXES).lower() +
                    random.choice(NICK_SUFFIXES).lower()
                )
                if username not in used_names:
                    used_names.add(username)
                    break
            else:
                username = f'player{i}'
                used_names.add(username)

            clan = random.choice(CLANS)
            nick = f'{random.choice(NICK_PREFIXES)}{random.choice(NICK_SUFFIXES)}_BR'

            user = User.objects.create_user(username=username, password='seed1234')
            UserProfile.objects.create(
                user=user,
                game_nick=nick,
                game_clan=clan,
                game_rank=random.choice(RANKS),
            )
            created_users.append(user)

            n_banners = random.randint(5, 10)
            batch: list[Banner] = []
            for _ in range(n_banners):
                batch.append(self._build_banner(user))
                total_banners += 1
            self._flush(batch)

            self.stdout.write(f'  [{i+1:02d}/{n_accounts}] @{username} -> {n_banners} banners')

        # ── Banners extras em usuarios existentes ──────────────────────────────
        extra = options['extra_banners']
        if extra > 0:
            pool = list(User.objects.exclude(username='italommf'))
            if not pool:
                self.stdout.write(self.style.ERROR('Nenhum usuario disponivel para extra-banners.'))
            else:
                self.stdout.write(f'Criando {extra} banners extras em {len(pool)} usuarios...')
                batch = []
                for j in range(extra):
                    batch.append(self._build_banner(random.choice(pool)))
                    total_banners += 1
                    if len(batch) >= self.BULK_SIZE:
                        self._flush(batch)
                    if (j + 1) % 500 == 0:
                        self.stdout.write(f'  {j + 1}/{extra} banners extras criados...')
                self._flush(batch)

        self.stdout.write(self.style.SUCCESS(
            f'\nPronto! {n_accounts} contas | {total_banners} banners criados.'
        ))
        self.stdout.write('Para limpar: python manage.py seed_community --clear')
