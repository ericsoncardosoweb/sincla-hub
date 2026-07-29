-- Permite login por CPF no Hub: resolve CPF → email do subscriber (anon-safe)
CREATE OR REPLACE FUNCTION public.resolve_cpf_to_email(p_cpf TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf TEXT;
  v_email TEXT;
BEGIN
  v_cpf := regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g');
  IF length(v_cpf) <> 11 THEN
    RETURN NULL;
  END IF;

  SELECT s.email INTO v_email
  FROM public.subscribers s
  WHERE regexp_replace(COALESCE(s.cpf_cnpj, ''), '\D', '', 'g') = v_cpf
    AND s.email IS NOT NULL
    AND length(trim(s.email)) > 0
  LIMIT 1;

  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_cpf_to_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_cpf_to_email(TEXT) TO anon, authenticated;
