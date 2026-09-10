-- EAD: novos preços (infoprodutor 187/497, empresa 597) + desconto contratação dupla 15%
-- Storage extra continua pay-as-you-go (não diferencia planos só por GB).

-- ---------------------------------------------------------------------------
-- 1. Infoprodutor Start (PF) — R$ 187
-- ---------------------------------------------------------------------------
UPDATE public.product_plans
SET
  name = 'EAD Infoprodutor',
  description = 'Para pessoa física começando a vender cursos. Cursos e alunos ilimitados. Extra de storage cobrado à parte.',
  features = to_jsonb(ARRAY[
    'Cursos e alunos ilimitados',
    'Certificados e checkout integrado',
    'Storage base incluído (extra à parte)',
    'Taxa de 5,99% sobre vendas',
    'IA com créditos ou chave OpenAI própria'
  ]),
  limits = jsonb_build_object(
    'account_type', 'pf',
    'unlimited_courses', true,
    'unlimited_students', true,
    'storage_gb', 25,
    'bandwidth_gb', 100,
    'transaction_fee_percent', 5.99,
    'features', jsonb_build_object(
      'community', false,
      'gamification', false,
      'quizzes_advanced', true,
      'custom_domain', false,
      'api', false,
      'webhooks', false,
      'automations', false
    )
  ),
  price_monthly = 187.00,
  price_yearly = 1860.00,
  discount_yearly_percent = 17,
  is_active = TRUE,
  is_popular = FALSE,
  sort_order = 1,
  plan_kind = 'base',
  account_type = 'pf',
  updated_at = NOW()
WHERE product_id = 'ead' AND slug = 'ead-pf';

-- ---------------------------------------------------------------------------
-- 2. Infoprodutor Pro (PF) — R$ 497
-- ---------------------------------------------------------------------------
INSERT INTO public.product_plans (
  product_id, name, slug, description, features, limits,
  price_monthly, price_yearly, discount_yearly_percent,
  is_active, is_popular, sort_order, trial_days,
  plan_kind, account_type
) VALUES (
  'ead',
  'EAD Infoprodutor Pro',
  'ead-pf-pro',
  'Para infoprodutores em escala. Comunidade, gamificação e domínio próprio. Storage extra à parte.',
  to_jsonb(ARRAY[
    'Tudo do Infoprodutor',
    'Comunidade e gamificação',
    'Domínio personalizado',
    'Taxa de 4,99% sobre vendas',
    'Prioridade em suporte'
  ]),
  '{
    "account_type": "pf",
    "unlimited_courses": true,
    "unlimited_students": true,
    "storage_gb": 50,
    "bandwidth_gb": 250,
    "transaction_fee_percent": 4.99,
    "features": {
      "community": true,
      "gamification": true,
      "quizzes_advanced": true,
      "custom_domain": true,
      "api": false,
      "webhooks": false,
      "automations": true
    }
  }'::JSONB,
  497.00, 4950.00, 17,
  TRUE, TRUE, 2, 14,
  'base', 'pf'
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

-- ---------------------------------------------------------------------------
-- 3. Empresa (PJ) — R$ 597 (list). Com outra ferramenta Sincla: 15% OFF na fatura.
-- ---------------------------------------------------------------------------
UPDATE public.product_plans
SET
  name = 'EAD Empresa',
  description = 'Para empresas (CNPJ). Treinamento corporativo. Storage e banda extras cobrados à parte.',
  features = to_jsonb(ARRAY[
    'Cursos e alunos ilimitados',
    'Multi-admin e suporte prioritário',
    'Taxa de 3,99% sobre vendas',
    'Integração Sincla RH',
    '15% OFF se já tiver outra ferramenta Sincla'
  ]),
  limits = jsonb_build_object(
    'account_type', 'pj',
    'unlimited_courses', true,
    'unlimited_students', true,
    'storage_gb', 50,
    'bandwidth_gb', 500,
    'transaction_fee_percent', 3.99,
    'features', jsonb_build_object(
      'community', false,
      'gamification', false,
      'quizzes_advanced', true,
      'custom_domain', false,
      'api', false,
      'webhooks', false,
      'automations', false
    )
  ),
  price_monthly = 597.00,
  price_yearly = 5940.00,
  discount_yearly_percent = 17,
  is_active = TRUE,
  is_popular = TRUE,
  sort_order = 3,
  plan_kind = 'base',
  account_type = 'pj',
  updated_at = NOW()
WHERE product_id = 'ead' AND slug = 'ead-pj';

-- ---------------------------------------------------------------------------
-- 4. Empresa Business (PJ) — R$ 997 (API, integrações, comunidade)
-- ---------------------------------------------------------------------------
INSERT INTO public.product_plans (
  product_id, name, slug, description, features, limits,
  price_monthly, price_yearly, discount_yearly_percent,
  is_active, is_popular, sort_order, trial_days,
  plan_kind, account_type
) VALUES (
  'ead',
  'EAD Empresa Business',
  'ead-pj-business',
  'Para empresas que precisam de API, integrações e comunidade. Storage extra à parte.',
  to_jsonb(ARRAY[
    'Tudo do EAD Empresa',
    'API e webhooks',
    'Integrações e automações',
    'Comunidade e gamificação',
    '15% OFF se já tiver outra ferramenta Sincla'
  ]),
  '{
    "account_type": "pj",
    "unlimited_courses": true,
    "unlimited_students": true,
    "storage_gb": 100,
    "bandwidth_gb": 1000,
    "transaction_fee_percent": 3.49,
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
  997.00, 9930.00, 17,
  TRUE, FALSE, 4, 14,
  'base', 'pj'
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

-- ---------------------------------------------------------------------------
-- 5. Config global: desconto de contratação paralela / dupla
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_rules (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::JSONB,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.billing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read billing_rules" ON public.billing_rules;
CREATE POLICY "Anyone authenticated can read billing_rules"
  ON public.billing_rules FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Admins manage billing_rules" ON public.billing_rules;
CREATE POLICY "Admins manage billing_rules"
  ON public.billing_rules FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

INSERT INTO public.billing_rules (key, value, description)
VALUES (
  'parallel_tool_discount',
  '{"percent": 15, "applies_to": "new_subscription_when_company_has_other_active_product"}'::JSONB,
  'Desconto automático na fatura ao contratar uma ferramenta adicional (contratação dupla/paralela).'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Helper: empresa já tem outra assinatura base ativa em produto diferente?
CREATE OR REPLACE FUNCTION public.company_has_other_active_product(
  p_company_id UUID,
  p_exclude_product_id VARCHAR
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.company_id = p_company_id
      AND s.product_id IS DISTINCT FROM p_exclude_product_id
      AND s.status IN ('active', 'trial')
  );
$$;

COMMENT ON FUNCTION public.company_has_other_active_product IS
  'True se a empresa já tem assinatura ativa em outro produto (elegível ao desconto 15%).';

GRANT EXECUTE ON FUNCTION public.company_has_other_active_product(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_has_other_active_product(UUID, VARCHAR) TO service_role;

CREATE OR REPLACE FUNCTION public.get_parallel_tool_discount_percent()
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((value->>'percent')::NUMERIC, 15)
  FROM public.billing_rules
  WHERE key = 'parallel_tool_discount';
$$;

GRANT EXECUTE ON FUNCTION public.get_parallel_tool_discount_percent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parallel_tool_discount_percent() TO service_role;
