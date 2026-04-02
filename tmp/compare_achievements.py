import os

ach_path = r'd:\Git\Projetos Pessoais\Warface Desafios\backend\processamento_nomes_desc_desafios\achievements'
old_path = r'd:\Git\Projetos Pessoais\Warface Desafios\backend\processamento_nomes_desc_desafios\achievements_old'

ach_files = set(os.listdir(ach_path))
old_files = set(os.listdir(old_path))

missing_in_ach = old_files - ach_files

print(f"Files in old but not in current: {len(missing_in_ach)}")
for f in sorted(list(missing_in_ach)):
    print(f)
