# Player Identification
ROI_NICKNAME = {"x": 225, "y": 208, "w": 450, "h": 74, "zoom": 1}
ROI_MODE     = {"x": 80,  "y": 320, "w": 280, "h": 80, "zoom": 4.0}

# Estatísticas Principais
ROI_KD_GERAL  = {"x": 95,  "y": 470, "w": 180, "h": 70,  "zoom": 1.5}
ROI_WIN_RATE =  {"x": 280, "y": 470, "w": 220, "h": 70,  "zoom": 1.5}
ROI_MATCHES  =  {"x": 95,  "y": 570, "w": 190, "h": 80,  "zoom": 1.5}
ROI_BEST_RANK = {"x": 95,  "y": 700, "w": 400, "h": 120, "zoom": 2} # Área mais ampla

# Horas Totais
ROI_TOTAL_HOURS = {"x": 650, "y": 515, "w": 180, "h": 60, "zoom": 1.5}

# Estatísticas por Classe
CLASS_ROIS = [
    {
        "name": "Fuzileiro",
        "color": "#4a90e2",
        "rois": {
            "kd":   {"x": 685, "y": 775, "w": 70, "h": 40, "zoom": 2},
            "wr":   {"x": 760, "y": 775, "w": 70, "h": 40, "zoom": 2},
            "time": {"x": 835, "y": 775, "w": 90, "h": 40, "zoom": 2}
        }
    },
    {
        "name": "Médico",
        "color": "#50e3c2",
        "rois": {
            "kd":   {"x": 685, "y": 820, "w": 70,  "h": 40, "zoom": 2},
            "wr":   {"x": 760, "y": 820, "w": 70,  "h": 40, "zoom": 2},
            "time": {"x": 835, "y": 820, "w": 90,  "h": 40, "zoom": 2}
        }
    },
    {
        "name": "Engenheiro",
        "color": "#f5a623",
        "rois": {
            "kd":   {"x": 685, "y": 865, "w": 70, "h": 40, "zoom": 2},
            "wr":   {"x": 760, "y": 865, "w": 70, "h": 40, "zoom": 2},
            "time": {"x": 835, "y": 865, "w": 90, "h": 40, "zoom": 2}
        }
    },
    {
        "name": "Franco-atirador",
        "color": "#d0021b",
        "rois": {
            "kd":   {"x": 685, "y": 915, "w": 70, "h": 40, "zoom": 2},
            "wr":   {"x": 760, "y": 915, "w": 70, "h": 40, "zoom": 2},
            "time": {"x": 835, "y": 915, "w": 90, "h": 40, "zoom": 2}
        }
    }
]

# Mapa para o Extrator Principal facilitar o loop
MAIN_ROIS = {
    "nickname": ROI_NICKNAME,
    "mode": ROI_MODE,
    "kd_geral": ROI_KD_GERAL,
    "win_rate_geral": ROI_WIN_RATE,
    "partidas": ROI_MATCHES,
    "best_rank": ROI_BEST_RANK,
    "total_hours": ROI_TOTAL_HOURS
}

# PvE Specific (Missões Concluídas - Caveiras)
ROI_PVE_EASY   = {"x": 100, "y": 745, "w": 95, "h": 55, "zoom": 1.5}
ROI_PVE_MEDIUM = {"x": 200, "y": 745, "w": 95, "h": 55, "zoom": 1.5}
ROI_PVE_HARD   = {"x": 300, "y": 745, "w": 95, "h": 55, "zoom": 1.5}

PVE_ROIS = {
    "easy": ROI_PVE_EASY,
    "medium": ROI_PVE_MEDIUM,
    "hard": ROI_PVE_HARD
}
