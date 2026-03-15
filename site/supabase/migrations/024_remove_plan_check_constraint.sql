-- =====================================================
-- SINCLA HUB - REMOVER CHECK CONSTRAINT DE PLANO
-- Migration: 024_remove_plan_check_constraint.sql
-- Data: 2026-03-15
-- =====================================================
-- PROBLEMA:
-- O campo `plan` da tabela `subscriptions` tinha um CHECK constraint
-- hardcoded com valores fixos ('starter', 'pro', 'business', 'enterprise').
-- Porém, os planos são definidos DINAMICAMENTE na tabela `product_plans`,
-- e cada produto pode ter planos com nomes diferentes (ex: 'free', 'team').
-- Isso causa erro 23514 ao tentar assinar produtos com planos fora da lista.
--
-- SOLUÇÃO:
-- Remover o CHECK constraint e confiar na FK `plan_id` (já existente)
-- como validação estrutural. O campo `plan` VARCHAR permanece como
-- referência textual sem restrição rígida.
-- =====================================================

-- Remover constraint antiga (nome gerado automaticamente pelo PostgreSQL)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

-- Comentário para documentação
COMMENT ON COLUMN subscriptions.plan IS 'Slug do plano (referência textual). Validação real pela FK plan_id → product_plans.';
