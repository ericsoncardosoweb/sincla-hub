-- Fase 3.1 — Armazenamento de vídeo multi-tenant (Bunny) com Hub como fonte única.
-- Cada empresa tem uma Collection própria na library compartilhada; o Hub é dono do
-- mapa company->collection e do registro de cada vídeo (guid->company).

CREATE TABLE IF NOT EXISTS public.stream_collections (
    company_id    uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    provider      text NOT NULL DEFAULT 'bunny',
    library_id    text NOT NULL,
    collection_id text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stream_videos (
    guid             text PRIMARY KEY,
    company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tool_id          text NOT NULL DEFAULT 'ead',
    provider         text NOT NULL DEFAULT 'bunny',
    library_id       text NOT NULL,
    collection_id    text,
    title            text,
    filename         text,
    status           text NOT NULL DEFAULT 'created', -- created|uploaded|processing|ready|error|deleted
    storage_bytes    bigint NOT NULL DEFAULT 0,
    duration_seconds integer NOT NULL DEFAULT 0,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stream_videos_company ON public.stream_videos(company_id);
CREATE INDEX IF NOT EXISTS idx_stream_videos_collection ON public.stream_videos(collection_id);

-- RLS: acesso somente via Edge Functions (service role bypassa RLS). Sem policies públicas.
ALTER TABLE public.stream_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_videos ENABLE ROW LEVEL SECURITY;
