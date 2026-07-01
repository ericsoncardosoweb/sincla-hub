-- Hub — Vincular empresa a um afiliado (parceiro) ativo
-- Usado no cadastro manual (onboarding) e para atribuir empresas existentes a um afiliado.

CREATE OR REPLACE FUNCTION public.admin_set_company_partner(
  p_company_id UUID,
  p_partner_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Acesso negado: requer privilégios de administrador.';
  END IF;

  -- p_partner_id NULL desvincula; caso contrário precisa ser um afiliado ativo
  IF p_partner_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.partners WHERE id = p_partner_id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Afiliado inválido ou inativo';
    END IF;
  END IF;

  UPDATE public.companies
  SET partner_id = p_partner_id,
      updated_at = NOW()
  WHERE id = p_company_id;
END;
$$;

COMMENT ON FUNCTION public.admin_set_company_partner IS
  'Vincula/desvincula uma empresa a um afiliado ativo (admin-gated).';

REVOKE ALL ON FUNCTION public.admin_set_company_partner(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_company_partner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_company_partner(UUID, UUID) TO service_role;
