-- Dados oficiais JUCESP (Certidão de Inteiro Teor, set/2026)
-- Nome: SINCLA TECNOLOGIA E DESENVOLVIMENTO LTDA
-- CNPJ: 69.002.013/0001-04 | NIRE: 35251054607

UPDATE public.platform_settings
SET value = 'Sincla Tecnologia e Desenvolvimento Ltda', updated_at = now()
WHERE key = 'empresa_nome';

UPDATE public.platform_settings
SET value = '69.002.013/0001-04', updated_at = now()
WHERE key = 'empresa_cnpj';

INSERT INTO public.platform_settings (key, value, description)
VALUES ('empresa_nire', '35251054607', 'NIRE — Junta Comercial SP')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();

INSERT INTO public.platform_settings (key, value, description)
VALUES ('empresa_tipo_juridico', 'Limitada Unipessoal (M.E.)', 'Tipo jurídico')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();
