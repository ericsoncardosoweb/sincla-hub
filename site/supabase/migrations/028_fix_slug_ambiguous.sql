-- =====================================================
-- SINCLA HUB - MIGRATION 028
-- Fix: Variável 'slug' ambígua em generate_unique_slug
-- Data: 2026-03-26
-- =====================================================
-- Problema: PostgreSQL 42702 "column reference slug is
-- ambiguous" ao chamar admin_provision_company.
-- Causa: variável PL/pgSQL 'slug' colide com a coluna
-- companies.slug no WHERE da consulta.
-- Fix: Renomear variável para 'v_slug'.
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_unique_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_slug TEXT;
    v_counter INT := 0;
BEGIN
    -- Remove caracteres especiais e converte para lowercase
    v_slug := lower(regexp_replace(base_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);

    -- Verifica se já existe
    WHILE EXISTS (SELECT 1 FROM companies WHERE companies.slug = v_slug) LOOP
        v_counter := v_counter + 1;
        v_slug := lower(regexp_replace(base_name, '[^a-zA-Z0-9]+', '-', 'g'));
        v_slug := trim(both '-' from v_slug) || '-' || v_counter::TEXT;
    END LOOP;

    RETURN v_slug;
END;
$$ LANGUAGE plpgsql;
