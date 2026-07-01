-- Sincla EAD — Modelo de precificação PF/PJ + add-ons modulares
-- Base ilimitada (cursos/alunos) + consumo (storage/IA) + módulos opcionais

-- ---------------------------------------------------------------------------
-- 1. Metadados de plano
-- ---------------------------------------------------------------------------
ALTER TABLE public.product_plans
  ADD COLUMN IF NOT EXISTS plan_kind VARCHAR(20) NOT NULL DEFAULT 'base'
    CHECK (plan_kind IN ('base', 'addon', 'bundle', 'legacy'));

ALTER TABLE public.product_plans
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(10)
    CHECK (account_type IS NULL OR account_type IN ('pf', 'pj', 'any'));

COMMENT ON COLUMN public.product_plans.plan_kind IS
  'base=assinatura principal; addon=módulo recorrente; bundle=pacote de add-ons; legacy=plano descontinuado';
COMMENT ON COLUMN public.product_plans.account_type IS
  'pf=CPF infoprodutor; pj=CNPJ empresa; any=add-ons disponíveis para ambos';

CREATE INDEX IF NOT EXISTS idx_product_plans_kind
  ON public.product_plans (product_id, plan_kind, is_active);

-- ---------------------------------------------------------------------------
-- 2. Add-ons recorrentes (paralelos à assinatura base)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id VARCHAR NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.product_plans(id) ON DELETE RESTRICT,
  status VARCHAR NOT NULL DEFAULT 'active'
    CHECK (status IN ('trial', 'active', 'past_due', 'frozen', 'suspended', 'canceled')),
  billing_cycle VARCHAR NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly')),
  monthly_amount NUMERIC(10, 2),
  external_subscription_id VARCHAR,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, product_id, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_addons_company_product
  ON public.subscription_addons (company_id, product_id)
  WHERE status IN ('active', 'trial');

ALTER TABLE public.subscription_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members view subscription addons" ON public.subscription_addons;
CREATE POLICY "Company members view subscription addons"
  ON public.subscription_addons FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT cm.company_id FROM public.company_members cm
      WHERE cm.user_id = auth.uid() AND cm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins manage subscription addons" ON public.subscription_addons;
CREATE POLICY "Admins manage subscription addons"
  ON public.subscription_addons FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- ---------------------------------------------------------------------------
-- 3. Helpers — merge de limites/features
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jsonb_merge_features(base JSONB, extra JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result JSONB := COALESCE(base, '{}'::JSONB);
  k TEXT;
  v JSONB;
BEGIN
  IF extra IS NULL THEN
    RETURN result;
  END IF;
  FOR k, v IN SELECT * FROM jsonb_each(extra)
  LOOP
    IF jsonb_typeof(v) = 'boolean' THEN
      result := result || jsonb_build_object(k, COALESCE((result->>k)::BOOLEAN, FALSE) OR (v)::BOOLEAN);
    ELSIF jsonb_typeof(v) = 'number' THEN
      result := result || jsonb_build_object(
        k,
        COALESCE((result->>k)::NUMERIC, 0) + (v)::NUMERIC
      );
    ELSE
      result := result || jsonb_build_object(k, v);
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

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
BEGIN
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

    -- bundle/completo substitui engajamento+profissional — features já no JSON do plano
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

COMMENT ON FUNCTION public.get_company_product_entitlements IS
  'Resolve plano base + add-ons ativos em um payload único para SSO e gates no EAD';

GRANT EXECUTE ON FUNCTION public.get_company_product_entitlements(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_product_entitlements(UUID, VARCHAR) TO service_role;

-- Sincroniza quota de storage CDN a partir dos entitlements (GB incluídos no plano)
CREATE OR REPLACE FUNCTION public.sync_storage_quota_from_entitlements(
  p_company_id UUID,
  p_product_id VARCHAR DEFAULT 'ead'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ent JSONB;
  v_gb NUMERIC;
  v_bytes BIGINT;
BEGIN
  v_ent := public.get_company_product_entitlements(p_company_id, p_product_id);
  IF COALESCE((v_ent->>'active')::BOOLEAN, FALSE) IS NOT TRUE THEN
    RETURN;
  END IF;

  v_gb := COALESCE((v_ent->>'storage_gb_included')::NUMERIC, 0);
  v_bytes := (v_gb * 1073741824)::BIGINT;

  INSERT INTO public.storage_quotas (company_id, storage_quota_bytes, stream_quota_bytes)
  VALUES (p_company_id, v_bytes, v_bytes)
  ON CONFLICT (company_id) DO UPDATE
  SET storage_quota_bytes = GREATEST(storage_quotas.storage_quota_bytes, EXCLUDED.storage_quota_bytes),
      stream_quota_bytes = GREATEST(storage_quotas.stream_quota_bytes, EXCLUDED.stream_quota_bytes),
      updated_at = NOW();
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Produto EAD — posicionamento híbrido (PF + PJ)
-- ---------------------------------------------------------------------------
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_user_model_check;
ALTER TABLE public.products ADD CONSTRAINT products_user_model_check
  CHECK (user_model = ANY (ARRAY['b2b', 'b2c', 'hybrid']));

UPDATE public.products
SET user_model = 'hybrid',
    description = 'Plataforma de cursos e treinamentos — PF (infoprodutor) e PJ (empresa)'
WHERE id = 'ead';

-- ---------------------------------------------------------------------------
-- 5. Descontinuar planos antigos (mantidos para assinaturas existentes)
-- ---------------------------------------------------------------------------
UPDATE public.product_plans
SET is_active = FALSE,
    plan_kind = 'legacy',
    updated_at = NOW()
WHERE product_id = 'ead'
  AND slug IN ('starter', 'pro', 'business');

-- ---------------------------------------------------------------------------
-- 6. Novos planos EAD
-- ---------------------------------------------------------------------------
INSERT INTO public.product_plans (
  product_id, name, slug, description, features, limits,
  price_monthly, price_yearly, discount_yearly_percent,
  is_active, is_popular, sort_order, trial_days,
  plan_kind, account_type
) VALUES
(
  'ead',
  'EAD Infoprodutor (PF)',
  'ead-pf',
  'Para pessoa física começando a vender cursos. Cursos e alunos ilimitados.',
  to_jsonb(ARRAY[
    'Cursos e alunos ilimitados',
    'Certificados e checkout integrado',
    '5 GB de storage incluído',
    'Taxa de 5,99% sobre vendas',
    'IA com créditos ou chave OpenAI própria'
  ]),
  '{
    "account_type": "pf",
    "unlimited_courses": true,
    "unlimited_students": true,
    "storage_gb": 5,
    "transaction_fee_percent": 5.99,
    "features": {
      "community": false,
      "gamification": false,
      "quizzes_advanced": false,
      "custom_domain": false,
      "api": false,
      "webhooks": false,
      "automations": false
    }
  }'::JSONB,
  97.00, 970.00, 17,
  TRUE, FALSE, 1, 14,
  'base', 'pf'
),
(
  'ead',
  'EAD Empresa (PJ)',
  'ead-pj',
  'Para empresas (CNPJ). Treinamento corporativo e escola digital profissional.',
  to_jsonb(ARRAY[
    'Cursos e alunos ilimitados',
    '20 GB de storage incluído',
    'Taxa de 3,99% sobre vendas',
    'Multi-admin e suporte prioritário',
    'Integração Sincla RH'
  ]),
  '{
    "account_type": "pj",
    "unlimited_courses": true,
    "unlimited_students": true,
    "storage_gb": 20,
    "transaction_fee_percent": 3.99,
    "features": {
      "community": false,
      "gamification": false,
      "quizzes_advanced": false,
      "custom_domain": false,
      "api": false,
      "webhooks": false,
      "automations": false
    }
  }'::JSONB,
  197.00, 1970.00, 17,
  TRUE, TRUE, 2, 14,
  'base', 'pj'
),
(
  'ead',
  'Engajamento',
  'ead-engajamento',
  'Comunidade, gamificação e quizzes avançados.',
  to_jsonb(ARRAY['Comunidade completa', 'Gamificação e ranking', 'Quizzes avançados']),
  '{
    "addon_code": "engajamento",
    "features": {
      "community": true,
      "gamification": true,
      "quizzes_advanced": true
    }
  }'::JSONB,
  79.00, 790.00, 17,
  TRUE, FALSE, 10, 7,
  'addon', 'any'
),
(
  'ead',
  'Profissional',
  'ead-profissional',
  'Domínio próprio, API, webhooks e automações.',
  to_jsonb(ARRAY['Domínio personalizado', 'API pública', 'Webhooks', 'Campanhas e lembretes']),
  '{
    "addon_code": "profissional",
    "features": {
      "custom_domain": true,
      "api": true,
      "webhooks": true,
      "automations": true
    }
  }'::JSONB,
  79.00, 790.00, 17,
  TRUE, FALSE, 11, 7,
  'addon', 'any'
),
(
  'ead',
  'Completo',
  'ead-completo',
  'Todos os módulos premium com desconto.',
  to_jsonb(ARRAY['Engajamento + Profissional', 'Economia vs. módulos avulsos']),
  '{
    "addon_code": "completo",
    "features": {
      "community": true,
      "gamification": true,
      "quizzes_advanced": true,
      "custom_domain": true,
      "api": true,
      "webhooks": true,
      "automations": true
    }
  }'::JSONB,
  139.00, 1390.00, 17,
  TRUE, FALSE, 12, 7,
  'bundle', 'any'
)
ON CONFLICT (product_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  discount_yearly_percent = EXCLUDED.discount_yearly_percent,
  is_active = EXCLUDED.is_active,
  is_popular = EXCLUDED.is_popular,
  sort_order = EXCLUDED.sort_order,
  trial_days = EXCLUDED.trial_days,
  plan_kind = EXCLUDED.plan_kind,
  account_type = EXCLUDED.account_type,
  updated_at = NOW();

-- Pacotes de storage recorrente (referência para checkout/UI)
INSERT INTO public.service_pricing (
  service_type, name, description, unit_amount, unit_label,
  cost_brl, price_brl, is_active, sort_order
)
SELECT v.service_type, v.name, v.description, v.unit_amount, v.unit_label,
       v.cost_brl, v.price_brl, v.is_active, v.sort_order
FROM (VALUES
  (
    'storage'::service_type_enum, 'Pacote Storage +10 GB/mês',
    'Add-on recorrente de armazenamento CDN EAD',
    10737418240::BIGINT, '10 GB', 14.50, 29.00, TRUE, 1
  ),
  (
    'storage'::service_type_enum, 'Pacote Storage +50 GB/mês',
    'Add-on recorrente de armazenamento CDN EAD',
    53687091200::BIGINT, '50 GB', 49.50, 99.00, TRUE, 2
  )
) AS v(service_type, name, description, unit_amount, unit_label, cost_brl, price_brl, is_active, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_pricing sp WHERE sp.name = v.name
);
