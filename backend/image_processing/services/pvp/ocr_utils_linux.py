import pytesseract
import cv2
import numpy as np

def read_text_linux(img_np):
    """
    Motor de OCR para Linux usando Tesseract.
    """
    if img_np is None:
        return ""
    
    try:
        # Tesseract funciona melhor com imagens em escala de cinza ou binarizadas
        if len(img_np.shape) == 3:
            gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
        else:
            gray = img_np
            
        # Opções do Tesseract: --psm 6 (Assume a single uniform block of text)
        # --oem 3 (Default engine)
        custom_config = r'--oem 3 --psm 6'
        
        text = pytesseract.image_to_string(gray, lang='por+eng', config=custom_config)
        return text.strip()
    except Exception as e:
        print(f"[LINUX-OCR] Erro: {e}")
        return ""

def read_text_batch_linux(images_list):
    """
    Processa um lote de imagens. No Tesseract (síncrono), fazemos um por um.
    """
    return [read_text_linux(img) for img in images_list]
