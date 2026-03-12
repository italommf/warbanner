import os
import platform

# Forçamos o uso do Tesseract (Linux OCR) como motor padrão em todos os ambientes
# para garantir que os resultados locais sejam idênticos aos da VPS.
from .ocr_utils_linux import read_text_linux as read_text, read_text_batch_linux as read_text_batch

# Mantemos os nomes 'win' para compatibilidade com o restante do código que já os importa,
# mas agora eles apontam para o motor Tesseract.
def read_text_win(img): 
    return read_text(img)

class WindowsOCR:
    @staticmethod
    async def recognize_async(img): 
        return read_text(img)
