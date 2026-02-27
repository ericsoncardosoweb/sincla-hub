-- =====================================================
-- SINCLA HUB - MIGRATION 020
-- RPC para Concessão de Assinaturas (Admin)
-- =====================================================
-- Problema: A tabela subscriptions não permite INSERT via front-end
-- devido às restrições RLS. Precisamos de uma forma para admins
-- concederem acessos vitálicos sem expor inserts globais.
-- =====================================================

CREATE OR REPLACE FUNCTION admin_grant_subscription(
    p_company_id UUID,
    p_product_ids TEXT[]
) RETURNS void AS $$
DECLARE
    prod_id TEXT;
    v_next_century TIMESTAMPTZ;
BEGIN
    -- Verifica se o usuário que está chamando a função é um Admin
    IF NOT is_admin_user() THEN
        RAISE EXCEPTION 'Acesso negado: Requer privilégios de administrador.';
    END IF;

    -- Concede acesso por quase 100 anos
    v_next_century := NOW() + INTERVAL '100 years';

    FOREACH prod_id IN ARRAY p_product_ids
    LOOP
        INSERT INTO public.subscriptions (
            company_id,
            product_id,
            plan,
            status,
            seats_limit,
            billing_cycle,
            current_period_end
        ) VALUES (
            p_company_id,
            prod_id,
            'enterprise',
            'active',
            9999,
            'yearly',
            v_next_century
        ) ON CONFLICT (company_id, product_id) DO UPDATE
        SET status = 'active', 
            plan = 'enterprise', 
            seats_limit = 9999, 
            current_period_end = v_next_century;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
