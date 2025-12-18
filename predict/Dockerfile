# Usar node 22
FROM node:22-slim

WORKDIR /usr/src/app

COPY package*.json ./

# Instalar dependencias
RUN npm ci --omit=dev

# Copiar código y modelo
COPY . .

EXPOSE 3002

CMD ["node", "server.js"]
