import re

def clean_text(text):
    """Basic cleaning for OCR noise."""
    if not text: return ""
    return text.strip().replace('\n', ' ').replace('\r', '')

def level_to_rank_idx(level):
    """
    Mapping for Warface ranks:
    - 1-100: Standard ranks (index 0-99)
    - 101-199: Prestige 1 (index 100)
    - 200-299: Prestige 2 (index 101)
    - 300-399: Prestige 3 (index 102)
    - 400-499: Prestige 4 (index 103)
    - 500-999: Prestige 5 (index 104)
    - 1000+:   Prestige 6 (index 105)
    """
    if level <= 100:
        return max(0, level - 1)
    elif level <= 199:
        return 100
    elif level <= 299:
        return 101
    elif level <= 399:
        return 102
    elif level <= 499:
        return 103
    elif level <= 999:
        return 104
    else:
        return 105


def parse_nickname_and_rank(raw_nick):
    """
    Extrai o nickname limpo e o rank (patente) do texto do OCR.
    Formato esperado: 'NomeDoJogador [XX]' ou 'NomeDoJogador [XXX]'
    Retorna (nickname_limpo, rank_index_0based)
    rank_index_0based: 0 a 99 (rank 1 = index 0, rank 100+ = index 99)
    """
    if not raw_nick:
        return "", 0
    
    # Procura por [número] no texto (com espaços opcionais dentro dos colchetes)
    match = re.search(r'\[\s*(\d+)\s*\]', raw_nick)
    if match:
        rank_num = int(match.group(1))
        rank_idx = level_to_rank_idx(rank_num)
        # Remove o [XX] do nickname
        nickname = raw_nick[:match.start()].strip()
    else:
        nickname = raw_nick.strip()
        rank_idx = 0
    
    return nickname, rank_idx

def parse_win_rate(text):
    """
    Parseia o Win Rate do Warface. Formato: XX.XX% (0% a 100%).
    Remove o % final e interpreta o restante como float.
    """
    if not text: return None
    # Remove tudo que não é dígito, ponto ou vírgula
    clean = text.replace('%', '').replace(',', '.').strip()
    clean = re.sub(r'[^\d.]', '', clean)
    if not clean: return None
    try:
        val = float(clean)
        # Garante que está no range 0-100
        if val > 100:
            # OCR pode ter comido o ponto (ex: "6244" => 62.44)
            val = val / 100.0
        return round(val, 2)
    except ValueError:
        return None

def parse_float(text):
    """Extracts a float value from text (e.g., '1.31' or '49.32%')."""
    if not text: return None
    # Remove % e outros caracteres, mantém dígitos, ponto e vírgula
    clean = re.sub(r'[^\d.,]', '', text).replace(',', '.')
    if not clean: return None
    try:
        return float(clean)
    except ValueError:
        return None

def parse_int(text):
    """Extracts an integer value from text."""
    if not text: return None
    clean = re.sub(r'[^\d]', '', text)
    try:
        return int(clean)
    except ValueError:
        return None

def validate_range(val, min_v, max_v):
    """Validates if a value is within a given range."""
    if val is None: return False
    return min_v <= val <= max_v

def validate_pvp_stats(data):
    """
    Validates the structure and ranges of the final PvP data.
    Returns (is_valid, error_message)
    """
    # KD: 0 to 20
    kd = data.get('pvp_stats', {}).get('kd_ratio')
    if not validate_range(kd, 0, 20):
        return False, f"Invalid KD Ratio: {kd}"

    # Win Rate: 0 to 100
    wr = data.get('pvp_stats', {}).get('win_rate')
    if not validate_range(wr, 0, 100):
        return False, f"Invalid Win Rate: {wr}"

    # Matches: 0 to 500,000
    matches = data.get('pvp_stats', {}).get('matches_played')
    if not validate_range(matches, 0, 500000):
        return False, f"Invalid Matches count: {matches}"

    # Hours: 0 to 20,000
    hours = data.get('time_played_hours')
    if not validate_range(hours, 0, 20000):
        return False, f"Invalid Total Hours: {hours}"

    return True, ""
