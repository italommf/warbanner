import pandas as pd
import os
import xml.etree.ElementTree as ET
from leitor_desafios import carregar_desafios

def carregar_traducoes(file_path):
    """
    Lê o arquivo text_achievements.xml e cria um dicionário de mapeamento.
    key -> {original, translation}
    """
    if not os.path.exists(file_path):
        print(f"Aviso: Arquivo de traduções não encontrado: {file_path}")
        return {}
    
    traducoes = {}
    try:
        tree = ET.parse(file_path)
        root = tree.getroot()
        for entry in root.findall('entry'):
            key = entry.get('key')
            if key:
                original = ""
                translation = ""
                orig_elem = entry.find('original')
                trans_elem = entry.find('translation')
                
                if orig_elem is not None:
                    original = orig_elem.get('value', "")
                if trans_elem is not None:
                    translation = trans_elem.get('value', "")
                
                traducoes[key] = {
                    'original': original,
                    'translation': translation
                }
    except Exception as e:
        print(f"Erro ao carregar traduções: {e}")
    
    return traducoes

def processar_arquivos_xml(df, tipo, base_path, traducoes):
    """
    Para cada linha do dataframe, abre o XML correspondente e extrai as informações.
    """
    novos_dados = []
    
    for _, row in df.iterrows():
        arquivo_nome = row['Arquivo']
        quantidade = row['Amount']
        
        xml_path = os.path.join(base_path, 'achievements', arquivo_nome)
        
        imagem = ""
        nome_traduzido = ""
        desc_traduzida = ""
        
        if os.path.exists(xml_path):
            try:
                tree = ET.parse(xml_path)
                root = tree.getroot()
                
                # Pegar UI name e desc
                ui_elem = root.find('UI')
                if ui_elem is not None:
                    name_key = ui_elem.get('name', "").replace('@', '')
                    desc_key = ui_elem.get('desc', "").replace('@', '')
                    
                    # Nome (extraído usando a chave de 'name' sem o @)
                    if name_key in traducoes:
                        nome_traduzido = traducoes[name_key]['translation'] or traducoes[name_key]['original']
                    
                    # Descrição (extraída usando a chave de 'desc' sem o @)
                    if desc_key in traducoes:
                        desc_traduzida = traducoes[desc_key]['translation'] or traducoes[desc_key]['original']
                
                # Pegar BannerImage
                banner_elem = root.find('BannerImage')
                if banner_elem is not None:
                    imagem = banner_elem.get('image', "")
                
            except Exception as e:
                # Opcional: print(f"Erro ao processar {arquivo_nome}: {e}")
                pass
        
        novos_dados.append({
            'imagem': imagem,
            'tipo': tipo,
            'nome': nome_traduzido,
            'descrição': desc_traduzida,
            'quantidade': quantidade
        })
        
    return pd.DataFrame(novos_dados)

def obter_dataframes_completos():
    base_path = r"d:\Git\Projetos Pessoais\Warface Desafios\backend\processamento_nomes_desc_desafios"
    txt_file = os.path.join(base_path, "nome desafio - quantidade - xml.txt")
    trans_file = os.path.join(base_path, "text_achievements.xml")
    achievements_dir = os.path.join(base_path, "achievements")
    
    # 1. Carregar o que temos no TXT (funciona como base de quantidades e lista conhecida)
    try:
        df_m_txt, df_i_txt, df_f_txt = carregar_desafios(txt_file)
        # Criar um mapeamento de Arquivo -> Quantidade/Nome do TXT
        txt_info = {}
        for df in [df_m_txt, df_i_txt, df_f_txt]:
            for _, row in df.iterrows():
                txt_info[row['Arquivo'].lower()] = {
                    'amount': row['Amount'],
                    'nome_txt': row['Nome (PT)']
                }
    except Exception as e:
        print(f"Erro ao carregar TXT: {e}")
        txt_info = {}

    # 2. Carregar Traduções
    traducoes = carregar_traducoes(trans_file)
    
    # 3. Escanear TODOS os arquivos XML na pasta achievements
    # Isso permite descobrir desafios que não estão no TXT
    novos_dados = []
    if os.path.exists(achievements_dir):
        for xml_file in os.listdir(achievements_dir):
            if not xml_file.lower().endswith('.xml'):
                continue
                
            xml_path = os.path.join(achievements_dir, xml_file)
            
            try:
                tree = ET.parse(xml_path)
                root = tree.getroot()
                
                # Dados do XML
                amount_xml = root.get('amount', "")
                
                # Pegar UI name e desc
                ui_elem = root.find('UI')
                nome_traduzido = ""
                desc_traduzida = ""
                
                if ui_elem is not None:
                    name_key = ui_elem.get('name', "").replace('@', '')
                    desc_key = ui_elem.get('desc', "").replace('@', '')
                    
                    if name_key in traducoes:
                        nome_traduzido = traducoes[name_key]['translation'] or traducoes[name_key]['original']
                    if desc_key in traducoes:
                        desc_traduzida = traducoes[desc_key]['translation'] or traducoes[desc_key]['original']
                
                # Pegar BannerImage
                banner_elem = root.find('BannerImage')
                if banner_elem is not None:
                    imagem = banner_elem.get('image', "")
                    tipo = banner_elem.get('type', "") # stripe, badge, mark
                    
                    # Priorizar quantidade do TXT se existir, senão usa do XML
                    info_txt = txt_info.get(xml_file.lower(), {})
                    quantidade = info_txt.get('amount') or amount_xml
                    
                    # Se não temos nome traduzido mas temos nome no TXT
                    if not nome_traduzido and info_txt.get('nome_txt'):
                        nome_traduzido = info_txt.get('nome_txt')

                    if imagem:
                        novos_dados.append({
                            'imagem': imagem,
                            'tipo': tipo,
                            'nome': nome_traduzido,
                            'descrição': desc_traduzida,
                            'quantidade': quantidade,
                            'arquivo_xml': xml_file
                        })
            except Exception:
                continue

    full_df = pd.DataFrame(novos_dados)
    
    # Separar nos mesmos 3 dataframes de antes
    df_marcas_final = full_df[full_df['tipo'] == 'mark'].copy()
    df_insignias_final = full_df[full_df['tipo'] == 'badge'].copy()
    df_fitas_final = full_df[full_df['tipo'] == 'stripe'].copy()
    
    return df_marcas_final, df_insignias_final, df_fitas_final


if __name__ == "__main__":
    df_marcas, df_insignias, df_fitas = obter_dataframes_completos()
    print(f"Processamento concluído.")
    print(f"Marcas: {len(df_marcas)} | Insígnias: {len(df_insignias)} | Fitas: {len(df_fitas)}")
    
