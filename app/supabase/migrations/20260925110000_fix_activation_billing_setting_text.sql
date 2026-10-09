-- platform_settings.value é TEXT em produção; `value #>> '{}'` só existe para jsonb
-- e quebrava activate_company_product / activate_company_addon ("operator does not exist: text #>> unknown").

CREATE OR REPLACE FUNCTION public.setting_text_is_true(p_value TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT lower(btrim(COALESCE(p_value, ''), ' "')) IN ('true', '1', 'yes', 'on', 'sim');
$$;

CREATE OR REPLACE FUNCTION public.safe_int(p_value TEXT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN btrim(COALESCE(p_value, '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
        THEN floor(btrim(p_value)::NUMERIC)::INT
        ELSE NULL
    END;
$$;

DO $$
DECLARE
    v_fn TEXT;
    v_def TEXT;
    v_new TEXT;
BEGIN
    FOREACH v_fn IN ARRAY ARRAY['activate_company_product', 'activate_company_addon'] LOOP
        SELECT pg_get_functiondef(p.oid) INTO v_def
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = v_fn;

        IF v_def IS NULL THEN
            RAISE EXCEPTION 'Função % não encontrada', v_fn;
        END IF;

        v_new := replace(
            v_def,
            $x$(value #>> '{}') = 'true' OR value = 'true'::jsonb OR value::text = '"true"'$x$,
            'public.setting_text_is_true(value::text)'
        );

        IF v_new = v_def THEN
            RAISE EXCEPTION 'Trecho de billing_enabled não encontrado em %', v_fn;
        END IF;

        v_new := replace(v_new, $x$(v_plan.limits->>'seats')::INT$x$, $x$public.safe_int(v_plan.limits->>'seats')$x$);
        v_new := replace(v_new, $x$(v_plan.limits->>'max_users')::INT$x$, $x$public.safe_int(v_plan.limits->>'max_users')$x$);

        EXECUTE v_new;
    END LOOP;
END;
$$;
