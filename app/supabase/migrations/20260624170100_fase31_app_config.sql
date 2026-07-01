-- Fase 3.1 — Tabela de config server-side (genérica), RLS habilitada e SEM policies:
-- anon/authenticated não leem; só o service_role (Edge Functions) acessa.
-- Observação: a chave do Bunny ficou em Edge Function Secrets (BUNNY_STREAM_API_KEY,
-- BUNNY_STREAM_LIBRARY_ID), não nesta tabela. Mantida para uso futuro de config.

CREATE TABLE IF NOT EXISTS public.app_config (
    key        text PRIMARY KEY,
    value      text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
