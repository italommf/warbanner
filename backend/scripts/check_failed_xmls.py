import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

# Adiciona o caminho para importar o processador
BASE_DIR = Path("d:/Git/Projetos Pessoais/Warface Desafios/backend")
ACHIEVEMENTS_DIR = BASE_DIR / "processamento_nomes_desc_desafios" / "achievements"

def find_failed_xmls():
    sys.path.append(str(BASE_DIR / 'processamento_nomes_desc_desafios'))
    try:
        from processador_detalhado import obter_dataframes_completos
    except ImportError:
        print("Erro ao importar processador")
        return

    df_m, df_i, df_f = obter_dataframes_completos()
    processed_xmls = set()
    for df in [df_m, df_i, df_f]:
        # Supondo que 'arquivo_xml' foi adicionado ao DF no passo anterior
        if 'arquivo_xml' in df.columns:
            processed_xmls.update(df['arquivo_xml'].str.lower().tolist())

    all_xmls = [f for f in os.listdir(ACHIEVEMENTS_DIR) if f.lower().endswith('.xml')]
    
    failed_no_banner = []
    failed_parse_error = []
    failed_other = []

    for xml_file in all_xmls:
        if xml_file.lower() in processed_xmls:
            continue
            
        xml_path = ACHIEVEMENTS_DIR / xml_file
        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()
            banner = root.find('BannerImage')
            if banner is None:
                failed_no_banner.append(xml_file)
            else:
                failed_other.append(xml_file)
        except Exception as e:
            failed_parse_error.append(f"{xml_file} (Erro: {str(e)})")

    print("-" * 50)
    print(f"RELATÓRIO DE XMLS QUE NÃO FORAM PARA O SITE ({len(all_xmls) - len(processed_xmls)} itens)")
    print("-" * 50)
    
    print(f"\n1. XMLs sem a tag <BannerImage> ({len(failed_no_banner)}):")
    print("   (Estes não são desafios de banner, por isso foram ignorados)")
    for f in failed_no_banner[:15]:
        print(f"   - {f}")
    if len(failed_no_banner) > 15:
        print(f"   ... e mais {len(failed_no_banner) - 15}")

    print(f"\n2. XMLs com erro de leitura (Corrompidos) ({len(failed_parse_error)}):")
    for f in failed_parse_error:
        print(f"   - {f}")

    print(f"\n3. Outros motivos (Tag banner presente mas tipo desconhecido) ({len(failed_other)}):")
    for f in failed_other:
        print(f"   - {f}")

if __name__ == "__main__":
    find_failed_xmls()
