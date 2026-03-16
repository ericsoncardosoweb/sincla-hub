# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Receber variáveis do Easypanel (build args → env vars para o Vite)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Instalar dependências
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código e buildar
COPY . .
RUN npm run build

# ── Stage 2: Serve com Nginx ────────────────────────────────────────────────
FROM nginx:alpine

# Copiar build para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuração do Nginx para SPA (todas as rotas → index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
