-- =====================================================
-- SINCLA HUB - SISTEMA DE COMISSIONAMENTO ROBUSTO
-- Migration: 013_commission_system.sql
-- Data: 2026-02-26
-- =====================================================
-- Corrige vulnerabilidades do modelo original:
-- 1. Comissão por produto (não mais global)
-- 2. Carência de 15 dias desde pagamento confirmado
-- 3. Registros granulares (não cálculo on-the-fly)
-- 4. Bloqueio de auto-referência
-- 5. referred_by imutável
-- 6. Proteção contra churning
-- =====================================================

-- =====================================================
-- 1. COMISSÃO POR PRODUTO
-- =====================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS commission_percent DECIMAL(5,2) DEFAULT 10.00;

COMMENT ON COLUMN products.commission_percent IS 
'Percentual de comissão padrão do produto para parceiros. Pode ser sobrescrito por acordo específico com o parceiro.';

-- =====================================================
-- 2. CAMPOS EXTRAS NA partner_commissions
-- =====================================================

-- Adicionar campos para rastreamento granular
ALTER TABLE partner_commissions 
ADD COLUMN IF NOT EXISTS product_id VARCHAR(50) REFERENCES products(id);

ALTER TABLE partner_commissions 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

ALTER TABLE partner_commissions 
ADD COLUMN IF NOT EXISTS reference_month DATE;

ALTER TABLE partner_commissions 
ADD COLUMN IF NOT EXISTS subscription_amount DECIMAL(10,2);

ALTER TABLE partner_commissions 
ADD COLUMN IF NOT EXISTS first_payment_at TIMESTAMPTZ;

ALTER TABLE partner_commissions 
ADD COLUMN IF NOT EXISTS eligible_at TIMESTAMPTZ;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_commissions_product ON partner_commissions(product_id);
CREATE INDEX IF NOT EXISTS idx_commissions_company ON partner_commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_month ON partner_commissions(reference_month);
CREATE INDEX IF NOT EXISTS idx_commissions_eligible ON partner_commissions(eligible_at);

COMMENT ON COLUMN partner_commissions.first_payment_at IS 
'Data do primeiro pagamento confirmado. Carência de 15 dias conta a partir daqui.';

COMMENT ON COLUMN partner_commissions.eligible_at IS 
'Data em que a comissão se torna elegível (first_payment_at + 15 dias).';

-- =====================================================
-- 3. TRIGGER: referred_by IMUTÁVEL
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_referred_by_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Se referred_by já estava preenchido e está sendo alterado
    IF OLD.referred_by IS NOT NULL 
       AND (NEW.referred_by IS NULL OR NEW.referred_by != OLD.referred_by) THEN
        RAISE EXCEPTION 'referred_by não pode ser alterado uma vez definido';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_referred_by_change ON subscribers;
CREATE TRIGGER trg_prevent_referred_by_change
    BEFORE UPDATE OF referred_by ON subscribers
    FOR EACH ROW
    EXECUTE FUNCTION prevent_referred_by_change();

-- =====================================================
-- 4. TRIGGER: BLOQUEIO DE AUTO-REFERÊNCIA
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_self_referral()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_user_id UUID;
BEGIN
    IF NEW.referred_by IS NOT NULL THEN
        -- Buscar o user_id do parceiro
        SELECT user_id INTO v_partner_user_id
        FROM partners WHERE id = NEW.referred_by;
        
        -- Bloquear se o subscriber é o próprio parceiro
        IF v_partner_user_id = NEW.id THEN
            RAISE EXCEPTION 'Parceiro não pode indicar a si mesmo';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_self_referral ON subscribers;
CREATE TRIGGER trg_prevent_self_referral
    BEFORE INSERT OR UPDATE OF referred_by ON subscribers
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_referral();

-- =====================================================
-- 5. FUNÇÃO: GERAR COMISSÃO PÓS-PAGAMENTO
-- =====================================================
-- Chamada pelo webhook após PAYMENT_CONFIRMED
-- Verifica referred_by + carência + gera registro

CREATE OR REPLACE FUNCTION public.generate_commission_for_payment(
    p_subscription_id UUID,
    p_payment_confirmed_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS UUID AS $$
DECLARE
    v_subscription RECORD;
    v_company RECORD;
    v_subscriber RECORD;
    v_partner RECORD;
    v_product RECORD;
    v_commission_rate DECIMAL(5,2);
    v_commission_amount DECIMAL(10,2);
    v_commission_id UUID;
    v_eligible_at TIMESTAMPTZ;
    v_ref_month DATE;
BEGIN
    -- 1. Buscar dados da assinatura
    SELECT * INTO v_subscription 
    FROM subscriptions WHERE id = p_subscription_id;
    
    IF NOT FOUND THEN RETURN NULL; END IF;
    
    -- 2. Buscar empresa e subscriber
    SELECT * INTO v_company FROM companies WHERE id = v_subscription.company_id;
    IF NOT FOUND THEN RETURN NULL; END IF;
    
    SELECT * INTO v_subscriber FROM subscribers WHERE id = v_company.subscriber_id;
    IF NOT FOUND OR v_subscriber.referred_by IS NULL THEN RETURN NULL; END IF;
    
    -- 3. Buscar parceiro (deve estar ativo)
    SELECT * INTO v_partner FROM partners WHERE id = v_subscriber.referred_by AND status = 'active';
    IF NOT FOUND THEN RETURN NULL; END IF;
    
    -- 4. Buscar produto para taxa de comissão
    SELECT * INTO v_product FROM products WHERE id = v_subscription.product_id;
    IF NOT FOUND THEN RETURN NULL; END IF;
    
    -- 5. Calcular taxa: produto específico > parceiro global > default 10%
    v_commission_rate := COALESCE(v_product.commission_percent, v_partner.commission_percent, 10.00);
    
    -- 6. Calcular valor (APENAS sobre mensalidade, NUNCA setup)
    v_commission_amount := v_subscription.monthly_amount * (v_commission_rate / 100);
    
    -- 7. Carência de 15 dias
    v_eligible_at := p_payment_confirmed_at + INTERVAL '15 days';
    v_ref_month := date_trunc('month', p_payment_confirmed_at)::DATE;
    
    -- 8. Verificar se já existe comissão para este mês/subscription
    IF EXISTS (
        SELECT 1 FROM partner_commissions 
        WHERE subscription_id = p_subscription_id 
          AND reference_month = v_ref_month
    ) THEN
        RETURN NULL; -- Já existe, não duplicar
    END IF;
    
    -- 9. Criar registro de comissão
    INSERT INTO partner_commissions (
        partner_id, subscription_id, product_id, company_id,
        amount, percent_applied, subscription_amount,
        status, reference_month, first_payment_at, eligible_at,
        period_start, period_end
    ) VALUES (
        v_partner.id, p_subscription_id, v_product.id, v_company.id,
        v_commission_amount, v_commission_rate, v_subscription.monthly_amount,
        'pending', v_ref_month, p_payment_confirmed_at, v_eligible_at,
        v_ref_month, (v_ref_month + INTERVAL '1 month')::TIMESTAMPTZ
    )
    RETURNING id INTO v_commission_id;
    
    RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FUNÇÃO: APROVAR COMISSÕES ELEGÍVEIS
-- =====================================================
-- Deve ser chamada por cron diário (pg_cron)
-- Aprova comissões com carência de 15 dias cumprida

CREATE OR REPLACE FUNCTION public.approve_eligible_commissions()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE partner_commissions
    SET status = 'approved'
    WHERE status = 'pending'
      AND eligible_at <= NOW()
      -- Só aprova se a assinatura ainda está ativa
      AND subscription_id IN (
          SELECT id FROM subscriptions WHERE status IN ('active', 'trial')
      );
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNÇÃO: CANCELAR COMISSÕES DE ASSINATURAS CANCELADAS
-- =====================================================

CREATE OR REPLACE FUNCTION public.cancel_commissions_for_subscription(
    p_subscription_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Cancelar comissões pendentes (não as já pagas)
    UPDATE partner_commissions
    SET status = 'canceled'
    WHERE subscription_id = p_subscription_id
      AND status IN ('pending', 'approved');
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. ATUALIZAR calculate_partner_balance
-- =====================================================
-- Agora baseado em REGISTROS, não cálculo on-the-fly

CREATE OR REPLACE FUNCTION public.calculate_partner_balance(p_partner_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_total_approved DECIMAL(10,2);
    v_total_withdrawn DECIMAL(10,2);
BEGIN
    -- Total de comissões aprovadas ou pagas
    SELECT COALESCE(SUM(amount), 0) INTO v_total_approved
    FROM partner_commissions
    WHERE partner_id = p_partner_id
      AND status IN ('approved', 'paid');

    -- Total já sacado (não cancelado/rejeitado)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawn
    FROM partner_withdrawals
    WHERE partner_id = p_partner_id
      AND status IN ('pending', 'processing', 'paid');

    RETURN GREATEST(v_total_approved - v_total_withdrawn, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. ATUALIZAR get_partner_stats
-- =====================================================
-- Carência corrigida para 15 dias, baseado em registros

CREATE OR REPLACE FUNCTION public.get_partner_stats(p_partner_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_clients', (
            SELECT COUNT(DISTINCT sub.id)
            FROM subscribers sub
            WHERE sub.referred_by = p_partner_id
        ),
        'active_clients', (
            SELECT COUNT(DISTINCT sub.id)
            FROM subscribers sub
            JOIN companies c ON c.subscriber_id = sub.id
            JOIN subscriptions s ON s.company_id = c.id
            WHERE sub.referred_by = p_partner_id
              AND s.status IN ('active', 'trial')
        ),
        'eligible_clients', (
            SELECT COUNT(DISTINCT pc.company_id)
            FROM partner_commissions pc
            WHERE pc.partner_id = p_partner_id
              AND pc.status IN ('approved', 'paid')
        ),
        'total_commissions', (
            SELECT COALESCE(SUM(amount), 0)
            FROM partner_commissions
            WHERE partner_id = p_partner_id
              AND status IN ('approved', 'paid')
        ),
        'pending_commissions', (
            SELECT COALESCE(SUM(amount), 0)
            FROM partner_commissions
            WHERE partner_id = p_partner_id
              AND status = 'pending'
        ),
        'available_balance', (
            SELECT public.calculate_partner_balance(p_partner_id)
        ),
        'total_withdrawn', (
            SELECT COALESCE(SUM(amount), 0)
            FROM partner_withdrawals
            WHERE partner_id = p_partner_id
              AND status = 'paid'
        ),
        'pending_withdrawal', (
            SELECT COALESCE(SUM(amount), 0)
            FROM partner_withdrawals
            WHERE partner_id = p_partner_id
              AND status IN ('pending', 'processing')
        ),
        'commission_count', (
            SELECT COUNT(*)
            FROM partner_commissions
            WHERE partner_id = p_partner_id
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. TRIGGER: CANCELAR COMISSÕES AO CANCELAR ASSINATURA
-- =====================================================

CREATE OR REPLACE FUNCTION on_subscription_canceled()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'canceled' AND OLD.status != 'canceled' THEN
        PERFORM public.cancel_commissions_for_subscription(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_subscription_canceled ON subscriptions;
CREATE TRIGGER trg_subscription_canceled
    AFTER UPDATE OF status ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION on_subscription_canceled();

-- =====================================================
-- 11. ATUALIZAR handle_new_user PARA RESOLVER AFFILIATE_REF
-- =====================================================
-- Quando o usuário se cadastra com ?ref=CODE, o código é salvo
-- no user_meta_data como affiliate_ref. Esta função resolve
-- o código para partner_id e salva como referred_by.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
    v_affiliate_ref TEXT;
BEGIN
    -- Extrair código de afiliado do metadata (se presente)
    v_affiliate_ref := NEW.raw_user_meta_data->>'affiliate_ref';
    
    -- Resolver código de afiliado para partner_id
    IF v_affiliate_ref IS NOT NULL AND v_affiliate_ref != '' THEN
        SELECT id INTO v_partner_id
        FROM partners 
        WHERE affiliate_code = v_affiliate_ref 
          AND status = 'active';
    END IF;
    
    -- Criar subscriber com referred_by se encontrado
    INSERT INTO public.subscribers (id, email, name, referred_by)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        v_partner_id  -- NULL se não tiver código ou código inválido
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
