from .ocr_utils_win import read_text_win

def read_text(img, config=None):
    """
    Proxy para manter compatibilidade com códigos antigos, 
    mas usando o novo motor Windows OCR.
    """
    return read_text_win(img)
