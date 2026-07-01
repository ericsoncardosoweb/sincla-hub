-- Agenda diária (04:00 UTC) do stream-bandwidth-sync (estimativa de banda por empresa).
-- Usa a anon key (chave pública) no header; a função usa service_role internamente.
-- cron.schedule faz upsert por jobname (idempotente).

SELECT cron.schedule(
    'stream-bandwidth-sync-daily',
    '0 4 * * *',
    $cron$
    SELECT net.http_post(
        url     := 'https://igwjtvdanulrwntdyfbt.supabase.co/functions/v1/stream-bandwidth-sync',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.hub_anon_key', true),
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    );
    $cron$
);

-- Nota: em produção o job foi criado com a anon key literal (chave pública do Hub).
-- Para reaplicar via migration, defina antes:  SET app.hub_anon_key = '<anon_key>';
