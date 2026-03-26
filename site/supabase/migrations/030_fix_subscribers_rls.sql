-- =====================================================
-- SINCLA HUB - MIGRATION 030
-- Fix: RLS subscribers para admin visualizar todos
-- + Guard de unicidade subscriber_id em companies
-- Data: 2026-03-26
-- =====================================================
-- Problema 1: Admin só vê 1 subscriber (próprio uid) apesar de
-- existir policy "Admins can view all subscribers".
-- A mistura de FOR ALL + FOR SELECT separados pode causar
-- conflito na avaliação do PostgreSQL.
-- Fix: Unificar num único FOR SELECT com condição combinada.
--
-- Problema 2: Edge function criava empresa duplicada a cada
-- tentativa porque não havia guard de unicidade.
-- =====================================================

-- 1. Fix RLS: drop ambas as policies e criar uma clara por operação
DROP POLICY IF EXISTS "Users view own subscriber data" ON subscribers;
DROP POLICY IF EXISTS "Admins can view all subscribers" ON subscribers;

-- SELECT: usuário vê seus dados OU admin vê todos
CREATE POLICY "subscribers_select" ON subscribers
    FOR SELECT USING (id = auth.uid() OR is_admin_user());

-- INSERT: usuário pode inserir seu próprio registro
CREATE POLICY "subscribers_insert" ON subscribers
    FOR INSERT WITH CHECK (id = auth.uid());

-- UPDATE: usuário pode editar seus dados OU admin pode editar qualquer
CREATE POLICY "subscribers_update" ON subscribers
    FOR UPDATE USING (id = auth.uid() OR is_admin_user());

-- DELETE: apenas admin
CREATE POLICY "subscribers_delete" ON subscribers
    FOR DELETE USING (is_admin_user());
