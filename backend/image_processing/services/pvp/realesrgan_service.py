import cv2
import torch
import os
import logging
import numpy as np
import urllib.request
from realesrgan import RealESRGANer
from basicsr.archs.rrdbnet_arch import RRDBNet

logger = logging.getLogger(__name__)

class RealESRGANUpscaler:
    _instance = None

    def __init__(self):
        """
        Configura o modelo Real-ESRGAN para rodar em CPU.
        """
        # Caminho absoluto para a pasta de pesos no backend
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        model_path = os.path.join(base_dir, "weights", "RealESRGAN_x4plus.pth")
        
        self.upsampler = None
        
        if not os.path.exists(model_path):
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"
            try:
                logger.info(f"[RE-ESRGAN] Baixando pesos da IA (64MB)... Por favor, aguarde.")
                urllib.request.urlretrieve(url, model_path)
                logger.info(f"[RE-ESRGAN] Download concluído com sucesso.")
            except Exception as e:
                logger.error(f"[RE-ESRGAN] Falha ao baixar pesos automaticamente: {e}. Usando fallback matemático.")
                return

        try:
            # Define o modelo Real-ESRGAN_x4plus (Geral)
            model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
            
            self.upsampler = RealESRGANer(
                scale=4,
                model_path=model_path,
                model=model,
                tile=400,          # Divide a imagem em blocos para não estourar a RAM
                tile_pad=10,
                pre_pad=0,
                half=False,        # CPU não suporta half precision (float16)
                device=torch.device('cpu')
            )
            logger.info("[RE-ESRGAN] Modelo carregado com sucesso (Modo CPU).")
        except Exception as e:
            logger.error(f"[RE-ESRGAN] Falha ao carregar modelo de IA: {e}. Usando fallback matemático.")
            self.upsampler = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = RealESRGANUpscaler()
        return cls._instance

    def upscale(self, img_np, out_scale=2):
        """
        Faz o upscale da imagem usando IA ou Fallback Matemático.
        """
        # Se a IA não carregou, usa Lanczos4 (melhor alternativa matemática)
        if self.upsampler is None:
            h, w = img_np.shape[:2]
            target_w = int(w * out_scale)
            target_h = int(h * out_scale)
            return cv2.resize(img_np, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

        try:
            output, _ = self.upsampler.enhance(img_np, outscale=out_scale)
            return output
        except Exception as e:
            logger.error(f"[RE-ESRGAN] Erro no upscale de IA: {e}. Usando fallback matemático.")
            h, w = img_np.shape[:2]
            target_w = int(w * out_scale)
            target_h = int(h * out_scale)
            return cv2.resize(img_np, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

def upscale_image_ai(img_np, target_width=3840):
    """
    Função facilitadora para o pipeline.
    Calcula o scale necessário baseado no target_width.
    """
    h, w = img_np.shape[:2]
    out_scale = target_width / w
    
    # Se a escala for próxima de 1 (já é 4K), não fazemos nada
    if out_scale <= 1.05:
        return img_np
        
    upscaler = RealESRGANUpscaler.get_instance()
    return upscaler.upscale(img_np, out_scale=out_scale)
