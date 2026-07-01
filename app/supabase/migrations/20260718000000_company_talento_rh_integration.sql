-- Hub — Integração Sincla Talento ↔ Sincla RH (toggle por assinante)

CREATE TABLE IF NOT EXISTS public.company_talento_rh_integration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    auto_promote_rh BOOLEAN NOT NULL DEFAULT TRUE,
    sync_cultura_auto BOOLEAN NOT NULL DEFAULT TRUE,
    promote_exige_confirmacao BOOLEAN NOT NULL DEFAULT TRUE,
    synced_to_talento_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.company_talento_rh_integration IS
  'Configuração Hub da ponte Talento↔RH. Requer assinaturas ativas de talento e rh.';

ALTER TABLE public.company_talento_rh_integration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_talento_rh_select ON public.company_talento_rh_integration;
CREATE POLICY company_talento_rh_select ON public.company_talento_rh_integration
    FOR SELECT TO authenticated
    USING (
        public.is_admin_user()
        OR EXISTS (
            SELECT 1 FROM public.company_members cm
            WHERE cm.company_id = company_talento_rh_integration.company_id
              AND cm.user_id = auth.uid()
              AND cm.status = 'active'
        )
    );

DROP POLICY IF EXISTS company_talento_rh_insert ON public.company_talento_rh_integration;
CREATE POLICY company_talento_rh_insert ON public.company_talento_rh_integration
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin_user()
        OR EXISTS (
            SELECT 1 FROM public.company_members cm
            WHERE cm.company_id = company_talento_rh_integration.company_id
              AND cm.user_id = auth.uid()
              AND cm.status = 'active'
              AND cm.role IN ('owner', 'admin')
        )
    );

DROP POLICY IF EXISTS company_talento_rh_update ON public.company_talento_rh_integration;
CREATE POLICY company_talento_rh_update ON public.company_talento_rh_integration
    FOR UPDATE TO authenticated
    USING (
        public.is_admin_user()
        OR EXISTS (
            SELECT 1 FROM public.company_members cm
            WHERE cm.company_id = company_talento_rh_integration.company_id
              AND cm.user_id = auth.uid()
              AND cm.status = 'active'
              AND cm.role IN ('owner', 'admin')
        )
    );

CREATE OR REPLACE FUNCTION public.tg_company_talento_rh_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_talento_rh_touch ON public.company_talento_rh_integration;
CREATE TRIGGER trg_company_talento_rh_touch
    BEFORE UPDATE ON public.company_talento_rh_integration
    FOR EACH ROW EXECUTE FUNCTION public.tg_company_talento_rh_touch();
