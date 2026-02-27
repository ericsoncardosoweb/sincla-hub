-- =====================================================
-- FIX: Recursão Infinita nas Policies de company_members
-- Migration: 006_fix_rls_recursion.sql
-- Data: 2026-02-23
-- Problema: As policies "Users view company members" e 
--           "Admins manage company members" faziam subquery
--           na própria tabela company_members, causando
--           recursão infinita no RLS do Supabase.
-- Solução: Usar user_id = auth.uid() diretamente na policy
--           de SELECT, e subscriber_id check via companies
--           para a policy de admin.
-- =====================================================

-- Drop das policies problemáticas
DROP POLICY IF EXISTS "Users view company members" ON company_members;
DROP POLICY IF EXISTS "Admins manage company members" ON company_members;

-- Nova policy de SELECT: usuário vê membros onde ele próprio é membro
-- Usa user_id = auth.uid() diretamente para evitar recursão
CREATE POLICY "Users view company members" ON company_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR company_id IN (
            SELECT id FROM companies WHERE subscriber_id = auth.uid()
        )
    );

-- Nova policy de ALL para admins: verifica via tabela companies (sem recursão)
CREATE POLICY "Admins manage company members" ON company_members
    FOR ALL USING (
        company_id IN (
            SELECT id FROM companies WHERE subscriber_id = auth.uid()
        )
        OR user_id = auth.uid()
    );
