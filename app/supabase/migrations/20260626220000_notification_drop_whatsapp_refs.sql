-- ============================================================================
-- Remove referências de WhatsApp adicionadas no recurso de SMTP por empresa.
-- Não há UI de disparo de WhatsApp; mantemos apenas o e-mail (SMTP) por tenant.
-- Idempotente: seguro para bancos novos (no-op) e para o banco já migrado.
-- ============================================================================

-- 1) Remove colunas de verificação de WhatsApp criadas pela migration anterior
ALTER TABLE public.notification_settings
    DROP COLUMN IF EXISTS whatsapp_verified,
    DROP COLUMN IF EXISTS whatsapp_verified_at;

-- 2) Recria a RPC mascarada SEM campos de WhatsApp (o tipo de retorno muda,
--    então é preciso DROP + CREATE)
DROP FUNCTION IF EXISTS public.get_company_notification_settings(uuid);

CREATE FUNCTION public.get_company_notification_settings(p_company_id uuid)
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
    'Leitura mascarada de notification_settings (sem senha) para o painel. Apenas owner/admin da empresa.';
