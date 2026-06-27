-- Ativação de módulos add-on (plan_kind addon/bundle) após assinatura base

CREATE OR REPLACE FUNCTION public.activate_company_addon(
    p_company_id UUID,
    p_product_id VARCHAR,
    p_plan_slug VARCHAR
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
    v_addon_id UUID;
    v_status TEXT;
    v_trial_ends TIMESTAMPTZ;
    v_monthly NUMERIC;
BEGIN
    IF NOT public.is_admin_user() AND NOT EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.company_id = p_company_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'Sem permissão para gerenciar módulos nesta empresa';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.company_id = p_company_id
          AND s.product_id = p_product_id
          AND s.status IN ('active', 'trial')
    ) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Contrate o plano base desta ferramenta antes de adicionar módulos.'
        );
    END IF;

    SELECT pp.* INTO v_plan
    FROM public.product_plans pp
    WHERE pp.product_id = p_product_id
      AND pp.slug = p_plan_slug
      AND pp.is_active = TRUE
      AND pp.plan_kind IN ('addon', 'bundle')
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Módulo não encontrado ou indisponível');
    END IF;

    SELECT COALESCE(lifetime_access, FALSE) INTO v_lifetime
    FROM public.companies WHERE id = p_company_id;

    SELECT COALESCE(
        (value #>> '{}') = 'true' OR value = 'true'::jsonb OR value::text = '"true"',
        FALSE
    ) INTO v_billing_enabled
    FROM public.platform_settings WHERE key = 'billing_enabled';

    v_monthly := COALESCE(v_plan.price_monthly, 0);

    IF v_lifetime OR (v_monthly = 0 AND COALESCE(v_plan.price_yearly, 0) = 0) THEN
        INSERT INTO public.subscription_addons (
            company_id, product_id, plan_id, status,
            billing_cycle, monthly_amount,
            current_period_start, current_period_end
        )
        VALUES (
            p_company_id, p_product_id, v_plan.id, 'active',
            'monthly', 0, NOW(), NOW() + INTERVAL '30 days'
        )
        ON CONFLICT (company_id, product_id, plan_id) DO UPDATE
            SET status = 'active', monthly_amount = 0, updated_at = NOW()
        RETURNING id INTO v_addon_id;

        RETURN jsonb_build_object(
            'success', TRUE, 'instant', TRUE,
            'addon_id', v_addon_id, 'plan_slug', v_plan.slug
        );
    END IF;

    IF NOT v_billing_enabled OR COALESCE(v_plan.trial_days, 0) > 0 THEN
        v_status := CASE WHEN COALESCE(v_plan.trial_days, 0) > 0 THEN 'trial' ELSE 'active' END;
        v_trial_ends := CASE
            WHEN COALESCE(v_plan.trial_days, 0) > 0
            THEN NOW() + (v_plan.trial_days || ' days')::INTERVAL
            ELSE NULL
        END;

        INSERT INTO public.subscription_addons (
            company_id, product_id, plan_id, status,
            billing_cycle, monthly_amount,
            current_period_start, current_period_end
        )
        VALUES (
            p_company_id, p_product_id, v_plan.id, v_status,
            'monthly', v_monthly,
            NOW(),
            COALESCE(v_trial_ends, NOW() + INTERVAL '30 days')
        )
        ON CONFLICT (company_id, product_id, plan_id) DO UPDATE
            SET status = EXCLUDED.status,
                monthly_amount = EXCLUDED.monthly_amount,
                current_period_start = EXCLUDED.current_period_start,
                current_period_end = EXCLUDED.current_period_end,
                updated_at = NOW()
        RETURNING id INTO v_addon_id;

        RETURN jsonb_build_object(
            'success', TRUE, 'instant', TRUE,
            'addon_id', v_addon_id, 'plan_slug', v_plan.slug, 'status', v_status
        );
    END IF;

    RETURN jsonb_build_object(
        'success', FALSE, 'requires_checkout', TRUE,
        'plan_slug', v_plan.slug, 'plan_id', v_plan.id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_company_addon_checkout(
    p_company_id UUID,
    p_product_id VARCHAR,
    p_plan_id UUID,
    p_external_subscription_id VARCHAR DEFAULT NULL,
    p_billing_cycle VARCHAR DEFAULT 'monthly',
    p_monthly_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan RECORD;
    v_addon_id UUID;
    v_cycle VARCHAR;
BEGIN
    IF NOT public.is_admin_user() AND NOT EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.company_id = p_company_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'Sem permissão';
    END IF;

    SELECT pp.* INTO v_plan
    FROM public.product_plans pp
    WHERE pp.id = p_plan_id
      AND pp.product_id = p_product_id
      AND pp.plan_kind IN ('addon', 'bundle')
      AND pp.is_active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Plano de módulo inválido');
    END IF;

    v_cycle := CASE WHEN p_billing_cycle IN ('yearly', 'annual', 'YEARLY') THEN 'yearly' ELSE 'monthly' END;

    INSERT INTO public.subscription_addons (
        company_id, product_id, plan_id, status,
        billing_cycle, monthly_amount, external_subscription_id,
        current_period_start, current_period_end
    )
    VALUES (
        p_company_id, p_product_id, p_plan_id, 'active',
        v_cycle,
        COALESCE(p_monthly_amount, v_plan.price_monthly, 0),
        p_external_subscription_id,
        NOW(), NOW() + INTERVAL '30 days'
    )
    ON CONFLICT (company_id, product_id, plan_id) DO UPDATE
        SET status = 'active',
            billing_cycle = EXCLUDED.billing_cycle,
            monthly_amount = EXCLUDED.monthly_amount,
            external_subscription_id = COALESCE(EXCLUDED.external_subscription_id, subscription_addons.external_subscription_id),
            current_period_start = EXCLUDED.current_period_start,
            current_period_end = EXCLUDED.current_period_end,
            updated_at = NOW()
    RETURNING id INTO v_addon_id;

    RETURN jsonb_build_object('success', TRUE, 'addon_id', v_addon_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_company_addon(UUID, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_company_addon(UUID, VARCHAR, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_company_addon_checkout(UUID, VARCHAR, UUID, VARCHAR, VARCHAR, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_company_addon_checkout(UUID, VARCHAR, UUID, VARCHAR, VARCHAR, NUMERIC) TO service_role;
