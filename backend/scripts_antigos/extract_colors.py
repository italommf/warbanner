"""
extract_colors.py — Extrai cor dominante de cada PNG nas pastas de desafios.

Uso:
    cd backend/imagens/processar
    python extract_colors.py

Gera: backend/imagens/color_index.json
"""

import sys
import json
import colorsys
from pathlib import Path
from collections import defaultdict

SCRIPT_DIR = Path(__file__).parent
IMAGENS_DIR = SCRIPT_DIR.parent          # backend/imagens/
CATEGORIES = ['marcas', 'insignias', 'fitas']
OUTPUT = IMAGENS_DIR / 'color_index.json'

# Thresholds para classificação
V_PRETO   = 0.22   # value abaixo disso → preto
S_PRATA   = 0.18   # saturation abaixo disso (e V alto) → prata
V_PRATA_MIN = 0.40


def classify_pixel(h: float, s: float, v: float) -> str:
    """
    Classifica um pixel HSV (todos 0-1) em grupo de cor.
    Retorna string ou None (pixel neutro, baixo peso).
    """
    if v < V_PRETO:
        return 'preto'

    if s < S_PRATA:
        return 'prata' if v >= V_PRATA_MIN else 'preto'

    hd = h * 360  # graus

    if hd < 20 or hd >= 340:
        return 'vermelho'
    if 20 <= hd < 45 and v < 0.58:
        return 'bronze'
    if 20 <= hd < 70:
        return 'ouro'
    if 70 <= hd < 160:
        return 'verde'
    if 160 <= hd < 270:
        return 'azul'
    # roxo/rosa → outro
    return 'outro'


def extract_dominant_color(path: Path) -> str:
    from PIL import Image

    try:
        img = Image.open(path).convert('RGBA')
        # Redimensiona para 32×32 para ganho de performance
        img = img.resize((32, 32), Image.LANCZOS)
        pixels = img.getdata()

        votes: dict[str, float] = defaultdict(float)

        for r, g, b, a in pixels:
            if a < 128:
                continue  # pixel transparente
            h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            color = classify_pixel(h, s, v)
            # Peso = saturação ao quadrado para priorizar pixels coloridos
            weight = s * s + 0.05  # +0.05 para que até cinzas tenham algum voto
            votes[color] += weight

        if not votes:
            return 'outro'

        return max(votes, key=lambda c: votes[c])

    except Exception as e:
        print(f"  ERRO {path.name}: {e}", file=sys.stderr)
        return 'outro'


def main():
    from collections import Counter

    # Mantém índice existente para não reprocessar arquivos já analisados
    existing: dict = {}
    if OUTPUT.exists():
        try:
            existing = json.loads(OUTPUT.read_text(encoding='utf-8'))
            print(f"Índice existente: {len(existing)} entradas.")
        except Exception:
            pass

    index: dict = dict(existing)
    processed = 0
    skipped = 0

    for cat in CATEGORIES:
        folder = IMAGENS_DIR / cat
        if not folder.exists():
            print(f"AVISO: pasta não encontrada — {folder}")
            continue

        files = sorted(folder.glob('*.png'))
        new_in_cat = 0

        for f in files:
            key = f'{cat}/{f.name}'
            if key in index:
                skipped += 1
                continue

            color = extract_dominant_color(f)
            index[key] = color
            new_in_cat += 1
            processed += 1

            if processed % 200 == 0:
                print(f"  {processed} processados...")

        if new_in_cat:
            print(f"{cat}: {new_in_cat} novas entradas.")
        else:
            print(f"{cat}: sem novidades.")

    OUTPUT.write_text(
        json.dumps(index, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f"\nSalvo: {OUTPUT}")
    print(f"Total: {len(index)} entradas  ({processed} novas, {skipped} ignoradas)")

    # Resumo por grupo de cor
    counts = Counter(index.values())
    print("\nDistribuição de cores:")
    for color, count in sorted(counts.items(), key=lambda x: -x[1]):
        pct = count / len(index) * 100
        print(f"  {color:12s}: {count:5d}  ({pct:.1f}%)")


if __name__ == '__main__':
    main()
