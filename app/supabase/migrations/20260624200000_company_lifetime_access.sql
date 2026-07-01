-- Hub — Acesso vitalício por empresa
-- Permite marcar empresas (ex.: a própria Sincla) com acesso ilimitado a todas as ferramentas.
-- Entitlements vitalícios sobrepõem qualquer plano/add-on no SSO (generate-cross-token).

-- ---------------------------------------------------------------------------
-- 1. Flag na empresa
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS lifetime_access BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS lifetime_access_note TEXT;

COMMENT ON COLUMN public.companies.lifetime_access IS
  'Empresa cortesia/parceira com acesso ilimitado a todas as ferramentas (sobrepõe planos/add-ons).';

CREATE INDEX IF NOT EXISTS idx_companies_lifetime_access
  ON public.companies (lifetime_access)
  WHERE lifetime_access = TRUE;

-- ---------------------------------------------------------------------------
-- 2. Entitlements com short-circuit vitalício
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_company_product_entitlements(
  p_company_id UUID,
  p_product_id VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
  v_base_limits JSONB := '{}'::JSONB;
  v_features JSONB := '{}'::JSONB;
  v_addon RECORD;
  v_plan_code TEXT;
  v_account_type TEXT;
  v_storage_gb NUMERIC := 0;
  v_fee_percent NUMERIC := 5.99;
  v_lifetime BOOLEAN := FALSE;
BEGIN
  -- Acesso vitalício: libera tudo em qualquer produto, independente de plano/add-on
  SELECT COALESCE(lifetime_access, FALSE) INTO v_lifetime
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

  SELECT s.id, s.status, s.plan, s.plan_id,
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

  -- Fallback para assinaturas legadas sem plan_id
  IF v_sub.limits IS NULL AND v_sub.plan IS NOT NULL THEN
    SELECT pp.slug, pp.limits, pp.account_type, pp.plan_kind
    INTO v_sub.slug, v_sub.limits, v_sub.account_type, v_sub.plan_kind
    FROM public.product_plans pp
    WHERE pp.product_id = p_product_id AND pp.slug = v_sub.plan
    LIMIT 1;
  END IF;

  v_base_limits := COALESCE(v_sub.limits, '{}'::JSONB);
  v_plan_code := COALESCE(v_sub.slug, v_sub.plan, 'legacy');
  v_account_type := COALESCE(v_sub.account_type, v_base_limits->>'account_type', 'pj');
  v_features := COALESCE(v_base_limits->'features', '{}'::JSONB);
  v_storage_gb := COALESCE((v_base_limits->>'storage_gb')::NUMERIC, 0);
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
$$;

-- ---------------------------------------------------------------------------
-- 3. Função admin para conceder/revogar vitalício
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_company_lifetime_access(
  p_company_id UUID,
  p_enabled BOOLEAN DEFAULT TRUE,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar acesso vitalício';
  END IF;

  UPDATE public.companies
  SET lifetime_access = p_enabled,
      lifetime_access_note = COALESCE(p_note, lifetime_access_note),
      updated_at = NOW()
  WHERE id = p_company_id;

  -- Ao habilitar, garante subscription ativa (gratuita) em todos os produtos — passa o gate do SSO
  IF p_enabled THEN
    INSERT INTO public.subscriptions (company_id, product_id, plan, status, monthly_amount)
    SELECT p_company_id, pr.id, 'lifetime', 'active', 0
    FROM public.products pr
    ON CONFLICT (company_id, product_id) DO UPDATE
      SET status = 'active', plan = 'lifetime', monthly_amount = 0, updated_at = NOW();
  END IF;
END;
$$;

COMMENT ON FUNCTION public.set_company_lifetime_access IS
  'Concede/revoga acesso vitalício a uma empresa. Ao habilitar, cria subscriptions ativas em todos os produtos.';

REVOKE ALL ON FUNCTION public.set_company_lifetime_access(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_company_lifetime_access(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_company_lifetime_access(UUID, BOOLEAN, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Concede vitalício à Sincla (marca própria) — grant direto
-- ---------------------------------------------------------------------------
UPDATE public.companies
SET lifetime_access = TRUE,
    lifetime_access_note = 'Marca própria Sincla — acesso interno ilimitado',
    updated_at = NOW()
WHERE id = 'cedd2a32-d666-400b-a402-477a51da5d58';

INSERT INTO public.subscriptions (company_id, product_id, plan, status, monthly_amount)
SELECT 'cedd2a32-d666-400b-a402-477a51da5d58', pr.id, 'lifetime', 'active', 0
FROM public.products pr
ON CONFLICT (company_id, product_id) DO UPDATE
  SET status = 'active', plan = 'lifetime', monthly_amount = 0, updated_at = NOW();

-- ---------------------------------------------------------------------------
-- 5. Correção de preço do plano base PJ (197 -> 297)
-- ---------------------------------------------------------------------------
UPDATE public.product_plans
SET price_monthly = 297.00,
    price_yearly = 2970.00,
    updated_at = NOW()
WHERE product_id = 'ead' AND slug = 'ead-pj';
