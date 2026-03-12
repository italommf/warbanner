import os
import sys
import pandas as pd
from pathlib import Path
import xml.etree.ElementTree as ET

# Adiciona o caminho para importar o processador
BASE_DIR = Path("d:/Git/Projetos Pessoais/Warface Desafios/backend")
sys.path.append(str(BASE_DIR / 'processamento_nomes_desc_desafios'))

try:
    from processador_detalhado import obter_dataframes_completos
except ImportError:
    print("Erro: Não foi possível importar obter_dataframes_completos")
    sys.exit(1)

def audit_and_report():
    # 1. Obter os DataFrames (Descoberta Automática de XMLs)
    df_m, df_i, df_f = obter_dataframes_completos()
    
    # Conjuntos de imagens presentes nos dataframes (normalized lowercase)
    df_images = {
        'marcas': {str(x).lower(): x for x in df_m['imagem'].dropna().unique()},
        'insignias': {str(x).lower(): x for x in df_i['imagem'].dropna().unique()},
        'fitas': {str(x).lower(): x for x in df_f['imagem'].dropna().unique()}
    }
    
    media_root = BASE_DIR / "imagens"
    categories = ['marcas', 'insignias', 'fitas']
    
    resumo = {}
    total_imagem_fisica = 0
    total_descoberto_xml = 0
    
    with open("desafios_faltantes.txt", "w", encoding="utf-8") as out:
        out.write("-" * 50 + "\n")
        out.write("DESAFIOS SEM METADADOS (NENHUM XML APONTA PARA ELES)\n")
        out.write("-" * 50 + "\n\n")

        for cat in categories:
            folder = media_root / cat
            if not folder.exists():
                resumo[cat] = (0, 0, 0)
                continue
                
            folder_stems_map = {f.stem.lower(): f.name for f in folder.iterdir() if f.suffix.lower() == '.png'}
            folder_stems = set(folder_stems_map.keys())
            xml_stems = set(df_images[cat].keys())
            
            missing = sorted(list(folder_stems - xml_stems))
            ok = folder_stems & xml_stems
            
            resumo[cat] = (len(folder_stems), len(ok), len(missing))
            total_imagem_fisica += len(folder_stems)
            total_descoberto_xml += len(ok)
            
            out.write(f"\n{cat.upper()} ({len(missing)} faltantes):\n")
            out.write("-" * 30 + "\n")
            for m in missing:
                out.write(f"{folder_stems_map[m]}\n")

    print("-" * 50)
    print(f"{'Categoria':<12} | {'Total Pasta':<11} | {'Com XML':<10} | {'Sem XML':<10}")
    print("-" * 50)
    for cat, (tot, ok, mi) in resumo.items():
        print(f"{cat:<12} | {tot:<11} | {ok:<10} | {mi:<10}")
    print("-" * 50)
    print(f"{'TOTAL':<12} | {total_imagem_fisica:<11} | {total_descoberto_xml:<10} | {total_imagem_fisica - total_descoberto_xml:<10}")
    print("-" * 50)

    # Verifica o caso específico 9may
    print("\nVerificando caso específico: 9may_stripe_01")
    fita_9may = df_f[df_f['imagem'].str.contains('9May', case=False, na=False)]
    if not fita_9may.empty:
        row = fita_9may.iloc[0]
        print(f"  Imagem no XML: {row['imagem']}")
        print(f"  Nome Traduzido: {row['nome']}")
        print(f"  Descrição: {row['descrição']}")
        print(f"  Quantidade: {row['quantidade']}")
        print(f"  Arquivo XML de origem: {row['arquivo_xml']}")
    else:
        print("  AVISO: 9may_stripe_01 não foi encontrado no novo processamento.")

if __name__ == "__main__":
    audit_and_report()
