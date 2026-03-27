-- =====================================================
-- SINCLA HUB - MIGRATION 031
-- Fix: Admin pode visualizar companies e subscriptions de todos
-- Data: 2026-03-26
-- =====================================================

-- 1. Companies: admin pode ver todas
DROP POLICY IF EXISTS "Users view own companies" ON companies;
CREATE POLICY "companies_select" ON companies
    FOR SELECT USING (
        subscriber_id = auth.uid()
        OR id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
        OR is_admin_user()
    );

-- Manter policies de INSERT/UPDATE existentes
DROP POLICY IF EXISTS "Users can create companies" ON companies;
CREATE POLICY "companies_insert" ON companies
    FOR INSERT WITH CHECK (subscriber_id = auth.uid() OR is_admin_user());

DROP POLICY IF EXISTS "Users can update own companies" ON companies;
CREATE POLICY "companies_update" ON companies
    FOR UPDATE USING (
        subscriber_id = auth.uid()
        OR id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
        OR is_admin_user()
    );

-- 2. Subscriptions: admin pode ver todas
DROP POLICY IF EXISTS "Users view company subscriptions" ON subscriptions;
CREATE POLICY "subscriptions_select" ON subscriptions
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
        OR is_admin_user()
    );

-- Admin pode gerenciar subscriptions
DROP POLICY IF EXISTS "subscriptions_admin_manage" ON subscriptions;
CREATE POLICY "subscriptions_admin_manage" ON subscriptions
    FOR ALL USING (is_admin_user());
