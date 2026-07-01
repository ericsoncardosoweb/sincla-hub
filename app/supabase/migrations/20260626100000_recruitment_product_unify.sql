-- Fase 0 Recrutamento: unificar product_id vagas → recrutamento no Hub
-- Reversível: manter backup das assinaturas antes de aplicar em produção.

-- 1) base_url relativo para SmartAccess (cross-auth monta /vagas/smart-access)
UPDATE public.products
SET base_url = '/vagas',
    name = 'Sincla Recrutamento',
    brand_color = '#8b5cf6',
    is_active = true
WHERE id = 'recrutamento';

-- 2) Migrar assinaturas legadas (vagas → recrutamento) quando não houver conflito
UPDATE public.subscriptions s
SET product_id = 'recrutamento'
WHERE s.product_id = 'vagas'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s2
    WHERE s2.company_id = s.company_id
      AND s2.product_id = 'recrutamento'
      AND s2.id <> s.id
  );

-- 3) member_product_access legado
UPDATE public.member_product_access mpa
SET product_id = 'recrutamento'
WHERE mpa.product_id = 'vagas'
  AND NOT EXISTS (
    SELECT 1 FROM public.member_product_access m2
    WHERE m2.company_member_id = mpa.company_member_id
      AND m2.product_id = 'recrutamento'
      AND m2.id <> mpa.id
  );

-- 4) Desativar produto duplicado no catálogo
UPDATE public.products
SET is_active = false
WHERE id = 'vagas';

-- 5) Planos: desativar planos do product_id legado (mantém histórico)
UPDATE public.product_plans
SET is_active = false
WHERE product_id = 'vagas';
