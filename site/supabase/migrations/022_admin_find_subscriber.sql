-- =====================================================
-- SINCLA HUB - MIGRATION 022
-- RPC para busca de subscriber por email (admin only)
-- =====================================================
-- Problema: A busca de subscribers por email na página de Admins
-- é bloqueada pela RLS (subscribers.id = auth.uid()).
-- A policy "Admins can view all subscribers" depende de is_admin_user()
-- mas o método ilike/eq do Supabase JS retorna 406 em certas condições.
-- Solução: RPC SECURITY DEFINER que verifica se o caller é admin
-- e retorna o subscriber pelo email.
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_find_subscriber_by_email(p_email TEXT)
RETURNS TABLE (id UUID, email VARCHAR, name VARCHAR, avatar_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar se o caller é admin
    IF NOT is_admin_user() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem usar esta função.';
    END IF;

    RETURN QUERY
    SELECT s.id, s.email, s.name, s.avatar_url
    FROM subscribers s
    WHERE LOWER(s.email) = LOWER(p_email)
    LIMIT 1;
END;
$$;
