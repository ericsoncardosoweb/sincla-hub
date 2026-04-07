-- =============================================
-- Fix: Criar função get_subscriber_id_by_email no Hub
-- =============================================
-- Executar no SQL Editor do Supabase do Hub
-- Contexto: Team.tsx chama supabase.rpc('get_subscriber_id_by_email', { p_email })
-- mas a função nunca foi criada. Isso causa o erro:
-- "Could not find the function public.get_subscriber_id_by_email(p_email)"

-- SECURITY DEFINER: necessário para bypassar RLS na tabela subscribers
-- (o chamador pode não ter visibilidade de todos os subscribers)
CREATE OR REPLACE FUNCTION public.get_subscriber_id_by_email(p_email TEXT)
RETURNS TABLE(id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT s.id FROM public.subscribers s WHERE s.email = p_email LIMIT 1;
$$;

-- Garantir que o anon role pode chamar a função
GRANT EXECUTE ON FUNCTION public.get_subscriber_id_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_subscriber_id_by_email(TEXT) TO authenticated;

-- =============================================
-- FIM
-- =============================================
