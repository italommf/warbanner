#!/bin/bash

# Cores para o output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Iniciando deploy do Warface Desafios em warbanner.italommf.com.br...${NC}"

# 1. Verificar e instalar Docker se necessário
if ! [ -x "$(command -v docker)" ]; then
    echo -e "${BLUE}Docker não encontrado. Instalando...${NC}"
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/local/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
fi

# 2. Verificar e instalar Docker Compose se necessário
if ! docker compose version > /dev/null 2>&1; then
    echo -e "${BLUE}Docker Compose não encontrado. Instalando plugin...${NC}"
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

# 3. Baixar modificações do Git
echo -e "${BLUE}Puxando atualizações do Git...${NC}"
git pull origin main

# 4. Criar rede persistente se necessário (opcional no compose v2)
# 5. Limpeza preventiva de espaço
echo -e "${BLUE}Limpando cache e imagens antigas para garantir espaço...${NC}"
docker system prune -a -f

# 6. Build e Up
echo -e "${BLUE}Construindo e iniciando containers com Docker Compose...${NC}"
docker compose up -d --build

# 6. Limpeza de imagens antigas
echo -e "${BLUE}Limpando imagens antigas (prune)...${NC}"
docker image prune -f

echo -e "${BLUE}Aguardando os containers estabilizarem (10s)...${NC}"
sleep 10

echo -e "${BLUE}=== STATUS DOS SERVIÇOS ===${NC}"
docker compose ps

echo -e "${GREEN}Deploy finalizado!${NC}"
echo -e "${GREEN}O serviço está rodando localmente na porta 8081.${NC}"
echo -e "\n${BLUE}Para configurar o HTTPS no Nginx da sua VPS, use este modelo:${NC}"
echo "------------------------------------------------------------"
echo "server {"
echo "    listen 80;"
echo "    server_name warbanner.italommf.com.br;"
echo "    location / {"
echo "        proxy_pass http://127.0.0.1:8081;"
echo "        proxy_set_header Host \$host;"
echo "        proxy_set_header X-Real-IP \$remote_addr;"
echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "        proxy_set_header X-Forwarded-Proto \$scheme;"
echo "    }"
echo "}"
echo "------------------------------------------------------------"
echo -e "${BLUE}Após criar o arquivo, rode: sudo certbot --nginx -d warbanner.italommf.com.br${NC}"
echo -e "${GREEN}Verifique os logs com: docker compose logs -f${NC}"

