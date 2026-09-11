-- Inclusão mensal de tokens de IA para assinantes
-- =================================================
-- Teaser: 2.000.000 tokens/mês (não 200 brutos — inúteis).
-- Custo OpenAI típico com mini/nano: bem abaixo de R$ 50/mês mesmo com uso pleno
-- (referência interna de metering ~R$ 2,50–7,50 / 1M tokens).

UPDATE product_plans
SET limits = jsonb_set(
  COALESCE(limits, '{}'::jsonb),
  '{ai_tokens}',
  to_jsonb(
    GREATEST(
      COALESCE((limits->>'ai_tokens')::bigint, 0),
      2000000
    )
  ),
  true
)
WHERE product_id IN ('rh', 'ead', 'talento', 'agenda', 'crm', 'leads', 'intranet');

CREATE OR REPLACE FUNCTION public.reload_company_credits(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_ai_tokens BIGINT := 0;
    v_total_storage_gb BIGINT := 0;
    v_has_active BOOLEAN := false;
    r RECORD;
    c_min_ai_tokens CONSTANT BIGINT := 2000000;
BEGIN
    FOR r IN
        SELECT pp.limits
        FROM subscriptions s
        JOIN product_plans pp ON pp.product_id = s.product_id AND pp.slug = s.plan
        WHERE s.company_id = p_company_id
          AND s.status IN ('active', 'trial')
    LOOP
        v_has_active := true;
        v_total_ai_tokens := v_total_ai_tokens + COALESCE((r.limits->>'ai_tokens')::BIGINT, 0);
        v_total_storage_gb := v_total_storage_gb + COALESCE((r.limits->>'storage_gb')::BIGINT, 0);
    END LOOP;

    IF v_has_active AND v_total_ai_tokens < c_min_ai_tokens THEN
        v_total_ai_tokens := c_min_ai_tokens;
    END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INTEGER := 0;
    v_credit RECORD;
    v_total_allowance BIGINT;
    v_has_active BOOLEAN;
    c_min_ai_tokens CONSTANT BIGINT := 2000000;
BEGIN
    FOR v_credit IN
        SELECT cc.company_id, cc.service_type
        FROM company_credits cc
        WHERE cc.next_reset_at <= NOW()
    LOOP
        IF v_credit.service_type = 'ai' THEN
            SELECT EXISTS (
                SELECT 1 FROM subscriptions s
                WHERE s.company_id = v_credit.company_id
                  AND s.status IN ('active', 'trial')
            ) INTO v_has_active;

            SELECT COALESCE(SUM(
                COALESCE((pp.limits->>'ai_tokens')::BIGINT, 0)
            ), 0)
            INTO v_total_allowance
            FROM subscriptions s
            JOIN product_plans pp ON pp.product_id = s.product_id AND pp.slug = s.plan
            WHERE s.company_id = v_credit.company_id
              AND s.status IN ('active', 'trial');

            IF v_has_active AND v_total_allowance < c_min_ai_tokens THEN
                v_total_allowance := c_min_ai_tokens;
            END IF;
        ELSE
            SELECT monthly_allowance INTO v_total_allowance
            FROM company_credits
            WHERE company_id = v_credit.company_id
              AND service_type = v_credit.service_type;
            v_total_allowance := COALESCE(v_total_allowance, 0);
        END IF;

        UPDATE company_credits
        SET monthly_allowance = v_total_allowance,
            balance = v_total_allowance + monthly_bonus,
            period_usage = 0,
            last_reset_at = NOW(),
            next_reset_at = NOW() + INTERVAL '1 month',
            updated_at = NOW()
        WHERE company_id = v_credit.company_id
          AND service_type = v_credit.service_type;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$function$;

-- Aplica inclusão agora para assinantes ativos/trial
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT DISTINCT company_id
        FROM subscriptions
        WHERE status IN ('active', 'trial')
    LOOP
        PERFORM reload_company_credits(r.company_id);
    END LOOP;
END $$;
