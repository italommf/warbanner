import pandas as pd
import os
import sys
from pathlib import Path

# Adiciona caminhos
BASE_DIR = Path("d:/Git/Projetos Pessoais/Warface Desafios/backend")
sys.path.append(str(BASE_DIR / 'processamento_nomes_desc_desafios'))

try:
    from processador_detalhado import obter_dataframes_completos
except ImportError as e:
    print(f"Erro: {e}")
    sys.exit(1)

def analyze_metadata():
    df_m, df_i, df_f = obter_dataframes_completos()
    
    categories = {'marcas': df_m, 'insignias': df_i, 'fitas': df_f}
    
    with open(BASE_DIR / "processamento_nomes_desc_desafios/metadata_report.txt", "w", encoding="utf-8") as out:
        out.write("-" * 60 + "\n")
        out.write(f"{'Categoria':<12} | {'Total':<8} | {'S/ Nome':<10} | {'S/ Desc':<10} | {'S/ Ambos':<10}\n")
        out.write("-" * 60 + "\n")
        
        for cat, df in categories.items():
            total = len(df)
            sem_nome = len(df[df['nome'].str.strip() == ''])
            sem_desc = len(df[df['descrição'].str.strip() == ''])
            sem_ambos = len(df[(df['nome'].str.strip() == '') & (df['descrição'].str.strip() == '')])
            
            out.write(f"{cat:<12} | {total:<8} | {sem_nome:<10} | {sem_desc:<10} | {sem_ambos:<10}\n")
            
        out.write("-" * 60 + "\n")

        # Mostrar alguns exemplos de desafios que ainda estão sem nome/descrição
        out.write("\nExemplos de desafios com XML mas SEM NOME/DESCRIÇÃO:\n")
        for cat, df in categories.items():
            missing = df[(df['nome'].str.strip() == '') | (df['descrição'].str.strip() == '')]
            if not missing.empty:
                out.write(f"\n--- {cat.upper()} ({len(missing)} total) ---\n")
                for _, row in missing.head(10).iterrows():
                    out.write(f"Arquivo XML: {row.get('arquivo_xml', 'N/A')} | Imagem: {row['imagem']} | Nome: '{row['nome']}' | Desc: '{row['descrição']}'\n")

if __name__ == "__main__":
    analyze_metadata()
