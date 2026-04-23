-- =============================================
-- Fix: get_subscriber_id_by_email — permission denied for table users
-- =============================================
-- O erro "permission denied for table users" ocorre porque algum componente
-- interno do Supabase (trigger ou função encadeada) tenta acessar auth.users
-- diretamente sem permissão. Esta migration recria a função de forma segura,
-- com SET search_path explícito e tratamento correto.

DROP FUNCTION IF EXISTS public.get_subscriber_id_by_email(TEXT);

CREATE OR REPLACE FUNCTION public.get_subscriber_id_by_email(p_email TEXT)
RETURNS TABLE(id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT s.id
    FROM public.subscribers s
    WHERE lower(s.email) = lower(p_email)
    LIMIT 1;
END;
$$;

-- Garantir grants corretos
GRANT EXECUTE ON FUNCTION public.get_subscriber_id_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_subscriber_id_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscriber_id_by_email(TEXT) TO service_role;

-- =============================================
-- FIM
-- =============================================
