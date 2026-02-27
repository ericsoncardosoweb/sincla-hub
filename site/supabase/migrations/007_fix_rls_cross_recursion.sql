-- =====================================================
-- FIX: Recursão Cruzada entre companies e company_members
-- Migration: 007_fix_rls_cross_recursion.sql
-- Data: 2026-02-23
--
-- Problema: As policies de companies consultam company_members
--           e vice-versa, criando recursão cruzada infinita.
-- Solução: Criar uma função SECURITY DEFINER que bypassa RLS
--           para retornar os company_ids do usuário autenticado.
-- =====================================================

-- 1. Função auxiliar SECURITY DEFINER (bypassa RLS, sem recursão)
CREATE OR REPLACE FUNCTION public.get_my_company_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id FROM company_members WHERE user_id = auth.uid();
$$;

-- 2. Recriar TODAS as policies que usavam subquery em company_members

-- === companies ===
DROP POLICY IF EXISTS "Users view own companies" ON companies;
CREATE POLICY "Users view own companies" ON companies
    FOR SELECT USING (
        id IN (SELECT get_my_company_ids())
        OR subscriber_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update own companies" ON companies;
CREATE POLICY "Users can update own companies" ON companies
    FOR UPDATE USING (
        subscriber_id = auth.uid()
        OR id IN (SELECT get_my_company_ids())
    );

-- === company_members ===
DROP POLICY IF EXISTS "Users view company members" ON company_members;
CREATE POLICY "Users view company members" ON company_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR company_id IN (SELECT get_my_company_ids())
    );

DROP POLICY IF EXISTS "Admins manage company members" ON company_members;
CREATE POLICY "Admins manage company members" ON company_members
    FOR ALL USING (
        user_id = auth.uid()
        OR company_id IN (SELECT get_my_company_ids())
    );

-- === subscriptions ===
DROP POLICY IF EXISTS "Users view company subscriptions" ON subscriptions;
CREATE POLICY "Users view company subscriptions" ON subscriptions
    FOR SELECT USING (
        company_id IN (SELECT get_my_company_ids())
    );

-- === member_product_access ===
DROP POLICY IF EXISTS "Users view member access" ON member_product_access;
CREATE POLICY "Users view member access" ON member_product_access
    FOR SELECT USING (
        company_member_id IN (
            SELECT id FROM company_members WHERE user_id = auth.uid()
        )
    );

-- === contacts ===
DROP POLICY IF EXISTS "Users view company contacts" ON contacts;
CREATE POLICY "Users view company contacts" ON contacts
    FOR SELECT USING (
        company_id IN (SELECT get_my_company_ids())
    );

DROP POLICY IF EXISTS "Users manage company contacts" ON contacts;
CREATE POLICY "Users manage company contacts" ON contacts
    FOR ALL USING (
        company_id IN (SELECT get_my_company_ids())
    );

-- === sync_settings ===
DROP POLICY IF EXISTS "Users view sync settings" ON sync_settings;
CREATE POLICY "Users view sync settings" ON sync_settings
    FOR SELECT USING (
        company_id IN (SELECT get_my_company_ids())
    );

DROP POLICY IF EXISTS "Admins manage sync settings" ON sync_settings;
CREATE POLICY "Admins manage sync settings" ON sync_settings
    FOR ALL USING (
        company_id IN (SELECT get_my_company_ids())
    );

-- === sync_logs ===
DROP POLICY IF EXISTS "Users view sync logs" ON sync_logs;
CREATE POLICY "Users view sync logs" ON sync_logs
    FOR SELECT USING (
        company_id IN (SELECT get_my_company_ids())
    );

-- === api_tokens ===
DROP POLICY IF EXISTS "Users view api tokens" ON api_tokens;
CREATE POLICY "Users view api tokens" ON api_tokens
    FOR SELECT USING (
        company_id IN (SELECT get_my_company_ids())
    );

DROP POLICY IF EXISTS "Admins manage api tokens" ON api_tokens;
CREATE POLICY "Admins manage api tokens" ON api_tokens
    FOR ALL USING (
        company_id IN (SELECT get_my_company_ids())
    );
