# Build do frontend + Nginx servindo o dist (uso local via docker-compose.local.yml).
# ATENÇÃO: este Dockerfile é só para conferência local. Produção continua via
# build Vite + Nginx da VPS (docs/DEPLOY-VPS.md) — não usar esta imagem lá.
FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_URL=http://localhost:3333/api
ARG VITE_BASE_PATH=/
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BASE_PATH=$VITE_BASE_PATH

COPY package*.json ./
RUN npm ci

COPY . ./
RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
