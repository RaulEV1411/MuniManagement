# 1) Compila el front.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
# Vacíos: el mapa usa OpenFreeMap y la búsqueda de direcciones, Nominatim.
ARG VITE_MAPA_ESTILO=
ENV VITE_MAPA_ESTILO=$VITE_MAPA_ESTILO
ARG VITE_BUSQUEDA_DIRECCIONES=
ENV VITE_BUSQUEDA_DIRECCIONES=$VITE_BUSQUEDA_DIRECCIONES
RUN npm run build

# 2) Caddy sirve el front, hace de proxy de la API y saca el certificado HTTPS solo.
FROM caddy:2.11-alpine
COPY --from=build /app/dist /srv/app
COPY Caddyfile /etc/caddy/Caddyfile
# Un error en el Caddyfile hace fallar el build (y la CI), no el arranque en producción.
RUN DOMINIO=localhost caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
