-- =====================================================
-- SINCLA HUB - MIGRATION 029
-- Fix: Remove overload antigo de admin_grant_subscription
-- Data: 2026-03-26
-- =====================================================
-- Problema: Migrations 020 e 025 criaram DUAS versões da
-- mesma função com assinaturas diferentes (overload):
--   020: admin_grant_subscription(UUID, TEXT[])
--   025: admin_grant_subscription(UUID, TEXT[], INT, TEXT)
-- PostgreSQL mantém ambas. PostgREST falha silenciosamente
-- ao resolver a versão correta ("could not find function").
-- Fix: Dropar a versão antiga (2 params) e garantir que
-- apenas a versão completa (4 params) existe.
-- =====================================================

-- 1. Remove a versão antiga (2 parâmetros) se existir
DROP FUNCTION IF EXISTS admin_grant_subscription(UUID, TEXT[]);

-- 2. Recria a versão completa (4 parâmetros)
CREATE OR REPLACE FUNCTION admin_grant_subscription(
    p_company_id UUID,
    p_product_ids TEXT[],
    p_duration_days INT DEFAULT 0,
    p_plan TEXT DEFAULT 'enterprise'
) RETURNS void AS $$
DECLARE
    prod_id TEXT;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- Verifica se o usuário que está chamando a função é um Admin
    IF NOT is_admin_user() THEN
        RAISE EXCEPTION 'Acesso negado: Requer privilégios de administrador.';
    END IF;

    -- Calcula o período de acesso
    IF p_duration_days <= 0 THEN
        -- Vitalício: quase 100 anos
        v_period_end := NOW() + INTERVAL '100 years';
    ELSE
        -- Duração específica em dias
        v_period_end := NOW() + (p_duration_days || ' days')::INTERVAL;
    END IF;

    FOREACH prod_id IN ARRAY p_product_ids
    LOOP
        INSERT INTO public.subscriptions (
            company_id,
            product_id,
            plan,
            status,
            seats_limit,
            billing_cycle,
            current_period_start,
            current_period_end
        ) VALUES (
            p_company_id,
            prod_id,
            p_plan,
            'active',
            9999,
            'yearly',
            NOW(),
            v_period_end
        ) ON CONFLICT (company_id, product_id) DO UPDATE
        SET status = 'active',
            plan = p_plan,
            seats_limit = 9999,
            current_period_start = NOW(),
            current_period_end = v_period_end;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
