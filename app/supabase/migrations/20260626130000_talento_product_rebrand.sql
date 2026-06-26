-- Rebrand: Sincla Recrutamento → Sincla Talento (product_id talento, base_url /talento)

INSERT INTO public.products (
  id, name, description, icon, base_url, is_active, brand_color, sort_order, commission_percent, user_model
)
SELECT
  'talento',
  'Sincla Talento',
  COALESCE(description, 'Atração e seleção de talentos'),
  COALESCE(icon, 'IconBriefcase'),
  '/talento',
  true,
  COALESCE(brand_color, '#8b5cf6'),
  COALESCE(sort_order, 2),
  COALESCE(commission_percent, 10.00),
  COALESCE(user_model, 'b2b')
FROM public.products
WHERE id = 'recrutamento'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = true;

-- Empresas com recrutamento + vagas: remove assinatura legada vagas antes de unificar
DELETE FROM public.subscriptions s
WHERE s.product_id = 'vagas'
  AND EXISTS (
    SELECT 1 FROM public.subscriptions s2
    WHERE s2.company_id = s.company_id
      AND s2.product_id = 'recrutamento'
  );

UPDATE public.subscriptions
SET product_id = 'talento'
WHERE product_id IN ('recrutamento', 'vagas');

DELETE FROM public.member_product_access mpa
WHERE mpa.product_id = 'vagas'
  AND EXISTS (
    SELECT 1 FROM public.member_product_access m2
    WHERE m2.company_member_id = mpa.company_member_id
      AND m2.product_id = 'recrutamento'
  );

UPDATE public.member_product_access
SET product_id = 'talento'
WHERE product_id IN ('recrutamento', 'vagas');

UPDATE public.product_plans
SET product_id = 'talento'
WHERE product_id IN ('recrutamento', 'vagas');

UPDATE public.products
SET is_active = false
WHERE id IN ('recrutamento', 'vagas');
