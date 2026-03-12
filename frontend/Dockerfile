# Estágio de Build
FROM node:20-slim AS build

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm install

# Copiar código e buildar
COPY . .
RUN npm run build

# Estágio de Produção (Nginx)
FROM nginx:alpine

# Copiar arquivos buildados do estágio anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
