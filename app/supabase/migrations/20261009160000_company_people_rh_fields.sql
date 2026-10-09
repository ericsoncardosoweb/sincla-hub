-- Matrícula, setor e gestor vindos do Sincla RH (RH é a fonte oficial desses campos)
ALTER TABLE public.company_people ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.company_people ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE public.company_people ADD COLUMN IF NOT EXISTS is_manager BOOLEAN NOT NULL DEFAULT FALSE;

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
    v_rh_fields TEXT[] := ARRAY['cpf', 'job_title', 'team_name', 'status', 'registration_number', 'sector', 'is_manager'];
    v_all_fields TEXT[] := ARRAY['name', 'email', 'whatsapp', 'cpf', 'job_title', 'team_name', 'status', 'registration_number', 'sector', 'is_manager'];
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
            WHEN 'is_manager' THEN CASE WHEN p_fields->>'is_manager' IN ('true', 'false') THEN p_fields->>'is_manager' END
            ELSE NULLIF(btrim(p_fields->>v_field), '')
        END;
        v_old := to_jsonb(v_person)->>v_field;

        CONTINUE WHEN v_new IS NOT DISTINCT FROM v_old;
        CONTINUE WHEN v_new IS NULL AND v_field IN ('name', 'email', 'cpf', 'status', 'is_manager');

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
               registration_number = v_person.registration_number,
               sector = v_person.sector,
               is_manager = v_person.is_manager,
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

REVOKE ALL ON FUNCTION public.ingest_person_change(UUID, VARCHAR, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_person_change(UUID, VARCHAR, TEXT, JSONB, TIMESTAMPTZ) TO service_role;
