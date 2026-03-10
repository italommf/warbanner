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
        Estratégia dual-pass:
        1. Tenta OCR na imagem original (funciona para JvJ e maioria dos textos).
        2. Se vazio, tenta com binarização invertida (resolve JxA e textos de baixo contraste).
        """
        if img_np is None:
            return ""

        # Pass 1: Imagem original (sem processamento)
        text = await cls._ocr_from_numpy(img_np)
        if text.strip():
            return text

        # Pass 2: Binarização Otsu + Inversão (texto preto no fundo branco)
        if len(img_np.shape) == 3:
            gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
        else:
            gray = img_np
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        text = await cls._ocr_from_numpy(thresh)
        return text

def read_text_win(img_np):
    """
    Função síncrona helper para ser usada no pipeline existente.
    """
    try:
        return asyncio.run(WindowsOCR.recognize_async(img_np))
    except Exception as e:
        print(f"[WIN-OCR] Erro: {e}")
        return ""
