-- =====================================================
-- SINCLA HUB - MIGRATION 032
-- Provisão Automática de Credits & Storage
-- Data: 2026-03-27
-- =====================================================
-- Cria trigger que provisiona company_credits (ai) e 
-- storage_quotas automaticamente quando uma assinatura
-- é criada ou ativada, baseado nos limits do plano.
--
-- IMPORTANTE: Tokens e Storage são CUMULATIVOS entre
-- planos. Ex: RH dá 5M + EAD dá 5M = 10M total.
-- =====================================================

-- =====================================================
-- 1. FUNCTION — Recalcular totais de serviços da empresa
-- =====================================================
-- Ao invés de usar o valor do plano individual, soma
-- os limits de TODAS as assinaturas ativas da empresa.
-- =====================================================

CREATE OR REPLACE FUNCTION provision_company_services()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_ai_tokens BIGINT := 0;
    v_total_storage_gb BIGINT := 0;
    v_company_id UUID;
    r RECORD;
BEGIN
    v_company_id := NEW.company_id;

    -- Só provisiona quando status é 'active' ou 'trial'
    -- Se é UPDATE e nada mudou, ignora
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status = NEW.status AND OLD.plan = NEW.plan THEN
            RETURN NEW;
        END IF;
    END IF;

    -- ═══ Somar tokens e storage de TODAS as assinaturas ativas ═══
    FOR r IN
        SELECT pp.limits
        FROM subscriptions s
        JOIN product_plans pp ON pp.product_id = s.product_id AND pp.slug = s.plan
        WHERE s.company_id = v_company_id
          AND s.status IN ('active', 'trial')
    LOOP
        v_total_ai_tokens := v_total_ai_tokens + COALESCE((r.limits->>'ai_tokens')::BIGINT, 0);
        v_total_storage_gb := v_total_storage_gb + COALESCE((r.limits->>'storage_gb')::BIGINT, 0);
    END LOOP;

    -- ═══ Provisionar/Atualizar Créditos de IA ═══
    -- monthly_bonus é preservado (compras extras do cliente)
    INSERT INTO company_credits (
        company_id, service_type, balance, 
        monthly_allowance, monthly_bonus, period_usage,
        last_reset_at, next_reset_at
    ) VALUES (
        v_company_id, 'ai', v_total_ai_tokens,
        v_total_ai_tokens, 0, 0,
        NOW(), NOW() + INTERVAL '1 month'
    )
    ON CONFLICT (company_id, service_type) DO UPDATE
    SET monthly_allowance = v_total_ai_tokens,
        -- Recalcula balance: novo allowance + bonus existente - uso do período
        balance = GREATEST(0, v_total_ai_tokens + company_credits.monthly_bonus - company_credits.period_usage),
        updated_at = NOW();

    -- ═══ Provisionar/Atualizar Storage ═══
    IF v_total_storage_gb > 0 THEN
        INSERT INTO storage_quotas (
            company_id, 
            storage_quota_bytes,
            stream_quota_bytes
        ) VALUES (
            v_company_id,
            v_total_storage_gb * 1073741824,  -- GB para bytes
            v_total_storage_gb * 1073741824   -- Mesma quota para stream
        )
        ON CONFLICT (company_id) DO UPDATE
        SET storage_quota_bytes = v_total_storage_gb * 1073741824,
            stream_quota_bytes = v_total_storage_gb * 1073741824,
            updated_at = NOW();
    ELSE
        -- Garante que existe storage com default mínimo
        INSERT INTO storage_quotas (company_id)
        VALUES (v_company_id)
        ON CONFLICT (company_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION provision_company_services IS 
'Provisiona automaticamente company_credits (ai) e storage_quotas somando limits de TODAS as assinaturas ativas da empresa.';

-- =====================================================
-- 2. TRIGGER — Dispara na subscriptions
-- =====================================================

DROP TRIGGER IF EXISTS trg_provision_company_services ON subscriptions;

CREATE TRIGGER trg_provision_company_services
    AFTER INSERT OR UPDATE OF status, plan
    ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION provision_company_services();

-- =====================================================
-- 3. RETROACTIVE — Provisionar empresas existentes
-- =====================================================
-- Recalcula os totais para CADA empresa com assinaturas
-- ativas, somando ai_tokens e storage_gb de todos os planos
-- =====================================================

DO $$
DECLARE
    v_company RECORD;
    v_total_ai_tokens BIGINT;
    v_total_storage_gb BIGINT;
    r RECORD;
BEGIN
    -- Para cada empresa com assinatura ativa
    FOR v_company IN
        SELECT DISTINCT company_id
        FROM subscriptions
        WHERE status IN ('active', 'trial')
    LOOP
        v_total_ai_tokens := 0;
        v_total_storage_gb := 0;

        -- Somar limites de todos os planos ativos
        FOR r IN
            SELECT pp.limits
            FROM subscriptions s
            JOIN product_plans pp ON pp.product_id = s.product_id AND pp.slug = s.plan
            WHERE s.company_id = v_company.company_id
              AND s.status IN ('active', 'trial')
        LOOP
            v_total_ai_tokens := v_total_ai_tokens + COALESCE((r.limits->>'ai_tokens')::BIGINT, 0);
            v_total_storage_gb := v_total_storage_gb + COALESCE((r.limits->>'storage_gb')::BIGINT, 0);
        END LOOP;

        -- Provisionar AI credits (somatório de todos os planos)
        INSERT INTO company_credits (
            company_id, service_type, balance,
            monthly_allowance, monthly_bonus, period_usage,
            last_reset_at, next_reset_at
        ) VALUES (
            v_company.company_id, 'ai', v_total_ai_tokens,
            v_total_ai_tokens, 0, 0,
            NOW(), NOW() + INTERVAL '1 month'
        )
        ON CONFLICT (company_id, service_type) DO UPDATE
        SET monthly_allowance = v_total_ai_tokens,
            balance = GREATEST(0, v_total_ai_tokens + company_credits.monthly_bonus - company_credits.period_usage),
            updated_at = NOW();

        -- Provisionar Storage (somatório de todos os planos)
        IF v_total_storage_gb > 0 THEN
            INSERT INTO storage_quotas (
                company_id,
                storage_quota_bytes,
                stream_quota_bytes
            ) VALUES (
                v_company.company_id,
                v_total_storage_gb * 1073741824,
                v_total_storage_gb * 1073741824
            )
            ON CONFLICT (company_id) DO UPDATE
            SET storage_quota_bytes = v_total_storage_gb * 1073741824,
                stream_quota_bytes = v_total_storage_gb * 1073741824,
                updated_at = NOW();
        ELSE
            INSERT INTO storage_quotas (company_id)
            VALUES (v_company.company_id)
            ON CONFLICT (company_id) DO NOTHING;
        END IF;
    END LOOP;
END;
$$;

-- =====================================================
-- FIM DA MIGRATION 032
-- =====================================================
