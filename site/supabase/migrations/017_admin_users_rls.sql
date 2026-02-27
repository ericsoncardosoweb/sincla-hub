-- =====================================================
-- SINCLA HUB - MIGRATION 017
-- Permissões RLS para Gestão de Administradores
-- =====================================================
-- Problema: A tabela admin_users possuía apenas a política "FOR SELECT",
-- o que impedia que administradores adicionassem ou removessem outros
-- administradores pelo painel (falha silenciosa de RLS no INSERT/UPDATE).
-- Esta migration cria as políticas CRUD completas para a tabela.
-- =====================================================

-- 1. Permite que administradores insiram novos admins
DROP POLICY IF EXISTS "Admins can insert admin users" ON admin_users;
CREATE POLICY "Admins can insert admin users" ON admin_users
    FOR INSERT WITH CHECK (is_admin_user());

-- 2. Permite que administradores atualizem admins existentes (ex: ativar/desativar)
DROP POLICY IF EXISTS "Admins can update admin users" ON admin_users;
CREATE POLICY "Admins can update admin users" ON admin_users
    FOR UPDATE USING (is_admin_user());

-- 3. Permite que administradores deletem admins (se necessário logicamente)
DROP POLICY IF EXISTS "Admins can delete admin users" ON admin_users;
CREATE POLICY "Admins can delete admin users" ON admin_users
    FOR DELETE USING (is_admin_user());

-- 4. BOOTSTRAP: Garantir que o email principal do sistema seja Super Admin
-- Isso resolve automaticamente o problema de acesso ao painel Master sem precisar de script manual.
INSERT INTO public.admin_users (id, email, name, role, is_active)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', 'Administrador'), 'super_admin', true
FROM auth.users
WHERE email = 'ericson.cardoso10@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET is_active = true, role = 'super_admin';
