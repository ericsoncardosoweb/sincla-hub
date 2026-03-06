-- ============================================================
-- FIX: Adicionar colunas action_url e action_label
-- Rodar ANTES de re-executar a migration 021 completa
-- ============================================================

-- Adicionar colunas faltantes na tabela notification_broadcasts
ALTER TABLE public.notification_broadcasts
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS action_label TEXT;

-- Verificação
SELECT column_name FROM information_schema.columns
WHERE table_name = 'notification_broadcasts'
AND column_name IN ('action_url', 'action_label');
