-- =====================================================
-- SINCLA HUB - MÓDULO DE PARCEIROS / AFILIADOS
-- Migration: 004_partner_module.sql
-- Data: 2026-02-22
-- =====================================================

-- =====================================================
-- 1. CAMPOS PIX E TERMOS NA TABELA PARTNERS
-- =====================================================

ALTER TABLE partners ADD COLUMN IF NOT EXISTS pix_key_type VARCHAR(20)
    CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random'));
ALTER TABLE partners ADD COLUMN IF NOT EXISTS pix_key VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ;

-- =====================================================
-- 2. TABELA DE SAQUES
-- =====================================================

CREATE TABLE IF NOT EXISTS partner_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'paid', 'rejected')),
    
    -- Dados PIX no momento do saque (snapshot)
    pix_key_type VARCHAR(20) NOT NULL,
    pix_key VARCHAR(255) NOT NULL,
    
    -- Asaas
    asaas_transfer_id VARCHAR(100),
    
    -- Período de referência
    reference_month DATE NOT NULL, -- ex: 2026-02-01 (mês de referência)
    
    -- Datas
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    notes TEXT,
    processed_by UUID REFERENCES admin_users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_withdrawals_partner ON partner_withdrawals(partner_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON partner_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_month ON partner_withdrawals(reference_month);

-- =====================================================
-- 3. CAMPO activated_at NO SUBSCRIBERS
-- =====================================================

ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- Preencher activated_at para subscribers existentes
UPDATE subscribers SET activated_at = created_at WHERE activated_at IS NULL;

-- =====================================================
-- 4. RLS PARA partner_withdrawals
-- =====================================================

ALTER TABLE partner_withdrawals ENABLE ROW LEVEL SECURITY;

-- Parceiro vê seus próprios saques
CREATE POLICY "Partners view own withdrawals" ON partner_withdrawals
    FOR SELECT USING (
        partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
    );

-- Parceiro pode solicitar saque (INSERT)
CREATE POLICY "Partners request withdrawals" ON partner_withdrawals
    FOR INSERT WITH CHECK (
        partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
    );

-- Admins podem gerenciar todos os saques
CREATE POLICY "Admins manage withdrawals" ON partner_withdrawals
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE is_active = true)
    );

-- =====================================================
-- 5. FUNÇÃO: CALCULAR SALDO DISPONÍVEL DO PARCEIRO
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_partner_balance(p_partner_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_total_commissions DECIMAL(10,2);
    v_total_withdrawn DECIMAL(10,2);
BEGIN
    -- Total de comissões elegíveis (assinaturas ativas há 30+ dias)
    SELECT COALESCE(SUM(
        s.monthly_amount * (p.commission_percent / 100)
    ), 0) INTO v_total_commissions
    FROM subscriptions s
    JOIN companies c ON c.id = s.company_id
    JOIN subscribers sub ON sub.id = c.subscriber_id
    JOIN partners p ON p.id = p_partner_id
    WHERE sub.referred_by = p_partner_id
      AND s.status IN ('active', 'trial')
      AND s.created_at <= NOW() - INTERVAL '30 days';

    -- Total já sacado (não cancelado/rejeitado)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawn
    FROM partner_withdrawals
    WHERE partner_id = p_partner_id
      AND status IN ('pending', 'processing', 'paid');

    RETURN GREATEST(v_total_commissions - v_total_withdrawn, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FUNÇÃO: CONTAR CLIENTES ATIVOS DO PARCEIRO
-- =====================================================

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
            SELECT COUNT(DISTINCT sub.id)
            FROM subscribers sub
            JOIN companies c ON c.subscriber_id = sub.id
            JOIN subscriptions s ON s.company_id = c.id
            WHERE sub.referred_by = p_partner_id
              AND s.status IN ('active', 'trial')
              AND s.created_at <= NOW() - INTERVAL '30 days'
        ),
        'total_revenue', (
            SELECT COALESCE(SUM(
                s.monthly_amount * (p.commission_percent / 100)
            ), 0)
            FROM subscriptions s
            JOIN companies c ON c.id = s.company_id
            JOIN subscribers sub ON sub.id = c.subscriber_id
            JOIN partners p ON p.id = p_partner_id
            WHERE sub.referred_by = p_partner_id
              AND s.status IN ('active', 'trial')
              AND s.created_at <= NOW() - INTERVAL '30 days'
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
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
