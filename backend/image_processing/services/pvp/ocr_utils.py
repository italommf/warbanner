import os
import platform

# Se estiver no Linux/Docker, usa Tesseract
if platform.system() == "Linux":
    from .ocr_utils_linux import read_text_linux as read_text, read_text_batch_linux as read_text_batch
    # Dummy handlers para manter compatibilidade com importações diretas de nomes do Windows
    def read_text_win(img): return read_text(img)
    class WindowsOCR:
        @staticmethod
        async def recognize_async(img): return read_text(img)
else:
    # Se estiver no Windows, usa o motor nativo (se as dependências estiverem presentes)
    try:
        from .ocr_utils_win import read_text_win as read_text, read_text_batch_win as read_text_batch
        from .ocr_utils_win import read_text_win, WindowsOCR
    except (ImportError, ModuleNotFoundError):
        # Fallback se não tiver winsdk (mesmo no windows)
        from .ocr_utils_linux import read_text_linux as read_text, read_text_batch_linux as read_text_batch
        def read_text_win(img): return read_text(img)
        class WindowsOCR:
            @staticmethod
            async def recognize_async(img): return read_text(img)
