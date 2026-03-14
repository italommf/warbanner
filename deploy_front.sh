#!/bin/bash

# Cores para o output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Iniciando deploy rápido APENAS do FRONTEND...${NC}"

# 1. Baixar modificações do Git
echo -e "${BLUE}Sincronizando com o Git (Reset para origin/main)...${NC}"
git fetch origin main
git reset --hard origin/main

# 2. Reconstruir APENAS a imagem do frontend
echo -e "${BLUE}Reconstruindo imagem do frontend...${NC}"
docker compose build frontend

# 3. Reiniciar o container usando a nova imagem, ignorando dependências
echo -e "${BLUE}Reiniciando o container do frontend...${NC}"
docker compose up -d --no-deps frontend

# 3. Limpeza de imagens órfãs (apenas as que ficaram sem tag após o novo build)
echo -e "${BLUE}Limpando imagens antigas sem tag (dangling)...${NC}"
docker image prune -f

echo -e "${GREEN}Frontend atualizado com sucesso!${NC}"
docker compose ps frontend
