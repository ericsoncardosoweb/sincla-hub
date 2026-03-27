-- =====================================================
-- SINCLA HUB - MIGRATION 033
-- Cron: Reset Mensal de Créditos + Expiração de Compras
-- Data: 2026-03-27
-- =====================================================
-- 1. Melhora reset_monthly_credits() para recalcular
--    com base em TODOS os planos ativos da empresa
-- 2. Cria cron jobs diários via pg_cron
-- 3. Cria RPC para recarga sob demanda (chamado pelo webhook)
-- =====================================================

-- =====================================================
-- 1. FUNCTION — Reset mensal aprimorado
-- =====================================================
-- Agora recalcula monthly_allowance a partir de TODOS
-- os planos ativos da empresa (cumulativo entre ferramentas)
-- =====================================================

-- Drop necessário: return type muda de void para integer
DROP FUNCTION IF EXISTS reset_monthly_credits();

CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
    v_credit RECORD;
    v_total_allowance BIGINT;
BEGIN
    -- Para cada company_credits com reset vencido
    FOR v_credit IN
        SELECT cc.company_id, cc.service_type
        FROM company_credits cc
        WHERE cc.next_reset_at <= NOW()
    LOOP
        -- Recalcular monthly_allowance a partir dos planos ativos
        IF v_credit.service_type = 'ai' THEN
            SELECT COALESCE(SUM(
                COALESCE((pp.limits->>'ai_tokens')::BIGINT, 0)
            ), 0)
            INTO v_total_allowance
            FROM subscriptions s
            JOIN product_plans pp ON pp.product_id = s.product_id AND pp.slug = s.plan
            WHERE s.company_id = v_credit.company_id
              AND s.status IN ('active', 'trial');
        ELSE
            v_total_allowance := 0;
        END IF;

        -- Reset: balance = novo allowance + bonus, zera usage
        UPDATE company_credits
        SET monthly_allowance = v_total_allowance,
            balance = v_total_allowance + monthly_bonus,
            period_usage = 0,
            last_reset_at = NOW(),
            next_reset_at = NOW() + INTERVAL '1 month'
        WHERE company_id = v_credit.company_id
          AND service_type = v_credit.service_type;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION reset_monthly_credits IS 
'Reseta créditos mensais recalculando o allowance a partir de todos os planos ativos. Retorna quantidade de registros resetados.';

-- =====================================================
-- 2. FUNCTION — Recarregar créditos de UMA empresa
-- =====================================================
-- Chamado pelo billing-webhook após payment.succeeded
-- para recarregar imediatamente após pagamento confirmado
-- =====================================================

CREATE OR REPLACE FUNCTION reload_company_credits(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_ai_tokens BIGINT := 0;
    v_total_storage_gb BIGINT := 0;
    r RECORD;
BEGIN
    -- Somar tokens e storage de TODOS os planos ativos
    FOR r IN
        SELECT pp.limits
        FROM subscriptions s
        JOIN product_plans pp ON pp.product_id = s.product_id AND pp.slug = s.plan
        WHERE s.company_id = p_company_id
          AND s.status IN ('active', 'trial')
    LOOP
        v_total_ai_tokens := v_total_ai_tokens + COALESCE((r.limits->>'ai_tokens')::BIGINT, 0);
        v_total_storage_gb := v_total_storage_gb + COALESCE((r.limits->>'storage_gb')::BIGINT, 0);
    END LOOP;

    -- Recarregar AI credits
    INSERT INTO company_credits (
        company_id, service_type, balance,
        monthly_allowance, monthly_bonus, period_usage,
        last_reset_at, next_reset_at
    ) VALUES (
        p_company_id, 'ai', v_total_ai_tokens,
        v_total_ai_tokens, 0, 0,
        NOW(), NOW() + INTERVAL '1 month'
    )
    ON CONFLICT (company_id, service_type) DO UPDATE
    SET monthly_allowance = v_total_ai_tokens,
        balance = v_total_ai_tokens + company_credits.monthly_bonus,
        period_usage = 0,
        last_reset_at = NOW(),
        next_reset_at = NOW() + INTERVAL '1 month',
        updated_at = NOW();

    -- Atualizar Storage
    IF v_total_storage_gb > 0 THEN
        INSERT INTO storage_quotas (company_id, storage_quota_bytes, stream_quota_bytes)
        VALUES (p_company_id, v_total_storage_gb * 1073741824, v_total_storage_gb * 1073741824)
        ON CONFLICT (company_id) DO UPDATE
        SET storage_quota_bytes = v_total_storage_gb * 1073741824,
            stream_quota_bytes = v_total_storage_gb * 1073741824,
            updated_at = NOW();
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'ai_tokens', v_total_ai_tokens,
        'storage_gb', v_total_storage_gb
    );
END;
$$;

COMMENT ON FUNCTION reload_company_credits IS 
'Recarrega créditos de uma empresa específica somando todos os planos ativos. Chamado pelo billing-webhook após pagamento confirmado.';

-- Grant para service_role (Edge Functions)
GRANT EXECUTE ON FUNCTION reload_company_credits(UUID) TO service_role;

-- =====================================================
-- 3. CRON JOBS via pg_cron
-- =====================================================
-- Diário às 03:00 UTC: reset de créditos vencidos
-- Diário às 04:00 UTC: expirar compras avulsas vencidas
-- =====================================================

SELECT cron.schedule(
    'reset-monthly-credits',
    '0 3 * * *',  -- Todo dia às 03:00 UTC
    $$SELECT reset_monthly_credits()$$
);

SELECT cron.schedule(
    'expire-old-purchases',
    '0 4 * * *',  -- Todo dia às 04:00 UTC
    $$SELECT expire_old_purchases()$$
);

-- =====================================================
-- FIM DA MIGRATION 033
-- =====================================================
