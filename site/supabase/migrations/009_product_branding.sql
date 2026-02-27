-- =====================================================
-- SINCLA HUB - BRANDING DE PRODUTOS
-- Migration: 009_product_branding.sql
-- Data: 2026-02-26
-- =====================================================

-- Cor da marca do produto (para o grid de ferramentas e dashboard)
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7) DEFAULT '#0087ff';

-- URL da página institucional do produto no site (para "Saiba Mais")
ALTER TABLE products ADD COLUMN IF NOT EXISTS landing_url VARCHAR(255);
