-- Gatilho de promote RH: manual ou ao mover para etapa Contratado no pipeline

ALTER TABLE public.company_talento_rh_integration
    ADD COLUMN IF NOT EXISTS promote_gatilho TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.company_talento_rh_integration
    DROP CONSTRAINT IF EXISTS company_talento_rh_promote_gatilho_check;

ALTER TABLE public.company_talento_rh_integration
    ADD CONSTRAINT company_talento_rh_promote_gatilho_check
    CHECK (promote_gatilho IN ('manual', 'etapa_contratado'));

COMMENT ON COLUMN public.company_talento_rh_integration.promote_gatilho IS
    'manual = botão/modal de contratar; etapa_contratado = ao arrastar card para coluna Contratado';
