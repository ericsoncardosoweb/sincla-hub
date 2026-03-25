-- =====================================================
-- SINCLA HUB - MIGRATION 025
-- Provisão de Assinantes (Admin) + Duração flexível
-- Data: 2026-03-25
-- =====================================================
-- Problema: Admins precisam criar assinantes com empresa
-- e ferramentas direto pelo painel, e o sistema de cortesia
-- só suportava "vitalício" — agora suporta 30/60/90 dias.
-- =====================================================

-- =====================================================
-- 1. Atualizar admin_grant_subscription com duração
-- =====================================================

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

-- =====================================================
-- 2. RPC para criar empresa por admin (bypass RLS)
-- =====================================================

CREATE OR REPLACE FUNCTION admin_provision_company(
    p_subscriber_id UUID,
    p_company_name TEXT
) RETURNS UUID AS $$
DECLARE
    v_slug TEXT;
    v_company_id UUID;
BEGIN
    -- Verifica se o usuário que está chamando a função é um Admin
    IF NOT is_admin_user() THEN
        RAISE EXCEPTION 'Acesso negado: Requer privilégios de administrador.';
    END IF;

    -- Gera slug único
    v_slug := generate_unique_slug(p_company_name);

    -- Cria a empresa (trigger handle_new_company cria o member owner)
    INSERT INTO public.companies (subscriber_id, name, slug)
    VALUES (p_subscriber_id, p_company_name, v_slug)
    RETURNING id INTO v_company_id;

    RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
