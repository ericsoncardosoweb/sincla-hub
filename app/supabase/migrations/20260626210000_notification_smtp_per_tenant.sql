-- ============================================================================
-- SMTP / WhatsApp por empresa (tenant) — reusa notification_settings
-- ----------------------------------------------------------------------------
-- A tabela notification_settings já tinha custom_smtp_* e custom_whatsapp_*.
-- Aqui completamos os campos que faltavam (porta, TLS, reply-to e estado de
-- verificação) e endurecemos a segurança das credenciais:
--   * SELECT cru da tabela passa a ser SOMENTE owner/admin (a senha SMTP é um
--     segredo; membros comuns não precisam ler esta tabela).
--   * Frontend lê via RPC mascarada (get_company_notification_settings) que
--     NUNCA devolve senha/token — apenas se estão configurados.
--   * Edge functions usam service_role (ignoram RLS) para enviar de fato.
-- ============================================================================

-- 1) Campos que faltavam para um SMTP completo + estado de verificação
ALTER TABLE public.notification_settings
    ADD COLUMN IF NOT EXISTS custom_smtp_port     integer,
    ADD COLUMN IF NOT EXISTS custom_smtp_secure   boolean     NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS custom_smtp_reply_to text,
    ADD COLUMN IF NOT EXISTS smtp_verified        boolean     NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS smtp_verified_at     timestamptz,
    ADD COLUMN IF NOT EXISTS smtp_last_error      text;

-- 2) Restringe leitura crua a owner/admin (credenciais são segredo)
DROP POLICY IF EXISTS notification_settings_select ON public.notification_settings;
CREATE POLICY notification_settings_select ON public.notification_settings
    FOR SELECT
    USING (
        company_id IN (
            SELECT c.id
            FROM public.companies c
            JOIN public.company_members cm ON cm.company_id = c.id
            WHERE cm.user_id = auth.uid()
              AND cm.role IN ('owner', 'admin')
        )
    );

-- 3) Leitura mascarada para o frontend: sem senha/token, só flags "set".
CREATE OR REPLACE FUNCTION public.get_company_notification_settings(p_company_id uuid)
RETURNS TABLE (
    company_id            uuid,
    email_enabled         boolean,
    in_app_enabled        boolean,
    custom_smtp_host      text,
    custom_smtp_port      integer,
    custom_smtp_secure    boolean,
    custom_smtp_user      text,
    custom_smtp_from      text,
    custom_smtp_from_name text,
    custom_smtp_reply_to  text,
    smtp_password_set     boolean,
    smtp_verified         boolean,
    smtp_verified_at      timestamptz,
    smtp_last_error       text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
    SELECT
        ns.company_id,
        ns.email_enabled,
        ns.in_app_enabled,
        ns.custom_smtp_host,
        ns.custom_smtp_port,
        ns.custom_smtp_secure,
        ns.custom_smtp_user,
        ns.custom_smtp_from,
        ns.custom_smtp_from_name,
        ns.custom_smtp_reply_to,
        (ns.custom_smtp_password IS NOT NULL AND ns.custom_smtp_password <> '') AS smtp_password_set,
        ns.smtp_verified,
        ns.smtp_verified_at,
        ns.smtp_last_error
    FROM public.notification_settings ns
    WHERE ns.company_id = p_company_id
      AND EXISTS (
          SELECT 1
          FROM public.company_members cm
          WHERE cm.company_id = p_company_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin')
      );
$$;

REVOKE ALL ON FUNCTION public.get_company_notification_settings(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_company_notification_settings(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_company_notification_settings(uuid) IS
    'Leitura mascarada de notification_settings (sem senha/token) para o painel. Apenas owner/admin da empresa.';
