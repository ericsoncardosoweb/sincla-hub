-- Ajuste base_url do produto recrutamento: path da app = /vagas (não /recrutamento)
UPDATE public.products
SET base_url = '/vagas'
WHERE id = 'recrutamento';
