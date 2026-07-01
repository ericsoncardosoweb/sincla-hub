-- Fase 0 / CS-1: Visibilidade do catalogo de produtos
-- ----------------------------------------------------
-- Objetivo: manter visiveis apenas os produtos prontos para venda
-- (RH, EAD, Recrutamento/R&S e Agenda). Os demais saem do catalogo
-- (DashboardHome / Onboarding listam products WHERE is_active = true).
--
-- REVERSIVEL: basta reativar com is_active = true.
-- NAO cancela assinaturas existentes (o join em Subscriptions.tsx
-- nao filtra por is_active), apenas remove do catalogo de novas vendas.

UPDATE public.products
SET is_active = false
WHERE id IN ('crm', 'leads', 'marketplace', 'intranet', 'vagas');

-- Garante que os 4 alvos estao ativos
UPDATE public.products
SET is_active = true
WHERE id IN ('rh', 'ead', 'recrutamento', 'agenda');
