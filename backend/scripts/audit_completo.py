"""
Auditoria completa do processamento de desafios.
Compara o reprocessamento com os dados anteriores e analisa a qualidade dos mapeamentos.
"""
import os
import sys
import pandas as pd
from pathlib import Path

BASE_DIR = Path("d:/Git/Projetos Pessoais/Warface Desafios/backend")
sys.path.append(str(BASE_DIR / 'processamento_nomes_desc_desafios'))

from processador_detalhado import obter_dataframes_completos

def audit():
    df_m, df_i, df_f = obter_dataframes_completos()
    
    media_root = BASE_DIR / "imagens" / "desafios"
    categories = {
        'marcas': (df_m, media_root / 'marcas'),
        'insignias': (df_i, media_root / 'insignias'),
        'fitas': (df_f, media_root / 'fitas'),
    }
    
    # Dados anteriores para comparação
    dados_anteriores = {
        'total_imagens': 5546,
        'mapeadas': 4918,
        'sem_xml': 628,
    }
    
    print("=" * 70)
    print("AUDITORIA COMPLETA DO PROCESSAMENTO DE DESAFIOS")
    print("=" * 70)
    
    total_img = 0
    total_com_xml = 0
    total_com_nome = 0
    total_com_desc = 0
    total_com_nome_e_desc = 0
    total_sem_nome = 0
    total_sem_desc = 0
    total_sem_nada = 0
    
    for cat_name, (df, folder) in categories.items():
        if not folder.exists():
            continue
            
        # Imagens físicas na pasta
        folder_stems = {f.stem.lower() for f in folder.iterdir() if f.suffix.lower() == '.png'}
        
        # Imagens referenciadas no XML
        xml_stems = {str(x).lower() for x in df['imagem'].dropna().unique()}
        
        com_xml = folder_stems & xml_stems
        sem_xml = folder_stems - xml_stems
        
        # Qualidade dos mapeamentos (apenas os que têm XML)
        df_com_xml = df[df['imagem'].str.lower().isin(com_xml)]
        
        tem_nome = df_com_xml['nome'].notna() & (df_com_xml['nome'] != '')
        tem_desc = df_com_xml['descrição'].notna() & (df_com_xml['descrição'] != '')
        
        n_com_nome = tem_nome.sum()
        n_com_desc = tem_desc.sum()
        n_com_ambos = (tem_nome & tem_desc).sum()
        n_sem_nome = (~tem_nome).sum()
        n_sem_desc = (~tem_desc).sum()
        n_sem_nada = (~tem_nome & ~tem_desc).sum()
        
        total_img += len(folder_stems)
        total_com_xml += len(com_xml)
        total_com_nome += n_com_nome
        total_com_desc += n_com_desc
        total_com_nome_e_desc += n_com_ambos
        total_sem_nome += n_sem_nome
        total_sem_desc += n_sem_desc
        total_sem_nada += n_sem_nada
        
        print(f"\n--- {cat_name.upper()} ---")
        print(f"  Imagens na pasta:      {len(folder_stems)}")
        print(f"  Com XML (mapeadas):    {len(com_xml)}")
        print(f"  Sem XML:               {len(sem_xml)}")
        print(f"  ---")
        print(f"  Das mapeadas ({len(com_xml)}):")
        print(f"    Com Nome:            {n_com_nome}")
        print(f"    Com Descrição:       {n_com_desc}")
        print(f"    Com Nome+Desc:       {n_com_ambos}")
        print(f"    Sem Nome:            {n_sem_nome}")
        print(f"    Sem Descrição:       {n_sem_desc}")
        print(f"    Sem Nome NEM Desc:   {n_sem_nada}")
    
    print("\n" + "=" * 70)
    print("RESUMO GERAL")
    print("=" * 70)
    print(f"  Total de imagens na pasta:         {total_img}")
    print(f"  Mapeadas com XML:                  {total_com_xml}")
    print(f"  Sem XML:                           {total_img - total_com_xml}")
    print(f"  ---")
    print(f"  Das mapeadas ({total_com_xml}):")
    print(f"    Com Nome:                        {total_com_nome}")
    print(f"    Com Descrição:                   {total_com_desc}")
    print(f"    Com Nome E Descrição:            {total_com_nome_e_desc}")
    print(f"    Sem Nome:                        {total_sem_nome}")
    print(f"    Sem Descrição:                   {total_sem_desc}")
    print(f"    Sem Nome NEM Descrição:          {total_sem_nada}")

    print("\n" + "=" * 70)
    print("COMPARAÇÃO COM PROCESSAMENTO ANTERIOR")
    print("=" * 70)
    print(f"  {'Métrica':<35} | {'Anterior':<10} | {'Atual':<10} | {'Mudou?'}")
    print(f"  {'-'*35}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}")
    
    mudou_total = total_img != dados_anteriores['total_imagens']
    mudou_map = total_com_xml != dados_anteriores['mapeadas']
    mudou_sem = (total_img - total_com_xml) != dados_anteriores['sem_xml']
    
    print(f"  {'Total Imagens':<35} | {dados_anteriores['total_imagens']:<10} | {total_img:<10} | {'SIM [!]' if mudou_total else 'NAO [OK]'}")
    print(f"  {'Mapeadas (com XML)':<35} | {dados_anteriores['mapeadas']:<10} | {total_com_xml:<10} | {'SIM [!]' if mudou_map else 'NAO [OK]'}")
    print(f"  {'Sem XML':<35} | {dados_anteriores['sem_xml']:<10} | {total_img - total_com_xml:<10} | {'SIM [!]' if mudou_sem else 'NAO [OK]'}")
    
    if not (mudou_total or mudou_map or mudou_sem):
        print(f"\n  [OK] RESULTADO: Nenhuma mudanca. O reprocessamento confirmou os mesmos dados.")
    else:
        print(f"\n  [!] RESULTADO: Houve mudancas entre os processamentos!")

    # Extra: listar exemplos de mapeados sem nome/desc
    print("\n" + "=" * 70)
    print("EXEMPLOS DE DESAFIOS MAPEADOS MAS SEM NOME (primeiros 20)")
    print("=" * 70)
    
    all_df = pd.concat([df_m, df_i, df_f], ignore_index=True)
    sem_nome = all_df[(all_df['nome'].isna()) | (all_df['nome'] == '')]
    
    for i, (_, row) in enumerate(sem_nome.head(20).iterrows()):
        print(f"  {i+1:>3}. {row.get('arquivo_xml', 'N/A'):<45} | tipo: {row['tipo']:<6} | img: {row['imagem']}")

if __name__ == '__main__':
    audit()
