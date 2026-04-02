import os
import shutil

ach_path = r'd:\Git\Projetos Pessoais\Warface Desafios\backend\processamento_nomes_desc_desafios\achievements'
old_path = r'd:\Git\Projetos Pessoais\Warface Desafios\backend\processamento_nomes_desc_desafios\achievements_old'

ach_files = set(f.lower() for f in os.listdir(ach_path))
old_files = [f for f in os.listdir(old_path) if f.lower().endswith('.xml')]

copied_count = 0
for f in old_files:
    if f.lower() not in ach_files:
        shutil.copy2(os.path.join(old_path, f), os.path.join(ach_path, f))
        copied_count += 1

print(f"Copied {copied_count} files from achievements_old to achievements.")
