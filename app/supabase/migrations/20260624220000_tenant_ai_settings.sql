-- Hub — Configuração do motor de IA por empresa (tenant)
-- Define qual provedor de IA cada empresa usa. Por enquanto só o motor da Sincla
-- (OpenAI, chave em Edge Function Secret OPENAI_API_KEY). BYOK (traga sua própria
-- chave de OpenAI/Gemini/Anthropic) fica reservado para uma fase futura — por isso
-- NÃO armazenamos chave de API nesta tabela ainda.

CREATE TABLE IF NOT EXISTS public.tenant_ai_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
    -- Liga/desliga geração de insights com IA para a empresa
    ai_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
    -- 'sincla' = usa o motor padrão da Sincla (OpenAI). Demais reservados para BYOK.
    provider    TEXT NOT NULL DEFAULT 'sincla'
                CHECK (provider IN ('sincla', 'openai', 'gemini', 'anthropic')),
    -- Modelo preferido (NULL = padrão do provedor)
    model       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_ai_settings IS
  'Configuração do motor de IA por empresa (tenant). Chaves BYOK ainda não são armazenadas aqui.';

ALTER TABLE public.tenant_ai_settings ENABLE ROW LEVEL SECURITY;

-- Membros ativos da empresa podem LER a configuração
DROP POLICY IF EXISTS tenant_ai_settings_select ON public.tenant_ai_settings;
CREATE POLICY tenant_ai_settings_select ON public.tenant_ai_settings
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = tenant_ai_settings.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
    )
  );

-- Owners/admins da empresa podem CRIAR a configuração
DROP POLICY IF EXISTS tenant_ai_settings_insert ON public.tenant_ai_settings;
CREATE POLICY tenant_ai_settings_insert ON public.tenant_ai_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = tenant_ai_settings.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
        AND cm.role IN ('owner', 'admin')
    )
  );

-- Owners/admins da empresa podem ATUALIZAR a configuração
DROP POLICY IF EXISTS tenant_ai_settings_update ON public.tenant_ai_settings;
CREATE POLICY tenant_ai_settings_update ON public.tenant_ai_settings
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = tenant_ai_settings.company_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
        AND cm.role IN ('owner', 'admin')
    )
  );

-- Mantém updated_at em dia
CREATE OR REPLACE FUNCTION public.tg_tenant_ai_settings_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_ai_settings_touch ON public.tenant_ai_settings;
CREATE TRIGGER trg_tenant_ai_settings_touch
  BEFORE UPDATE ON public.tenant_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_tenant_ai_settings_touch();
