-- =====================================================
-- SINCLA HUB - MIGRATION 035
-- RPC para consulta de usuário por email para envio de convites
-- =====================================================
-- Problema: No painel do Hub, ao tentar convidar um usuário
-- existente para a empresa, a consulta na tabela "subscribers" 
-- falha pois a RLS bloqueia, retornando nulo, o que leva  
-- a tentar um signUp, gerando "User already registered".
-- Solução: RPC SECURITY DEFINER que permite retornar apenas
-- o ID caso o email já esteja registrado no sistema.
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_subscriber_id_by_email(p_email TEXT)
RETURNS TABLE (id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id
    FROM subscribers s
    WHERE LOWER(s.email) = LOWER(p_email)
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscriber_id_by_email(TEXT) TO authenticated;
