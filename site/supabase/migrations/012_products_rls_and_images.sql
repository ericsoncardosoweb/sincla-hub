-- =====================================================
-- SINCLA HUB - PRODUCTS: RLS POLICIES + IMAGE FIELDS
-- Migration: 012_products_rls_and_images.sql
-- Data: 2026-02-26
-- =====================================================

-- ============================
-- 1. RLS Policies para products
-- ============================

-- Habilitar RLS (pode já estar habilitado)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler produtos
CREATE POLICY "Authenticated users can read products"
    ON products FOR SELECT
    USING (auth.role() = 'authenticated');

-- Admins master podem gerenciar produtos
-- Master = owner/admin de qualquer empresa (para agora, permitir qualquer autenticado inserir para o admin funcionar)
CREATE POLICY "Authenticated users can insert products"
    ON products FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products"
    ON products FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete products"
    ON products FOR DELETE
    USING (auth.role() = 'authenticated');

-- ============================
-- 2. Campos de imagem
-- ============================

-- Banner do produto (400x600)
ALTER TABLE products ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500);

-- Favicon do produto (200x200)
ALTER TABLE products ADD COLUMN IF NOT EXISTS favicon_url VARCHAR(500);

-- Logo padrão (fundos claros)
ALTER TABLE products ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);

-- Logo negativo (fundos escuros)
ALTER TABLE products ADD COLUMN IF NOT EXISTS logo_negative_url VARCHAR(500);

-- ============================
-- 3. Campo de ordenação
-- ============================
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
