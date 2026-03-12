#!/bin/bash

# Cores para o output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Iniciando instalação do Nginx Proxy Manager...${NC}"

# 1. Criar diretório para o NPM
mkdir -p ~/nginx-proxy-manager
cd ~/nginx-proxy-manager

# 2. Criar o arquivo docker-compose.yml para o NPM
cat <<EOF > docker-compose.yml
version: '3.8'
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: unless-stopped
    ports:
      - '80:80'
      - '81:81'
      - '443:443'
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
EOF

# 3. Parar Nginx nativo se ele estiver rodando (para liberar as portas 80/443)
echo -e "${BLUE}Verificando se existe um Nginx nativo rodando...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${BLUE}Parando e desativando o Nginx nativo para usar o Docker...${NC}"
    sudo systemctl stop nginx
    sudo systemctl disable nginx
fi

# 4. Subir o container
echo -e "${BLUE}Subindo o container do Nginx Proxy Manager...${NC}"
docker compose up -d

echo -e "\n${GREEN}Instalação finalizada com sucesso!${NC}"
echo -e "${BLUE}Acesse o painel de controle em:${NC} http://$(curl -s ifconfig.me):81"
echo -e "${BLUE}Dados de acesso padrão:${NC}"
echo -e "Email:    ${GREEN}admin@example.com${NC}"
echo -e "Password: ${GREEN}changeme${NC}"
echo -e "\n${BLUE}IMPORTANTE:${NC} Ao logar, você será solicitado a alterar o email e a senha."
echo -e "${BLUE}No painel, adicione o 'Proxy Host' para warbanner.italommf.com.br apontando para o IP da sua VPS na porta 8081.${NC}"
