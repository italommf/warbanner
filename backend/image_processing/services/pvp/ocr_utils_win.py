import asyncio
import cv2
import numpy as np
import io
from winsdk.windows.graphics.imaging import BitmapDecoder, SoftwareBitmap
from winsdk.windows.media.ocr import OcrEngine
from winsdk.windows.storage.streams import DataWriter, InMemoryRandomAccessStream

class WindowsOCR:
    _engine = None

    @classmethod
    def get_engine(cls):
        if cls._engine is None:
            cls._engine = OcrEngine.try_create_from_user_profile_languages()
            if not cls._engine:
                from winsdk.windows.globalization import Language
                cls._engine = OcrEngine.try_create_from_language(Language("en-US"))
        return cls._engine

    @classmethod
    async def _ocr_from_numpy(cls, img_np):
        """Envia um numpy array (grayscale ou BGR) para o Windows OCR e retorna o texto."""
        engine = cls.get_engine()
        if not engine or img_np is None:
            return ""

        success, buffer = cv2.imencode(".png", img_np)
        if not success:
            return ""

        stream = InMemoryRandomAccessStream()
        writer = DataWriter(stream.get_output_stream_at(0))
        writer.write_bytes(buffer.tobytes())
        await writer.store_async()

        decoder = await BitmapDecoder.create_async(stream)
        software_bitmap = await decoder.get_software_bitmap_async()

        result = await engine.recognize_async(software_bitmap)
        return "\n".join([line.text for line in result.lines])

    @classmethod
    async def recognize_async(cls, img_np):
        """
        Estratégia Multi-Pass Reclusiva:
        1. Original (Puro - IGUAL PowerToys)
        2. CLAHE (Contraste Adaptativo)
        3. Binarização Invertida (Preto no Branco)
        4. Unsharp Masking (Definição de bordas)
        """
        if img_np is None:
            return ""

        # --- Passo 1: ORIGINAL (Modo PowerToys) ---
        # Ideal para imagens de alta densidade de pixels (1440p/4K)
        text = await cls._ocr_from_numpy(img_np)
        if text.strip():
            return text

        # Pre-conversão para tons de cinza para os próximos passos
        if len(img_np.shape) == 3:
            gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
        else:
            gray = img_np

        # --- Passo 2: CLAHE (Adaptativo) ---
        # Resolve problemas de iluminação e fundos com gradientes
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        res_clahe = clahe.apply(gray)
        text = await cls._ocr_from_numpy(res_clahe)
        if text.strip():
            return text

        # --- Passo 3: Binarização Invertida (Otsu) ---
        # Emula um documento impresso (Padrão ouro para OCR de sistemas legados)
        _, thresh_inv = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        text = await cls._ocr_from_numpy(thresh_inv)
        if text.strip():
            return text

        # --- Passo 4: Unsharp Masking ---
        # Se a fonte estiver levemente borrada, o sharpening ajuda a definir caracteres
        gaussian = cv2.GaussianBlur(img_np, (0, 0), 1.0)
        sharpened = cv2.addWeighted(img_np, 1.5, gaussian, -0.5, 0)
        text = await cls._ocr_from_numpy(sharpened)
        
        return text

def read_text_win(img_np):
    """Função síncrona para uma única imagem."""
    try:
        return asyncio.run(WindowsOCR.recognize_async(img_np))
    except Exception as e:
        print(f"[WIN-OCR] Erro: {e}")
        return ""

async def _process_batch_async(images_list):
    tasks = [WindowsOCR.recognize_async(img) for img in images_list]
    return await asyncio.gather(*tasks)

def read_text_batch_win(images_list):
    """
    Processa uma lista de imagens em paralelo usando um único loop.
    Extremamente mais rápido para ler múltiplos ROIs (como os 8 slots de desafios).
    """
    try:
        return asyncio.run(_process_batch_async(images_list))
    except Exception as e:
        print(f"[WIN-OCR-BATCH] Erro: {e}")
        return [""] * len(images_list)
