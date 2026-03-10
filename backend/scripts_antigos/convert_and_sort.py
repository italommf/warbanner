"""
Converte todos os .dds da pasta 'processar' para .png
e os distribui nas pastas insignias/, marcas/ e fitas/.
"""
import sys
import io
from pathlib import Path
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE       = Path(__file__).parent
DEST_ROOTS = {
    'insignias': BASE.parent / 'insignias',
    'marcas':    BASE.parent / 'marcas',
    'fitas':     BASE.parent / 'fitas',
}

def classify(name: str):
    n = name.lower()
    if 'badge' in n:
        return 'insignias'
    if 'mark' in n:
        return 'marcas'
    if 'strip' in n or 'stripe' in n:
        return 'fitas'
    return None

ok = skipped = errors = 0

for dds in sorted(BASE.glob('*.dds')):
    category = classify(dds.stem)
    if category is None:
        print(f'[SKIP] {dds.name} -- nao classificado')
        skipped += 1
        continue

    dest_dir = DEST_ROOTS[category]
    dest_dir.mkdir(exist_ok=True)
    dest = dest_dir / (dds.stem + '.png')

    if dest.exists():
        print(f'[EXISTS] {dds.name} -> {category}/')
        ok += 1
        continue

    try:
        img = Image.open(dds)
        if img.mode not in ('RGBA', 'RGB'):
            img = img.convert('RGBA')
        img.save(dest, 'PNG')
        print(f'[OK] {dds.name} -> {category}/{dest.name}')
        ok += 1
    except Exception as e:
        print(f'[ERRO] {dds.name}: {e}')
        errors += 1

print(f'\nConcluido: {ok} convertidos, {skipped} ignorados, {errors} erros.')
