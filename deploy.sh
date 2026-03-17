#!/bin/bash

# Cores para o output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Iniciando deploy automatizado do Warface Desafios em warbanner.com.br...${NC}"

# 1. Verificar e instalar Docker se necessário
if ! [ -x "$(command -v docker)" ]; then
    echo -e "${YELLOW}Docker não encontrado. Instalando no Ubuntu...${NC}"
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
fi

# 2. Verificar e instalar Docker Compose plugin se necessário
if ! docker compose version > /dev/null 2>&1; then
    echo -e "${YELLOW}Docker Compose plugin não encontrado. Instalando...${NC}"
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

# 3. Sincronizar código
echo -e "${BLUE}Sincronizando com o Git...${NC}"
git fetch origin main
git reset --hard origin/main

# 4. Iniciar containers
echo -e "${BLUE}Construindo e subindo os containers (Backend, Frontend, Postgres, Redis)...${NC}"
docker compose up -d --build

# 5. Healthcheck do Banco de Dados
echo -e "${BLUE}Aguardando o PostgreSQL estabilizar (15s)...${NC}"
sleep 15

# 6. Migrations e Configuração Inicial do Django
echo -e "${BLUE}Executando Migrations no Banco de Dados (Postgres)...${NC}"
docker compose exec -T backend python manage.py migrate --noinput

echo -e "${BLUE}Configurando usuário administrador inicial...${NC}"
docker compose exec -T backend python manage.py setup_admin

# 7. Geração de Dados Estáticos
echo -e "${BLUE}Gerando mapeamento de desafios...${NC}"
docker compose exec -T backend python scripts/gerar_json_desafios.py 2>/dev/null || echo -e "${YELLOW}Aviso: Falha ao gerar JSON ou script não encontrado.${NC}"

# 8. Limpeza de imagens órfãs
echo -e "${BLUE}Limpando imagens antigas para liberar espaço...${NC}"
docker image prune -f

echo -e "${BLUE}=== STATUS DOS SERVIÇOS ===${NC}"
docker compose ps

echo -e "${GREEN}Deploy finalizado com sucesso!${NC}"
echo -e "${GREEN}Frontend: http://warbanner.com.br (Porta 8081 mapeada)${NC}"
echo -e "${GREEN}PostgreSQL está rodando internamente no Docker.${NC}"

echo -e "\n${BLUE}Nota sobre PNGINX Proxy Manager:${NC}"
echo -e "No NPM, aponte o domínio warbanner.com.br para o IP da sua VPS na porta 8081."
