# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Vite embute env no build — Easypanel pode sobrescrever via build args
ARG VITE_SUPABASE_URL=https://igwjtvdanulrwntdyfbt.supabase.co
ARG VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnd2p0dmRhbnVscndudGR5ZmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwODUxNzUsImV4cCI6MjA4NjY2MTE3NX0.q3eLQ0D2PW6z1U9VwC09K9DlqFsgsW0Jhw-btV2cKXo
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
