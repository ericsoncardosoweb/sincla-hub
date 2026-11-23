-- Assinatura manual com convite (Admin Master)
-- =============================================
-- - subscription_invites: convite com produtos/planos, valores, tokens e storage.
--   A conta (auth user + subscriber + company) é criada "virgem" no envio;
--   as assinaturas só nascem quando o convidado aceita.
-- - subscriptions.custom_limits: limites por assinatura (ex.: ai_tokens) que
--   sobrepõem os limites do plano.
-- - companies.storage_quota_gb_override: armazenamento inicial da conta,
--   no lugar da soma dos planos.
-- - Créditos e entitlements passam a resolver o plano por plan_id (com
--   fallback pelo slug legado) e aplicam os overrides acima.

CREATE TABLE IF NOT EXISTS public.subscription_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'accepted', 'canceled')),
    contact_name text NOT NULL,
    company_name text NOT NULL,
    email text NOT NULL,
    phone text,
    cpf_cnpj text NOT NULL,
    billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    due_date date NOT NULL,
    storage_gb numeric,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    total_amount numeric NOT NULL DEFAULT 0,
    subscriber_id uuid REFERENCES public.subscribers(id) ON DELETE SET NULL,
    company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
    account_created boolean NOT NULL DEFAULT false,
    external_customer_id text,
    external_subscription_id text,
    invoice_url text,
    last_error text,
    last_sent_at timestamptz,
    accepted_at timestamptz,
    canceled_at timestamptz,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_invites_status_idx ON public.subscription_invites (status, created_at DESC);
CREATE INDEX IF NOT EXISTS subscription_invites_email_idx ON public.subscription_invites (lower(email));

DROP TRIGGER IF EXISTS update_subscription_invites_updated_at ON public.subscription_invites;
CREATE TRIGGER update_subscription_invites_updated_at
    BEFORE UPDATE ON public.subscription_invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.subscription_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_invites_admin_select ON public.subscription_invites;
CREATE POLICY subscription_invites_admin_select ON public.subscription_invites
    FOR SELECT TO authenticated USING (public.is_admin_user());

ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS custom_limits jsonb,
    ADD COLUMN IF NOT EXISTS invite_id uuid REFERENCES public.subscription_invites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS subscriptions_external_subscription_id_idx
    ON public.subscriptions (external_subscription_id)
    WHERE external_subscription_id IS NOT NULL;

ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS storage_quota_gb_override numeric;

-- ─── Limites efetivos das assinaturas ativas de uma empresa ───
CREATE OR REPLACE FUNCTION public.company_active_plan_limits(p_company_id uuid)
RETURNS TABLE (subscription_id uuid, product_id character varying, limits jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT s.id,
           s.product_id,
           COALESCE(pp_id.limits, pp_slug.limits, '{}'::jsonb) || COALESCE(s.custom_limits, '{}'::jsonb)
    FROM public.subscriptions s
    LEFT JOIN public.product_plans pp_id ON pp_id.id = s.plan_id
    LEFT JOIN public.product_plans pp_slug
           ON s.plan_id IS NULL
          AND pp_slug.product_id = s.product_id
          AND pp_slug.slug = s.plan
    WHERE s.company_id = p_company_id
      AND s.status IN ('active', 'trial')
$function$;

REVOKE ALL ON FUNCTION public.company_active_plan_limits(uuid) FROM PUBLIC, anon, authenticated;

-- ─── Trigger de provisionamento (créditos de IA + storage) ───
CREATE OR REPLACE FUNCTION public.provision_company_services()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_ai_tokens BIGINT := 0;
    v_total_storage_gb BIGINT := 0;
    v_storage_override NUMERIC;
    v_company_id UUID;
    r RECORD;
BEGIN
    v_company_id := NEW.company_id;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IS NOT DISTINCT FROM NEW.status
           AND OLD.plan IS NOT DISTINCT FROM NEW.plan
           AND OLD.plan_id IS NOT DISTINCT FROM NEW.plan_id
           AND OLD.custom_limits IS NOT DISTINCT FROM NEW.custom_limits THEN
            RETURN NEW;
        END IF;
    END IF;

    FOR r IN SELECT l.limits FROM public.company_active_plan_limits(v_company_id) l
    LOOP
        v_total_ai_tokens := v_total_ai_tokens + COALESCE((r.limits->>'ai_tokens')::BIGINT, 0);
        v_total_storage_gb := v_total_storage_gb + COALESCE((r.limits->>'storage_gb')::BIGINT, 0);
    END LOOP;

    SELECT storage_quota_gb_override INTO v_storage_override
    FROM public.companies WHERE id = v_company_id;
    IF v_storage_override IS NOT NULL THEN
        v_total_storage_gb := v_storage_override::BIGINT;
    END IF;

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
        balance = GREATEST(0, v_total_ai_tokens + company_credits.monthly_bonus - company_credits.period_usage),
        updated_at = NOW();

    IF v_total_storage_gb > 0 THEN
        INSERT INTO storage_quotas (company_id, storage_quota_bytes, stream_quota_bytes)
        VALUES (v_company_id, v_total_storage_gb * 1073741824, v_total_storage_gb * 1073741824)
        ON CONFLICT (company_id) DO UPDATE
        SET storage_quota_bytes = v_total_storage_gb * 1073741824,
            stream_quota_bytes = v_total_storage_gb * 1073741824,
            updated_at = NOW();
    ELSE
        INSERT INTO storage_quotas (company_id)
        VALUES (v_company_id)
        ON CONFLICT (company_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_provision_company_services ON public.subscriptions;
CREATE TRIGGER trg_provision_company_services
    AFTER INSERT OR UPDATE OF status, plan, plan_id, custom_limits ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION provision_company_services();

-- ─── Recarga de créditos (pagamento confirmado) ───
CREATE OR REPLACE FUNCTION public.reload_company_credits(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_ai_tokens BIGINT := 0;
    v_total_storage_gb BIGINT := 0;
    v_storage_override NUMERIC;
    v_has_active BOOLEAN := false;
    r RECORD;
    c_min_ai_tokens CONSTANT BIGINT := 2000000;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.company_id = p_company_id
          AND s.status IN ('active', 'trial')
    ) INTO v_has_active;

    FOR r IN SELECT l.limits FROM public.company_active_plan_limits(p_company_id) l
    LOOP
        v_total_ai_tokens := v_total_ai_tokens + COALESCE((r.limits->>'ai_tokens')::BIGINT, 0);
        v_total_storage_gb := v_total_storage_gb + COALESCE((r.limits->>'storage_gb')::BIGINT, 0);
    END LOOP;

    SELECT storage_quota_gb_override INTO v_storage_override
    FROM public.companies WHERE id = p_company_id;
    IF v_storage_override IS NOT NULL THEN
        v_total_storage_gb := v_storage_override::BIGINT;
    END IF;

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
        'storage_gb', v_total_storage_gb,
        'has_active', v_has_active
    );
END;
$function$;

-- ─── Reset mensal de créditos ───
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

            SELECT COALESCE(SUM(COALESCE((l.limits->>'ai_tokens')::BIGINT, 0)), 0)
            INTO v_total_allowance
            FROM public.company_active_plan_limits(v_credit.company_id) l;

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

-- ─── Entitlements por produto (lidos pelas ferramentas no cross-token) ───
CREATE OR REPLACE FUNCTION public.get_company_product_entitlements(p_company_id uuid, p_product_id character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub RECORD;
  v_base_limits JSONB := '{}'::JSONB;
  v_features JSONB := '{}'::JSONB;
  v_addon RECORD;
  v_plan_code TEXT;
  v_account_type TEXT;
  v_storage_gb NUMERIC := 0;
  v_storage_override NUMERIC;
  v_fee_percent NUMERIC := 5.99;
  v_lifetime BOOLEAN := FALSE;
BEGIN
  SELECT COALESCE(lifetime_access, FALSE), storage_quota_gb_override
  INTO v_lifetime, v_storage_override
  FROM public.companies WHERE id = p_company_id;

  IF v_lifetime THEN
    RETURN jsonb_build_object(
      'active', TRUE,
      'product_id', p_product_id,
      'plan_code', 'lifetime',
      'account_type', 'pj',
      'subscription_status', 'active',
      'lifetime', TRUE,
      'storage_gb_included', 100000,
      'transaction_fee_percent', 0,
      'unlimited_courses', TRUE,
      'unlimited_students', TRUE,
      'features', jsonb_build_object(
        'community', TRUE,
        'gamification', TRUE,
        'quizzes_advanced', TRUE,
        'custom_domain', TRUE,
        'api', TRUE,
        'webhooks', TRUE,
        'automations', TRUE
      ),
      'addons', '["lifetime"]'::JSONB,
      'raw_base_limits', '{}'::JSONB
    );
  END IF;

  SELECT s.id, s.status, s.plan, s.plan_id, s.custom_limits,
         pp.slug, pp.limits, pp.account_type, pp.plan_kind
  INTO v_sub
  FROM public.subscriptions s
  LEFT JOIN public.product_plans pp ON pp.id = s.plan_id
  WHERE s.company_id = p_company_id
    AND s.product_id = p_product_id
    AND s.status IN ('active', 'trial')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('active', FALSE);
  END IF;

  IF v_sub.limits IS NULL AND v_sub.plan IS NOT NULL THEN
    SELECT pp.slug, pp.limits, pp.account_type, pp.plan_kind
    INTO v_sub.slug, v_sub.limits, v_sub.account_type, v_sub.plan_kind
    FROM public.product_plans pp
    WHERE pp.product_id = p_product_id AND pp.slug = v_sub.plan
    LIMIT 1;
  END IF;

  v_base_limits := COALESCE(v_sub.limits, '{}'::JSONB) || COALESCE(v_sub.custom_limits, '{}'::JSONB);
  v_plan_code := COALESCE(v_sub.slug, v_sub.plan, 'legacy');
  v_account_type := COALESCE(v_sub.account_type, v_base_limits->>'account_type', 'pj');
  v_features := COALESCE(v_base_limits->'features', '{}'::JSONB);
  v_storage_gb := COALESCE(v_storage_override, (v_base_limits->>'storage_gb')::NUMERIC, 0);
  v_fee_percent := COALESCE((v_base_limits->>'transaction_fee_percent')::NUMERIC, 5.99);

  FOR v_addon IN
    SELECT pp.slug, pp.limits, pp.plan_kind
    FROM public.subscription_addons sa
    JOIN public.product_plans pp ON pp.id = sa.plan_id
    WHERE sa.company_id = p_company_id
      AND sa.product_id = p_product_id
      AND sa.status IN ('active', 'trial')
  LOOP
    v_features := public.jsonb_merge_features(v_features, COALESCE(v_addon.limits->'features', '{}'::JSONB));
    v_storage_gb := v_storage_gb + COALESCE((v_addon.limits->>'storage_gb_bonus')::NUMERIC, 0);

    IF v_addon.plan_kind = 'bundle' THEN
      v_plan_code := v_addon.slug;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'active', TRUE,
    'product_id', p_product_id,
    'plan_code', v_plan_code,
    'account_type', v_account_type,
    'subscription_status', v_sub.status,
    'storage_gb_included', v_storage_gb,
    'transaction_fee_percent', v_fee_percent,
    'unlimited_courses', COALESCE((v_base_limits->>'unlimited_courses')::BOOLEAN, TRUE),
    'unlimited_students', COALESCE((v_base_limits->>'unlimited_students')::BOOLEAN, TRUE),
    'features', v_features,
    'addons', (
      SELECT COALESCE(jsonb_agg(pp.slug ORDER BY pp.sort_order), '[]'::JSONB)
      FROM public.subscription_addons sa
      JOIN public.product_plans pp ON pp.id = sa.plan_id
      WHERE sa.company_id = p_company_id
        AND sa.product_id = p_product_id
        AND sa.status IN ('active', 'trial')
    ),
    'raw_base_limits', v_base_limits
  );
END;
$function$;
