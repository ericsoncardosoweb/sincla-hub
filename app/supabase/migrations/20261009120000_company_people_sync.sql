-- =====================================================
-- Cadastro único de pessoas por empresa + sincronização entre ferramentas
-- =====================================================
-- company_people         → pessoa canônica da empresa (existe mesmo sem login)
-- company_person_links   → id da pessoa em cada ferramenta (colaborador no RH, profile no EAD…)
-- company_people_sync_rules → origem → destino (ex.: rh → ead), ligada por padrão
-- people_sync_outbox     → fila de entregas com retry (drenada pela edge function people-sync)
--
-- Autoridade dos campos: RH é a fonte oficial de cpf, cargo, equipe e situação;
-- nome, e-mail e WhatsApp valem pela alteração mais recente em qualquer ferramenta.

CREATE OR REPLACE FUNCTION public.digits_only(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT NULLIF(regexp_replace(COALESCE(p_value, ''), '\D', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.norm_email(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT NULLIF(lower(btrim(COALESCE(p_value, ''))), '');
$$;

-- -----------------------------------------------------
-- Tabelas
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    subscriber_id UUID REFERENCES public.subscribers(id) ON DELETE SET NULL,
    name TEXT,
    email TEXT,
    cpf TEXT,
    whatsapp TEXT,
    job_title TEXT,
    team_name TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    field_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS company_people_cpf_uk
    ON public.company_people (company_id, cpf) WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS company_people_email_uk
    ON public.company_people (company_id, email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.company_person_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES public.company_people(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id VARCHAR NOT NULL REFERENCES public.products(id),
    external_id TEXT NOT NULL,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, product_id, external_id),
    UNIQUE (person_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.company_people_sync_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    source_product VARCHAR NOT NULL REFERENCES public.products(id),
    target_product VARCHAR NOT NULL REFERENCES public.products(id),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    revoke_on_inactive BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, source_product, target_product),
    CHECK (source_product <> target_product)
);

CREATE TABLE IF NOT EXISTS public.people_sync_outbox (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.company_people(id) ON DELETE CASCADE,
    target_product VARCHAR NOT NULL REFERENCES public.products(id),
    operation TEXT NOT NULL CHECK (operation IN ('upsert', 'deactivate')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'done', 'error', 'skipped')),
    attempts INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- Uma entrega pendente por pessoa/destino: a drenagem sempre lê o estado atual da pessoa
CREATE UNIQUE INDEX IF NOT EXISTS people_sync_outbox_pending_uk
    ON public.people_sync_outbox (person_id, target_product) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS people_sync_outbox_due_idx
    ON public.people_sync_outbox (next_attempt_at) WHERE status IN ('pending', 'processing', 'error');
CREATE INDEX IF NOT EXISTS people_sync_outbox_company_idx
    ON public.people_sync_outbox (company_id, created_at DESC);

-- -----------------------------------------------------
-- Fila
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_person_sync(
    p_person_id UUID,
    p_target VARCHAR,
    p_operation TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT company_id INTO v_company_id FROM public.company_people WHERE id = p_person_id;
    IF v_company_id IS NULL THEN
        RETURN;
    END IF;

    UPDATE public.people_sync_outbox
       SET status = 'skipped', last_error = COALESCE(last_error, '') || ' [substituída]', processed_at = now()
     WHERE person_id = p_person_id AND target_product = p_target AND status = 'error';

    INSERT INTO public.people_sync_outbox (company_id, person_id, target_product, operation)
    VALUES (v_company_id, p_person_id, p_target, p_operation)
    ON CONFLICT (person_id, target_product) WHERE status = 'pending'
    DO UPDATE SET operation = EXCLUDED.operation, next_attempt_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_people_sync_batch(p_limit INT DEFAULT 50)
RETURNS SETOF public.people_sync_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH due AS (
        SELECT id FROM public.people_sync_outbox
         WHERE status IN ('pending', 'processing', 'error')
           AND next_attempt_at <= now()
           AND attempts < 8
         ORDER BY next_attempt_at
         LIMIT p_limit
         FOR UPDATE SKIP LOCKED
    )
    UPDATE public.people_sync_outbox o
       SET status = 'processing',
           attempts = o.attempts + 1,
           next_attempt_at = now() + interval '5 minutes'
      FROM due
     WHERE o.id = due.id
    RETURNING o.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_people_sync(
    p_outbox_id BIGINT,
    p_status TEXT,
    p_error TEXT DEFAULT NULL,
    p_external_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.people_sync_outbox%ROWTYPE;
BEGIN
    SELECT * INTO v_row FROM public.people_sync_outbox WHERE id = p_outbox_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF p_status = 'error' THEN
        UPDATE public.people_sync_outbox
           SET status = 'error',
               last_error = left(p_error, 1000),
               next_attempt_at = now() + make_interval(mins => LEAST(power(2, v_row.attempts)::INT, 360))
         WHERE id = p_outbox_id;
        RETURN;
    END IF;

    IF p_status = 'done' AND p_external_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.company_person_links
         WHERE company_id = v_row.company_id AND product_id = v_row.target_product
           AND external_id = p_external_id AND person_id <> v_row.person_id
    ) THEN
        UPDATE public.people_sync_outbox
           SET status = 'skipped', last_error = 'Registro de destino já vinculado a outra pessoa (cadastro duplicado)', processed_at = now()
         WHERE id = p_outbox_id;
        RETURN;
    END IF;

    UPDATE public.people_sync_outbox
       SET status = p_status, last_error = left(p_error, 1000), processed_at = now()
     WHERE id = p_outbox_id;

    IF p_status = 'done' AND p_external_id IS NOT NULL THEN
        INSERT INTO public.company_person_links (person_id, company_id, product_id, external_id, last_synced_at)
        VALUES (v_row.person_id, v_row.company_id, v_row.target_product, p_external_id, now())
        ON CONFLICT (person_id, product_id)
        DO UPDATE SET external_id = EXCLUDED.external_id, last_synced_at = now();
    END IF;
END;
$$;

-- -----------------------------------------------------
-- Ingestão de mudanças vindas das ferramentas
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.ingest_person_change(
    p_company_id UUID,
    p_source VARCHAR,
    p_external_id TEXT,
    p_fields JSONB,
    p_changed_at TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_person public.company_people%ROWTYPE;
    v_found BOOLEAN := FALSE;
    v_linked BOOLEAN := FALSE;
    v_cpf TEXT := public.digits_only(p_fields->>'cpf');
    v_email TEXT := public.norm_email(p_fields->>'email');
    v_rh_fields TEXT[] := ARRAY['cpf', 'job_title', 'team_name', 'status'];
    v_all_fields TEXT[] := ARRAY['name', 'email', 'whatsapp', 'cpf', 'job_title', 'team_name', 'status'];
    v_field TEXT;
    v_new TEXT;
    v_old TEXT;
    v_at TIMESTAMPTZ;
    v_meta JSONB;
    v_patch JSONB := '{}'::jsonb;
    v_changed TEXT[] := '{}';
    v_conflicts TEXT[] := '{}';
    v_enqueued INT := 0;
    v_target RECORD;
BEGIN
    IF COALESCE(p_external_id, '') = '' THEN
        RAISE EXCEPTION 'external_id é obrigatório';
    END IF;

    SELECT p.* INTO v_person
      FROM public.company_person_links l
      JOIN public.company_people p ON p.id = l.person_id
     WHERE l.company_id = p_company_id AND l.product_id = p_source AND l.external_id = p_external_id;
    v_found := FOUND;
    v_linked := v_found;

    IF NOT v_found AND v_cpf IS NOT NULL THEN
        SELECT * INTO v_person FROM public.company_people WHERE company_id = p_company_id AND cpf = v_cpf;
        v_found := FOUND;
    END IF;

    IF NOT v_found AND v_email IS NOT NULL THEN
        SELECT * INTO v_person FROM public.company_people WHERE company_id = p_company_id AND email = v_email;
        v_found := FOUND;
    END IF;

    -- Achou por CPF/e-mail, mas a pessoa já está ligada a outro registro da mesma ferramenta:
    -- é um cadastro duplicado na origem, não mesclar.
    IF v_found AND NOT v_linked AND EXISTS (
        SELECT 1 FROM public.company_person_links
         WHERE person_id = v_person.id AND product_id = p_source
    ) THEN
        RETURN jsonb_build_object('status', 'conflict', 'reason', 'duplicate_in_source', 'person_id', v_person.id);
    END IF;

    IF NOT v_found THEN
        -- Só a fonte oficial cria pessoas; as demais ferramentas apenas atualizam quem já existe
        IF p_source <> 'rh' THEN
            RETURN jsonb_build_object('status', 'ignored', 'reason', 'not_linked');
        END IF;
        INSERT INTO public.company_people (company_id) VALUES (p_company_id) RETURNING * INTO v_person;
    END IF;

    v_meta := v_person.field_meta;

    FOREACH v_field IN ARRAY v_all_fields LOOP
        CONTINUE WHEN NOT (p_fields ? v_field);

        v_new := CASE v_field
            WHEN 'cpf' THEN v_cpf
            WHEN 'email' THEN v_email
            WHEN 'whatsapp' THEN public.digits_only(p_fields->>'whatsapp')
            WHEN 'status' THEN CASE WHEN p_fields->>'status' IN ('active', 'inactive') THEN p_fields->>'status' END
            ELSE NULLIF(btrim(p_fields->>v_field), '')
        END;
        v_old := to_jsonb(v_person)->>v_field;

        CONTINUE WHEN v_new IS NOT DISTINCT FROM v_old;
        CONTINUE WHEN v_new IS NULL AND v_field IN ('name', 'email', 'cpf', 'status');

        IF v_field = ANY (v_rh_fields) THEN
            -- Fora do RH, só preenche o que estiver vazio (situação nunca)
            IF p_source <> 'rh' AND (v_old IS NOT NULL OR v_field = 'status') THEN
                CONTINUE;
            END IF;
        ELSE
            v_at := (v_meta->v_field->>'at')::TIMESTAMPTZ;
            IF v_at IS NOT NULL AND v_at > p_changed_at THEN
                CONTINUE;
            END IF;
        END IF;

        IF v_field = 'cpf' AND EXISTS (
            SELECT 1 FROM public.company_people
             WHERE company_id = p_company_id AND cpf = v_new AND id <> v_person.id
        ) THEN
            v_conflicts := v_conflicts || 'cpf';
            CONTINUE;
        END IF;

        IF v_field = 'email' AND EXISTS (
            SELECT 1 FROM public.company_people
             WHERE company_id = p_company_id AND email = v_new AND id <> v_person.id
        ) THEN
            v_conflicts := v_conflicts || 'email';
            CONTINUE;
        END IF;

        v_patch := v_patch || jsonb_build_object(v_field, v_new);
        v_meta := v_meta || jsonb_build_object(v_field, jsonb_build_object('at', p_changed_at, 'source', p_source));
        v_changed := v_changed || v_field;
    END LOOP;

    IF array_length(v_changed, 1) > 0 THEN
        v_person := jsonb_populate_record(v_person, v_patch);
        UPDATE public.company_people
           SET name = v_person.name,
               email = v_person.email,
               cpf = v_person.cpf,
               whatsapp = v_person.whatsapp,
               job_title = v_person.job_title,
               team_name = v_person.team_name,
               status = v_person.status,
               field_meta = v_meta,
               updated_at = now()
         WHERE id = v_person.id;
    END IF;

    INSERT INTO public.company_person_links (person_id, company_id, product_id, external_id, last_synced_at)
    VALUES (v_person.id, p_company_id, p_source, p_external_id, now())
    ON CONFLICT (company_id, product_id, external_id) DO UPDATE SET last_synced_at = now();

    IF array_length(v_changed, 1) > 0 OR NOT v_linked THEN
        FOR v_target IN
            -- Ferramentas já ligadas à pessoa, desde que exista regra ativa entre o par
            SELECT l.product_id AS target, r.revoke_on_inactive
              FROM public.company_person_links l
              JOIN public.company_people_sync_rules r
                ON r.company_id = p_company_id AND r.enabled
               AND ((r.source_product = p_source AND r.target_product = l.product_id)
                 OR (r.source_product = l.product_id AND r.target_product = p_source))
             WHERE l.person_id = v_person.id AND l.product_id <> p_source
            UNION
            -- Destinos das regras ativas a partir desta origem (cria o acesso na ferramenta destino)
            SELECT r.target_product, r.revoke_on_inactive
              FROM public.company_people_sync_rules r
             WHERE r.company_id = p_company_id AND r.source_product = p_source AND r.enabled
        LOOP
            IF v_person.status = 'inactive' THEN
                IF v_target.revoke_on_inactive THEN
                    PERFORM public.enqueue_person_sync(v_person.id, v_target.target, 'deactivate');
                    v_enqueued := v_enqueued + 1;
                END IF;
            ELSE
                PERFORM public.enqueue_person_sync(v_person.id, v_target.target, 'upsert');
                v_enqueued := v_enqueued + 1;
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'status', 'ok',
        'person_id', v_person.id,
        'changed', to_jsonb(v_changed),
        'conflicts', to_jsonb(v_conflicts),
        'enqueued', v_enqueued
    );
END;
$$;

-- Reenfileira todas as pessoas de uma origem para um destino (ao ligar uma regra ou na carga inicial)
CREATE OR REPLACE FUNCTION public.queue_company_people_sync(
    p_company_id UUID,
    p_source VARCHAR,
    p_target VARCHAR
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rule public.company_people_sync_rules%ROWTYPE;
    v_count INT := 0;
    v_person RECORD;
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin_user() AND NOT EXISTS (
        SELECT 1 FROM public.company_members
         WHERE company_id = p_company_id AND user_id = auth.uid()
           AND status = 'active' AND role IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'Sem permissão';
    END IF;

    SELECT * INTO v_rule FROM public.company_people_sync_rules
     WHERE company_id = p_company_id AND source_product = p_source AND target_product = p_target AND enabled;
    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    FOR v_person IN
        SELECT p.id, p.status
          FROM public.company_people p
          JOIN public.company_person_links l ON l.person_id = p.id AND l.product_id = p_source
         WHERE p.company_id = p_company_id
    LOOP
        IF v_person.status = 'active' THEN
            PERFORM public.enqueue_person_sync(v_person.id, p_target, 'upsert');
            v_count := v_count + 1;
        ELSIF v_rule.revoke_on_inactive AND EXISTS (
            SELECT 1 FROM public.company_person_links WHERE person_id = v_person.id AND product_id = p_target
        ) THEN
            PERFORM public.enqueue_person_sync(v_person.id, p_target, 'deactivate');
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$;

-- -----------------------------------------------------
-- Regra RH → EAD ligada por padrão quando a empresa tem as duas ferramentas
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_default_people_sync_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status IN ('active', 'trial') AND NEW.product_id IN ('rh', 'ead')
       AND EXISTS (SELECT 1 FROM public.subscriptions
                    WHERE company_id = NEW.company_id AND product_id = 'rh' AND status IN ('active', 'trial'))
       AND EXISTS (SELECT 1 FROM public.subscriptions
                    WHERE company_id = NEW.company_id AND product_id = 'ead' AND status IN ('active', 'trial'))
    THEN
        INSERT INTO public.company_people_sync_rules (company_id, source_product, target_product)
        VALUES (NEW.company_id, 'rh', 'ead')
        ON CONFLICT (company_id, source_product, target_product) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_people_sync_rules ON public.subscriptions;
CREATE TRIGGER trg_default_people_sync_rules
    AFTER INSERT OR UPDATE OF status, product_id ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.ensure_default_people_sync_rules();

INSERT INTO public.company_people_sync_rules (company_id, source_product, target_product)
SELECT DISTINCT s1.company_id, 'rh', 'ead'
  FROM public.subscriptions s1
  JOIN public.subscriptions s2
    ON s2.company_id = s1.company_id AND s2.product_id = 'ead' AND s2.status IN ('active', 'trial')
 WHERE s1.product_id = 'rh' AND s1.status IN ('active', 'trial')
ON CONFLICT (company_id, source_product, target_product) DO NOTHING;

-- Ao religar uma regra, reenfileira quem já estava no cadastro
CREATE OR REPLACE FUNCTION public.on_people_sync_rule_enabled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := now();
    IF NEW.enabled AND NOT OLD.enabled THEN
        PERFORM public.queue_company_people_sync(NEW.company_id, NEW.source_product, NEW.target_product);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_people_sync_rule_enabled ON public.company_people_sync_rules;
CREATE TRIGGER trg_people_sync_rule_enabled
    BEFORE UPDATE ON public.company_people_sync_rules
    FOR EACH ROW EXECUTE FUNCTION public.on_people_sync_rule_enabled();

-- -----------------------------------------------------
-- Pendências: pessoas que não puderam ir para o destino por falta de e-mail
-- -----------------------------------------------------
CREATE OR REPLACE VIEW public.company_people_sync_pending
WITH (security_invoker = true) AS
SELECT p.company_id,
       p.id AS person_id,
       p.name,
       p.cpf,
       p.job_title,
       p.team_name,
       r.source_product,
       r.target_product,
       'missing_email'::TEXT AS reason
  FROM public.company_people p
  JOIN public.company_person_links ls ON ls.person_id = p.id
  JOIN public.company_people_sync_rules r
    ON r.company_id = p.company_id AND r.source_product = ls.product_id AND r.enabled
 WHERE p.status = 'active'
   AND p.email IS NULL
   AND NOT EXISTS (
       SELECT 1 FROM public.company_person_links lt
        WHERE lt.person_id = p.id AND lt.product_id = r.target_product
   );

-- -----------------------------------------------------
-- RLS: leitura para owner/admin da empresa; escrita só pelo service role,
-- exceto ligar/desligar regras.
-- -----------------------------------------------------
ALTER TABLE public.company_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_person_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_people_sync_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_sync_outbox ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_company_manager(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_admin_user() OR EXISTS (
        SELECT 1 FROM public.company_members
         WHERE company_id = p_company_id AND user_id = auth.uid()
           AND status = 'active' AND role IN ('owner', 'admin')
    );
$$;

DROP POLICY IF EXISTS company_people_select ON public.company_people;
CREATE POLICY company_people_select ON public.company_people
    FOR SELECT USING (public.is_company_manager(company_id));

DROP POLICY IF EXISTS company_person_links_select ON public.company_person_links;
CREATE POLICY company_person_links_select ON public.company_person_links
    FOR SELECT USING (public.is_company_manager(company_id));

DROP POLICY IF EXISTS people_sync_rules_select ON public.company_people_sync_rules;
CREATE POLICY people_sync_rules_select ON public.company_people_sync_rules
    FOR SELECT USING (public.is_company_manager(company_id));

DROP POLICY IF EXISTS people_sync_rules_update ON public.company_people_sync_rules;
CREATE POLICY people_sync_rules_update ON public.company_people_sync_rules
    FOR UPDATE USING (public.is_company_manager(company_id))
    WITH CHECK (public.is_company_manager(company_id));

DROP POLICY IF EXISTS people_sync_outbox_select ON public.people_sync_outbox;
CREATE POLICY people_sync_outbox_select ON public.people_sync_outbox
    FOR SELECT USING (public.is_company_manager(company_id));

REVOKE UPDATE ON public.company_people_sync_rules FROM authenticated;
GRANT UPDATE (enabled, revoke_on_inactive) ON public.company_people_sync_rules TO authenticated;

REVOKE ALL ON FUNCTION public.enqueue_person_sync(UUID, VARCHAR, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_people_sync_batch(INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_people_sync(BIGINT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ingest_person_change(UUID, VARCHAR, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_company_people_sync(UUID, VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_person_sync(UUID, VARCHAR, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_people_sync_batch(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_people_sync(BIGINT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.ingest_person_change(UUID, VARCHAR, TEXT, JSONB, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_company_people_sync(UUID, VARCHAR, VARCHAR) TO authenticated, service_role;

-- -----------------------------------------------------
-- Drenagem da fila a cada minuto (só chama a edge function quando há trabalho).
-- Requer o segredo `people_sync_secret_hub` no Vault, igual ao PEOPLE_SYNC_SECRET_HUB da função.
-- -----------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'people-sync-drain') THEN
        PERFORM cron.unschedule('people-sync-drain');
    END IF;
    PERFORM cron.schedule(
        'people-sync-drain',
        '* * * * *',
        $cron$
        SELECT net.http_post(
            url := 'https://igwjtvdanulrwntdyfbt.supabase.co/functions/v1/people-sync',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'x-people-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'people_sync_secret_hub')
            ),
            body := '{"action":"drain"}'::jsonb
        )
        WHERE EXISTS (
            SELECT 1 FROM public.people_sync_outbox
             WHERE status IN ('pending', 'processing', 'error') AND next_attempt_at <= now() AND attempts < 8
        )
        AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'people_sync_secret_hub');
        $cron$
    );
END;
$$;
