# ==============================================================================
# ROI MAP - DPI AWARE (1080p and 4K support)
# ==============================================================================

def get_main_rois(width=1920):
    """
    Retorna o mapa de ROIs principais baseado na resolução da imagem.
    """
    if width > 2500: # 4K Mode
        return {
            "nickname":       {"x": 450,  "y": 416,  "w": 900, "h": 148, "zoom": 1,   "base": 3840},
            "mode":           {"x": 219,  "y": 704,  "w": 63,  "h": 31,  "zoom": 2.0, "base": 3840},
            "kd_geral":       {"x": 190,  "y": 940,  "w": 360, "h": 140, "zoom": 1.0, "base": 3840},
            "win_rate_geral": {"x": 560,  "y": 940,  "w": 440, "h": 140, "zoom": 1.0, "base": 3840},
            "partidas":       {"x": 190,  "y": 1140, "w": 380, "h": 160, "zoom": 1.0, "base": 3840},
            "best_rank":      {"x": 190,  "y": 1400, "w": 800, "h": 240, "zoom": 1.0, "base": 3840},
            "total_hours":    {"x": 1300, "y": 1030, "w": 360, "h": 120, "zoom": 1.0, "base": 3840},
        }
    
    # Default 1080p Mode
    return {
        "nickname":       {"x": 225, "y": 208, "w": 450, "h": 74, "zoom": 1,   "base": 1920},
        "mode":           {"x": 80,  "y": 320, "w": 280, "h": 80, "zoom": 4.0, "base": 1920},
        "kd_geral":       {"x": 95,  "y": 470, "w": 180, "h": 70, "zoom": 1.5, "base": 1920},
        "win_rate_geral": {"x": 280, "y": 470, "w": 220, "h": 70, "zoom": 1.5, "base": 1920},
        "partidas":       {"x": 95,  "y": 570, "w": 190, "h": 80, "zoom": 1.5, "base": 1920},
        "best_rank":      {"x": 95,  "y": 700, "w": 400, "h": 120, "zoom": 2.0, "base": 1920},
        "total_hours":    {"x": 650, "y": 515, "w": 180, "h": 60, "zoom": 1.5, "base": 1920},
    }

# Horas Totais
ROI_TOTAL_HOURS = {"x": 650, "y": 515, "w": 180, "h": 60, "zoom": 1.5, "base": 1920}

# Marcadores de Layout para Validação de Modo
ROI_PVP_MARKER = {"x": 95, "y": 630, "w": 300, "h": 50, "zoom": 1.0, "base": 1920} # "Melhor classificação"
ROI_PVE_MARKER = {"x": 95, "y": 700, "w": 300, "h": 50, "zoom": 1.0, "base": 1920} # "Missões"

# Fallback para compatibilidade com código antigo (vai ser atualizado nos extractors)
MAIN_ROIS = get_main_rois(1920)

def get_pve_rois(width=1920):
    if width > 2500:
        return {
            "easy":   {"x": 200, "y": 1500, "w": 180, "h": 70, "zoom": 1.5, "base": 3840},
            "medium": {"x": 400, "y": 1500, "w": 180, "h": 70, "zoom": 1.5, "base": 3840},
            "hard":   {"x": 590, "y": 1500, "w": 180, "h": 70, "zoom": 1.5, "base": 3840},
        }
    return {
        "easy":   {"x": 100, "y": 750, "w": 90, "h": 35, "zoom": 3, "base": 1920},
        "medium": {"x": 200, "y": 750, "w": 90, "h": 35, "zoom": 3, "base": 1920},
        "hard":   {"x": 295, "y": 750, "w": 90, "h": 35, "zoom": 3, "base": 1920},
    }

PVE_ROIS = get_pve_rois(1920)

def get_class_rois(width=1920):
    # Por simplicidade, as classes usam a mesma lógica DPI-aware automática do crop_roi
    # Se precisar de ajuste fino 4K, podemos expandir aqui.
    scale = 2.0 if width > 2500 else 1.0
    base = 3840 if width > 2500 else 1920
    
    rois = []
    classes = [
        {"name": "Fuzileiro", "color": "#4a90e2", "y": 788},
        {"name": "Médico", "color": "#50e3c2", "y": 828},
        {"name": "Engenheiro", "color": "#f5a623", "y": 867},
        {"name": "Franco-atirador", "color": "#d0021b", "y": 917}
    ]
    
    for c in classes:
        rois.append({
            "name": c["name"],
            "color": c["color"],
            "rois": {
                "kd":   {"x": 687, "y": c["y"], "w": 55, "h": 20, "zoom": 2, "base": 1920},
                "wr":   {"x": 765, "y": c["y"], "w": 65, "h": 20, "zoom": 2, "base": 1920}, 
                "time": {"x": 853, "y": c["y"], "w": 65, "h": 20, "zoom": 2, "base": 1920}
            }
        })
    return rois

CLASS_ROIS = get_class_rois(1920)

def get_challenge_slots(width=1920):
    """
    Retorna os 8 slots de conquistas. 
    Usamos a base 1920 para todos, e o crop_roi escala para 4K automaticamente.
    """
    return [
        {"x": 98,  "y": 251,   "w": 525, "h": 158, "zoom": 1, "base": 1920}, 
        {"x": 98,  "y": 429,   "w": 525, "h": 158, "zoom": 1, "base": 1920}, 
        {"x": 98,  "y": 609,   "w": 525, "h": 158, "zoom": 1, "base": 1920}, 
        {"x": 98,  "y": 788,   "w": 525, "h": 158, "zoom": 1, "base": 1920}, 
        {"x": 644, "y": 251,   "w": 525, "h": 158, "zoom": 1, "base": 1920}, 
        {"x": 644, "y": 429,   "w": 525, "h": 158, "zoom": 1, "base": 1920}, 
        {"x": 644, "y": 609,   "w": 525, "h": 158, "zoom": 1, "base": 1920},
        {"x": 644, "y": 788,   "w": 525, "h": 158, "zoom": 1, "base": 1920}, 
    ]

CHALLENGE_SLOTS = get_challenge_slots(1920)

ROI_MODE = {"x": 80,  "y": 320, "w": 280, "h": 80, "zoom": 4.0, "base": 1920}
