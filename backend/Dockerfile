# Usar uma imagem Python leve
FROM python:3.10-slim

# Evitar que o Python gere arquivos .pyc e permitir log em tempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Instalar dependências do sistema para OpenCV, Torch e Postgres
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar requirements primeiro para aproveitar o cache do Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Corrigir bug de compatibilidade do basicsr com versões novas do torchvision
RUN sed -i 's/from torchvision.transforms.functional_tensor import rgb_to_grayscale/from torchvision.transforms.functional import rgb_to_grayscale/g' /usr/local/lib/python3.10/site-packages/basicsr/data/degradations.py


# Copiar o restante do código
COPY . .

# Criar pastas necessárias para persistência
RUN mkdir -p imagens/marcas imagens/insignias imagens/fitas staticflakes

# Expor a porta que o Gunicorn vai rodar
EXPOSE 8000

# Script de entrada para migrar e iniciar
CMD ["sh", "-c", "python manage.py migrate && python manage.py collectstatic --no-input && python manage.py setup_admin && gunicorn warface.wsgi:application --bind 0.0.0.0:8000 --workers 3"]
