import pandas as pd
import os

def carregar_desafios(file_path):
    """
    Lê o arquivo de desafios do Warface e retorna três DataFrames:
    marcas, insignias e fitas.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")

    sections = {
        'INSIGNIAS': '## INSIGNIAS (Badge)',
        'FITAS': '## FITAS (Stripe)',
        'MARCAS': '## MARCAS (Mark)'
    }
    
    data = {
        'INSIGNIAS': [],
        'FITAS': [],
        'MARCAS': []
    }
    
    current_section = None
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            
            # Detectar mudança de seção
            if '## INSIGNIAS (Badge)' in line:
                current_section = 'INSIGNIAS'
                continue
            elif '## FITAS (Stripe)' in line:
                current_section = 'FITAS'
                continue
            elif '## MARCAS (Mark)' in line:
                current_section = 'MARCAS'
                continue
            
            # Pular linhas vazias, divisores ou cabeçalhos
            if not current_section:
                continue
            if not line.startswith('|') or line.startswith('|---') or '| ID |' in line:
                continue
            
            # Processar linha da tabela
            # Exemplo: | 100 | Vinte-e-um | 5000 | shg02kill.xml |
            parts = [p.strip() for p in line.split('|')]
            # parts será ['', '100', 'Vinte-e-um', '5000', 'shg02kill.xml', '']
            if len(parts) >= 5:
                row = parts[1:5] # Pega do índice 1 ao 4
                data[current_section].append(row)
                
    columns = ['ID', 'Nome (PT)', 'Amount', 'Arquivo']
    
    df_insignias = pd.DataFrame(data['INSIGNIAS'], columns=columns)
    df_fitas = pd.DataFrame(data['FITAS'], columns=columns)
    df_marcas = pd.DataFrame(data['MARCAS'], columns=columns)
    
    return df_marcas, df_insignias, df_fitas

if __name__ == "__main__":
    # Caminho absoluto baseado na estrutura do projeto
    base_path = os.path.dirname(__file__)
    file_path = os.path.join(base_path, "nome desafio - quantidade - xml.txt")
    
    try:
        df_marcas, df_insignias, df_fitas = carregar_desafios(file_path)
        
        print(f"Marcas carregadas: {len(df_marcas)}")
        print(f"Insígnias carregadas: {len(df_insignias)}")
        print(f"Fitas carregadas: {len(df_fitas)}")
        
        print("\nExemplo Marcas:")
        print(df_marcas.head())
        
    except Exception as e:
        print(f"Erro ao processar arquivo: {e}")
