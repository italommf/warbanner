# ── Base (Comum a todos) ───────────────────────────────────────────────────
FROM python:3.10-slim AS base

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Instalar dependências de sistema mínimas (Postgres driver)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primeiro para cache
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copiar o código (Com o .dockerignore, as pastas pesadas são ignoradas)
COPY . .

# Criar pastas básicas
RUN mkdir -p imagens/marcas imagens/insignias imagens/fitas staticflakes

# ── Backend & Beat (Leves) ─────────────────────────────────────────────────
FROM base AS api_server
EXPOSE 8000
CMD ["gunicorn", "warface.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120"]

# ── Worker & Image Processing (Pesado: ML / OCR) ───────────────────────────
FROM base AS worker_ml

# Instalar dependências para OpenCV, Tesseract e Torch
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-por \
    && rm -rf /var/lib/apt/lists/*

# Instalar Torch (Apenas CPU) e componentes pesados
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir basicsr==1.4.2 realesrgan

# Bugfix basicsr
RUN sed -i 's/from torchvision.transforms.functional_tensor import rgb_to_grayscale/from torchvision.transforms.functional import rgb_to_grayscale/g' /usr/local/lib/python3.10/site-packages/basicsr/data/degradations.py

CMD ["celery", "-A", "warface", "worker", "--loglevel=info", "-P", "solo"]

