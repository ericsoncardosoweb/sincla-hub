-- Modo de conta (UI) + feature flag global de billing self-service

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'platform_settings'
    ) THEN
        INSERT INTO public.platform_settings (key, value, description)
        VALUES (
            'billing_enabled',
            'false'::jsonb,
            'Quando true, exibe KPIs financeiros, compra de créditos e self-service de planos no painel.'
        )
        ON CONFLICT (key) DO NOTHING;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_company_account_mode(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lifetime BOOLEAN;
    v_partner_id UUID;
    v_paid NUMERIC;
BEGIN
    SELECT COALESCE(lifetime_access, FALSE), partner_id
    INTO v_lifetime, v_partner_id
    FROM public.companies
    WHERE id = p_company_id;

    IF NOT FOUND THEN
        RETURN 'free_access';
    END IF;

    IF v_lifetime THEN
        RETURN 'lifetime';
    END IF;

    IF v_partner_id IS NOT NULL THEN
        RETURN 'partner';
    END IF;

    SELECT COALESCE(SUM(monthly_amount), 0)
    INTO v_paid
    FROM public.subscriptions
    WHERE company_id = p_company_id
      AND status IN ('active', 'trial')
      AND COALESCE(monthly_amount, 0) > 0;

    IF v_paid > 0 THEN
        RETURN 'billing_active';
    END IF;

    RETURN 'free_access';
END;
$$;

COMMENT ON FUNCTION public.get_company_account_mode IS
    'Retorna lifetime | partner | billing_active | free_access para layout adaptativo do painel.';

GRANT EXECUTE ON FUNCTION public.get_company_account_mode(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_account_mode(UUID) TO service_role;
