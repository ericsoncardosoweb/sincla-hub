-- =====================================================
-- SINCLA HUB - MIGRATION 018
-- Adiciona política RLS para que Admins leiam 'subscribers'
-- =====================================================
-- Problema: A tabela 'subscribers' continha apenas a política 
-- "Users view own subscriber data", bloqueando que o Join do
-- Supabase ao buscar 'partners' retornasse o nome do parceiro
-- se ele não fosse o próprio admin visualizando a tabela.
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all subscribers" ON subscribers;
CREATE POLICY "Admins can view all subscribers" ON subscribers
    FOR SELECT USING (is_admin_user());
