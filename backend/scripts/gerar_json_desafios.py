import os
import json
import sys
from pathlib import Path

# Adiciona o diretório do backend ao sys.path para poder importar o processador
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR / 'processamento_nomes_desc_desafios'))

try:
    from processador_detalhado import obter_dataframes_completos
except ImportError:
    print("Erro: Não foi possível importar obter_dataframes_completos")
    sys.exit(1)

def gerar_json():
    print("Iniciando geração do mapeamento de desafios...")
    try:
        df_m, df_i, df_f = obter_dataframes_completos()
        
        def process_df(df):
            # Normaliza para lowercase
            df = df.copy()
            df['imagem'] = df['imagem'].str.lower()
            # Converte para dict com a chave sendo o nome da imagem (sem extensão)
            return df.drop_duplicates('imagem').set_index('imagem').to_dict('index')
        
        mapping = {
            'marcas': process_df(df_m),
            'insignias': process_df(df_i),
            'fitas': process_df(df_f)
        }
        
        # Caminho de saída: media/desafios_master.json
        output_dir = BASE_DIR / 'imagens'
        output_dir.mkdir(exist_ok=True)
        output_path = output_dir / 'desafios_master.json'
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(mapping, f, ensure_ascii=False, indent=2)
            
        print(f"Sucesso! Mapeamento gerado em: {output_path}")
        print(f"Total: {len(mapping['marcas'])} marcas, {len(mapping['insignias'])} insígnias, {len(mapping['fitas'])} fitas.")

    except Exception as e:
        print(f"Erro ao gerar JSON: {e}")
        sys.exit(1)

if __name__ == "__main__":
    gerar_json()
