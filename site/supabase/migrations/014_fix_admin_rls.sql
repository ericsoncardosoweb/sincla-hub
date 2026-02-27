-- =====================================================
-- SINCLA HUB - MIGRATION 014
-- Corrige Vulnerabilidade RLS de Recursão Infinita em admin_users
-- =====================================================

-- 1. SECURITY DEFINER FUNCTION
-- Ignora o RLS e confere a tabela base isolada
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND is_active = true
  );
END;
$$;

-- 2. ATUALIZAR TABELA DE admin_users (002)
DROP POLICY IF EXISTS "Only admins can view admin users" ON admin_users;
CREATE POLICY "Only admins can view admin users" ON admin_users
    FOR SELECT USING (is_admin_user());

-- 3. ATUALIZAR TABELA partners e partner_commissions (003)
DROP POLICY IF EXISTS "Admins view all partners" ON partners;
CREATE POLICY "Admins view all partners" ON partners
    FOR SELECT USING (is_admin_user());

DROP POLICY IF EXISTS "Admins manage partners" ON partners;
CREATE POLICY "Admins manage partners" ON partners
    FOR ALL USING (is_admin_user());

DROP POLICY IF EXISTS "Admins manage commissions" ON partner_commissions;
CREATE POLICY "Admins manage commissions" ON partner_commissions
    FOR ALL USING (is_admin_user());

-- 4. ATUALIZAR TABELA partner_withdrawals (004)
DROP POLICY IF EXISTS "Admins manage withdrawals" ON partner_withdrawals;
CREATE POLICY "Admins manage withdrawals" ON partner_withdrawals
    FOR ALL USING (is_admin_user());

-- 5. ATUALIZAR TABELAS DE SERVIDORES EXTERNOS (005)
DROP POLICY IF EXISTS "Admins can manage servers" ON external_servers;
CREATE POLICY "Admins can manage servers" ON external_servers
    FOR ALL USING (is_admin_user());
