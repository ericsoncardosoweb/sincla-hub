-- Ativação in-context de ferramentas (grátis, trial, lifetime) sem checkout

CREATE OR REPLACE FUNCTION public.activate_company_product(
    p_company_id UUID,
    p_product_id VARCHAR,
    p_plan_slug VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lifetime BOOLEAN;
    v_billing_enabled BOOLEAN := FALSE;
    v_plan RECORD;
    v_sub_id UUID;
    v_status TEXT;
    v_trial_ends TIMESTAMPTZ;
    v_seats INT;
    v_monthly NUMERIC;
BEGIN
    IF NOT public.is_admin_user() AND NOT EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.company_id = p_company_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'Sem permissão para ativar ferramentas nesta empresa';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND is_active = TRUE) THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Produto indisponível');
    END IF;

    SELECT COALESCE(lifetime_access, FALSE) INTO v_lifetime
    FROM public.companies WHERE id = p_company_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Empresa não encontrada');
    END IF;

    SELECT COALESCE(
        (value #>> '{}') = 'true' OR value = 'true'::jsonb OR value::text = '"true"',
        FALSE
    ) INTO v_billing_enabled
    FROM public.platform_settings
    WHERE key = 'billing_enabled';

    -- Vitalício: libera imediatamente
    IF v_lifetime THEN
        INSERT INTO public.subscriptions (company_id, product_id, plan, status, monthly_amount, seats_limit)
        VALUES (p_company_id, p_product_id, 'lifetime', 'active', 0, 999999)
        ON CONFLICT (company_id, product_id) DO UPDATE
            SET status = 'active', plan = 'lifetime', monthly_amount = 0,
                seats_limit = GREATEST(subscriptions.seats_limit, 999999),
                updated_at = NOW()
        RETURNING id INTO v_sub_id;

        RETURN jsonb_build_object(
            'success', TRUE, 'instant', TRUE,
            'subscription_id', v_sub_id, 'plan', 'lifetime'
        );
    END IF;

    -- Plano escolhido ou recomendado
    IF p_plan_slug IS NOT NULL THEN
        SELECT pp.* INTO v_plan
        FROM public.product_plans pp
        WHERE pp.product_id = p_product_id
          AND pp.slug = p_plan_slug
          AND pp.is_active = TRUE
          AND pp.plan_kind = 'base'
        LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        SELECT pp.* INTO v_plan
        FROM public.product_plans pp
        WHERE pp.product_id = p_product_id
          AND pp.is_active = TRUE
          AND pp.plan_kind = 'base'
        ORDER BY pp.is_popular DESC, pp.sort_order ASC, pp.price_monthly ASC
        LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Nenhum plano configurado para este produto');
    END IF;

    IF v_plan.slug = 'enterprise' THEN
        RETURN jsonb_build_object(
            'success', FALSE, 'requires_checkout', TRUE,
            'plan_slug', v_plan.slug, 'plan_id', v_plan.id,
            'reason', 'enterprise'
        );
    END IF;

    v_seats := COALESCE((v_plan.limits->>'seats')::INT, (v_plan.limits->>'max_users')::INT, 5);
    v_monthly := COALESCE(v_plan.price_monthly, 0);

    -- Plano 100% gratuito
    IF v_monthly = 0 AND COALESCE(v_plan.price_yearly, 0) = 0 THEN
        INSERT INTO public.subscriptions (
            company_id, product_id, plan, plan_id, status,
            monthly_amount, seats_limit, billing_cycle
        )
        VALUES (
            p_company_id, p_product_id, v_plan.slug, v_plan.id, 'active',
            0, v_seats, 'monthly'
        )
        ON CONFLICT (company_id, product_id) DO UPDATE
            SET status = 'active', plan = EXCLUDED.plan, plan_id = EXCLUDED.plan_id,
                monthly_amount = 0, seats_limit = EXCLUDED.seats_limit,
                trial_ends_at = NULL, updated_at = NOW()
        RETURNING id INTO v_sub_id;

        RETURN jsonb_build_object(
            'success', TRUE, 'instant', TRUE,
            'subscription_id', v_sub_id,
            'plan', v_plan.slug, 'plan_id', v_plan.id
        );
    END IF;

    -- Billing desligado ou trial: ativa trial sem gateway
    IF NOT v_billing_enabled OR COALESCE(v_plan.trial_days, 0) > 0 THEN
        v_status := CASE WHEN COALESCE(v_plan.trial_days, 0) > 0 THEN 'trial' ELSE 'active' END;
        v_trial_ends := CASE
            WHEN COALESCE(v_plan.trial_days, 0) > 0
            THEN NOW() + (v_plan.trial_days || ' days')::INTERVAL
            ELSE NULL
        END;

        INSERT INTO public.subscriptions (
            company_id, product_id, plan, plan_id, status,
            monthly_amount, seats_limit, billing_cycle,
            trial_ends_at, current_period_start, current_period_end
        )
        VALUES (
            p_company_id, p_product_id, v_plan.slug, v_plan.id, v_status,
            v_monthly, v_seats, 'monthly',
            v_trial_ends, NOW(),
            CASE WHEN v_trial_ends IS NOT NULL THEN v_trial_ends ELSE NOW() + INTERVAL '30 days' END
        )
        ON CONFLICT (company_id, product_id) DO UPDATE
            SET status = EXCLUDED.status, plan = EXCLUDED.plan, plan_id = EXCLUDED.plan_id,
                monthly_amount = EXCLUDED.monthly_amount, seats_limit = EXCLUDED.seats_limit,
                trial_ends_at = EXCLUDED.trial_ends_at,
                current_period_start = EXCLUDED.current_period_start,
                current_period_end = EXCLUDED.current_period_end,
                updated_at = NOW()
        RETURNING id INTO v_sub_id;

        RETURN jsonb_build_object(
            'success', TRUE, 'instant', TRUE,
            'subscription_id', v_sub_id,
            'plan', v_plan.slug, 'plan_id', v_plan.id,
            'status', v_status,
            'trial_days', v_plan.trial_days
        );
    END IF;

    -- Plano pago com billing ligado → checkout
    RETURN jsonb_build_object(
        'success', FALSE, 'requires_checkout', TRUE,
        'plan_slug', v_plan.slug, 'plan_id', v_plan.id
    );
END;
$$;

COMMENT ON FUNCTION public.activate_company_product IS
    'Ativa ferramenta in-context: lifetime/grátis/trial instantâneo; pago exige checkout quando billing_enabled.';

GRANT EXECUTE ON FUNCTION public.activate_company_product(UUID, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_company_product(UUID, VARCHAR, VARCHAR) TO service_role;
