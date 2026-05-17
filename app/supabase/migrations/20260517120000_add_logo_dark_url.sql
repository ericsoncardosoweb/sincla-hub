-- Migration: Adicionar campo logo_dark_url para logo negativo (modo dark)
-- Permite que cada empresa tenha um logo alternativo para uso em fundos escuros

ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_dark_url TEXT;

COMMENT ON COLUMN companies.logo_dark_url IS 'URL do logo negativo/invertido para uso em modo dark ou fundos escuros';
