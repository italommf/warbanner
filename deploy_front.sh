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

# 2. Build e Up APENAS do frontend
# Removido o 'docker system prune -a' para não apagar o cache de build do Node
echo -e "${BLUE}Reconstruindo e reiniciando APENAS o container do frontend...${NC}"
docker compose up -d --build frontend

# 3. Limpeza de imagens órfãs (apenas as que ficaram sem tag após o novo build)
echo -e "${BLUE}Limpando imagens antigas sem tag (dangling)...${NC}"
docker image prune -f

echo -e "${GREEN}Frontend atualizado com sucesso!${NC}"
docker compose ps frontend
