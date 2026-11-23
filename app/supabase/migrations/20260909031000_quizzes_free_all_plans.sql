-- Quizzes passam a ser recurso base (todos os planos EAD)
-- Engajamento fica só com comunidade + gamificação

UPDATE public.plans
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{features,quizzes_advanced}',
  'true'::jsonb,
  true
)
WHERE product_slug = 'ead'
  AND code IN ('ead-pf', 'ead-pj', 'ead-engajamento', 'ead-completo');

-- Se a estrutura for features direto (sem nest):
UPDATE public.plans
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{quizzes_advanced}',
  'true'::jsonb,
  true
)
WHERE product_slug = 'ead'
  AND code IN ('ead-pf', 'ead-pj')
  AND features ? 'quizzes_advanced';
