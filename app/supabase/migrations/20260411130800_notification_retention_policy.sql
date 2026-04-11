-- Habilitar extensão pg_cron caso ainda não esteja ativa
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Remover setup anterior de forma tolerante a erros
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-notifications');
EXCEPTION
  WHEN OTHERS THEN
    -- Ignorar erro caso não exista ainda
END $$;

-- Agendar limpeza automática todo dia às 3:00 da manhã (servidor local)
-- Isso varrerá todas as notificações e logs que tenham mais de 15 dias para poupar infra
SELECT cron.schedule('cleanup-old-notifications', '0 3 * * *', $$
    DELETE FROM public.notifications WHERE created_at < now() - interval '15 days';
    DELETE FROM public.notification_logs WHERE created_at < now() - interval '15 days';
$$);
