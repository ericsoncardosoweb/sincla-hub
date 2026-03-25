-- =====================================================
-- SINCLA HUB - METERING, CREDITS & STORAGE QUOTAS
-- Migration: 027_metering_and_credits.sql
-- Data: 2026-03-25
-- =====================================================
-- Infraestrutura de controle de consumo e billing para
-- os 3 serviços centralizados: IA, Storage, Notificações
-- =====================================================

-- =====================================================
-- 1. ENUM para tipos de serviço
-- =====================================================

DO $$ BEGIN
    CREATE TYPE service_type_enum AS ENUM (
        'ai',
        'storage',
        'notification_email',
        'notification_whatsapp',
        'notification_push'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. SERVICE_USAGE_LOG — Log imutável de cada consumo
-- =====================================================

CREATE TABLE IF NOT EXISTS service_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Tipo de serviço
    service_type service_type_enum NOT NULL,
    sub_type VARCHAR(50), -- 'gpt-nano', 'gpt-mini', 'gemini-flash', 'email', 'whatsapp', 'upload', 'stream'
    
    -- Origem
    tool_id VARCHAR(50), -- 'rh', 'ead', 'agenda', 'hub', etc.
    
    -- Quantidade consumida
    quantity BIGINT NOT NULL DEFAULT 0, -- tokens, bytes, unidades
    
    -- Custos
    unit_cost_brl DECIMAL(12,6) DEFAULT 0, -- Custo real unitário
    resale_cost_brl DECIMAL(12,6) DEFAULT 0, -- Preço cobrado ao cliente
    total_cost_brl DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_cost_brl) STORED,
    total_resale_brl DECIMAL(12,2) GENERATED ALWAYS AS (quantity * resale_cost_brl) STORED,
    
    -- Contexto
    metadata JSONB DEFAULT '{}', -- model, prompt_tokens, completion_tokens, file_name, etc.
    
    -- Referência ao usuário que realizou a ação
    user_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas de billing
CREATE INDEX idx_usage_company_date ON service_usage_log(company_id, created_at DESC);
CREATE INDEX idx_usage_service ON service_usage_log(service_type, created_at DESC);
CREATE INDEX idx_usage_tool ON service_usage_log(tool_id, created_at DESC);
CREATE INDEX idx_usage_company_service ON service_usage_log(company_id, service_type, created_at DESC);

-- Particionamento por mês é recomendado em produção, mas
-- para simplificar usamos tabela única com índices

COMMENT ON TABLE service_usage_log IS 'Log imutável de consumo de serviços centralizados (IA, Storage, Notificações)';

-- =====================================================
-- 3. COMPANY_CREDITS — Saldo de créditos por empresa
-- =====================================================

CREATE TABLE IF NOT EXISTS company_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    service_type service_type_enum NOT NULL,
    
    -- Saldo
    balance BIGINT NOT NULL DEFAULT 0, -- Saldo atual disponível
    
    -- Incluso no plano (resetado mensalmente)
    monthly_allowance BIGINT NOT NULL DEFAULT 0, -- Quota do plano base
    monthly_bonus BIGINT NOT NULL DEFAULT 0, -- Recorrente comprado (adicional mensal)
    
    -- Controle de reset
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    next_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
    
    -- Total consumido no período atual
    period_usage BIGINT NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, service_type)
);

CREATE TRIGGER update_company_credits_updated_at
    BEFORE UPDATE ON company_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE company_credits IS 'Saldo de créditos por empresa e tipo de serviço. Reset mensal automático.';

-- =====================================================
-- 4. CREDIT_PURCHASES — Histórico de compras
-- =====================================================

CREATE TABLE IF NOT EXISTS credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    service_type service_type_enum NOT NULL,
    
    -- Compra
    amount BIGINT NOT NULL, -- Quantidade de créditos/bytes/unidades
    price_brl DECIMAL(10,2) NOT NULL, -- Valor pago
    
    -- Tipo
    purchase_type VARCHAR(20) NOT NULL DEFAULT 'one_time'
        CHECK (purchase_type IN ('one_time', 'recurring')),
    
    -- Expiração (avulso: 30 dias; recorrente: null = reseta com assinatura)
    expires_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
    
    -- Referência de pagamento
    payment_id TEXT, -- ID externo (AbacatePay/Asaas)
    payment_method VARCHAR(20), -- 'pix', 'credit_card', 'boleto'
    
    -- Quem comprou
    purchased_by UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchases_company ON credit_purchases(company_id, created_at DESC);
CREATE INDEX idx_purchases_status ON credit_purchases(status, expires_at);

CREATE TRIGGER update_credit_purchases_updated_at
    BEFORE UPDATE ON credit_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE credit_purchases IS 'Histórico de compras de créditos (avulso e recorrente)';

-- =====================================================
-- 5. STORAGE_QUOTAS — Quota e consumo por empresa
-- =====================================================

CREATE TABLE IF NOT EXISTS storage_quotas (
    company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Storage CDN (arquivos, imagens, docs)
    storage_bytes BIGINT NOT NULL DEFAULT 0, -- Total usado
    storage_quota_bytes BIGINT NOT NULL DEFAULT 1073741824, -- Limite (default 1GB)
    storage_files_count INT NOT NULL DEFAULT 0,
    
    -- Stream (vídeos EAD)
    stream_bytes BIGINT NOT NULL DEFAULT 0,
    stream_quota_bytes BIGINT NOT NULL DEFAULT 5368709120, -- Default 5GB
    stream_files_count INT NOT NULL DEFAULT 0,
    
    -- Breakdown por ferramenta (JSONB com bytes por tool_id)
    storage_by_tool JSONB DEFAULT '{}', -- {"rh": 123456, "ead": 789012}
    stream_by_tool JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_storage_quotas_updated_at
    BEFORE UPDATE ON storage_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE storage_quotas IS 'Controle de quota de armazenamento por empresa (CDN + Stream separados)';

-- =====================================================
-- 6. PRECIFICAÇÃO — Tabela de preços por serviço
-- =====================================================

CREATE TABLE IF NOT EXISTS service_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type service_type_enum NOT NULL,
    
    -- Identificação
    name VARCHAR(100) NOT NULL, -- '1M Tokens IA', '1GB Storage', etc.
    description TEXT,
    
    -- Unidade
    unit_amount BIGINT NOT NULL, -- 1000000 (1M tokens), 1073741824 (1GB), 1000 (1k emails)
    unit_label VARCHAR(50) NOT NULL, -- '1M tokens', '1 GB', '1.000 emails'
    
    -- Preço
    cost_brl DECIMAL(10,2) NOT NULL, -- Custo real
    price_brl DECIMAL(10,2) NOT NULL, -- Preço de revenda
    
    -- Descontos por volume
    volume_discount_percent DECIMAL(5,2) DEFAULT 0, -- % desconto a cada N unidades
    volume_discount_threshold INT DEFAULT 10, -- A cada N unidades
    max_discount_percent DECIMAL(5,2) DEFAULT 30, -- Teto de desconto
    
    -- Configurações
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_service_pricing_updated_at
    BEFORE UPDATE ON service_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE service_pricing IS 'Tabela de precificação por serviço centralizado';

-- =====================================================
-- 7. SEED — Precificação inicial
-- =====================================================

INSERT INTO service_pricing (service_type, name, description, unit_amount, unit_label, cost_brl, price_brl, volume_discount_percent, volume_discount_threshold, max_discount_percent)
VALUES
    -- IA
    ('ai', 'Créditos de IA', 'Tokens para processamento de IA (GPT/Gemini)', 1000000, '1M tokens', 7.50, 15.00, 10, 10, 30),
    
    -- Storage
    ('storage', 'Armazenamento CDN', 'Espaço para arquivos, imagens e documentos', 1073741824, '1 GB', 0.50, 1.00, 0, 1, 0),
    
    -- Notificações
    ('notification_email', 'Envios de Email', 'Emails transacionais e marketing', 1000, '1.000 emails', 2.00, 3.00, 10, 5, 20),
    ('notification_whatsapp', 'Mensagens WhatsApp', 'Mensagens via WhatsApp Business', 1000, '1.000 mensagens', 15.00, 25.00, 5, 5, 15),
    ('notification_push', 'Push Notifications', 'Notificações push para web/mobile', 10000, '10.000 pushs', 0.50, 1.00, 0, 1, 0)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. FUNCTION — Debitar créditos com validação
-- =====================================================

CREATE OR REPLACE FUNCTION debit_credits(
    p_company_id UUID,
    p_service_type service_type_enum,
    p_amount BIGINT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance BIGINT;
    v_new_balance BIGINT;
BEGIN
    -- Lock para evitar race condition
    SELECT balance INTO v_current_balance
    FROM company_credits
    WHERE company_id = p_company_id AND service_type = p_service_type
    FOR UPDATE;
    
    IF v_current_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'NO_CREDITS_CONFIGURED', 'balance', 0);
    END IF;
    
    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'balance', v_current_balance, 'required', p_amount);
    END IF;
    
    v_new_balance := v_current_balance - p_amount;
    
    UPDATE company_credits
    SET balance = v_new_balance,
        period_usage = period_usage + p_amount
    WHERE company_id = p_company_id AND service_type = p_service_type;
    
    RETURN jsonb_build_object('success', true, 'balance', v_new_balance, 'debited', p_amount);
END;
$$;

COMMENT ON FUNCTION debit_credits IS 'Debita créditos com lock para evitar race condition. Retorna JSONB com success/error.';

-- =====================================================
-- 9. FUNCTION — Reset mensal de créditos
-- =====================================================

CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE company_credits
    SET 
        balance = monthly_allowance + monthly_bonus,
        period_usage = 0,
        last_reset_at = NOW(),
        next_reset_at = NOW() + INTERVAL '1 month'
    WHERE next_reset_at <= NOW();
END;
$$;

COMMENT ON FUNCTION reset_monthly_credits IS 'Reseta créditos mensais para todas as empresas com reset pendente.';

-- =====================================================
-- 10. FUNCTION — Expirar compras avulsas vencidas  
-- =====================================================

CREATE OR REPLACE FUNCTION expire_old_purchases()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT id, company_id, service_type, amount
        FROM credit_purchases
        WHERE status = 'active'
          AND expires_at IS NOT NULL
          AND expires_at <= NOW()
    LOOP
        -- Marcar como expirado
        UPDATE credit_purchases SET status = 'expired' WHERE id = r.id;
        
        -- Decrementar saldo (sem ficar negativo)
        UPDATE company_credits
        SET balance = GREATEST(0, balance - r.amount)
        WHERE company_id = r.company_id AND service_type = r.service_type;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION expire_old_purchases IS 'Expira compras avulsas vencidas e decrementa saldos.';

-- =====================================================
-- 11. RLS
-- =====================================================

ALTER TABLE service_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_pricing ENABLE ROW LEVEL SECURITY;

-- service_usage_log: membros da empresa podem ler
CREATE POLICY "usage_log_select" ON service_usage_log
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_members WHERE subscriber_id = auth.uid()
        )
    );

-- company_credits: membros da empresa podem ler
CREATE POLICY "credits_select" ON company_credits
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_members WHERE subscriber_id = auth.uid()
        )
    );

-- credit_purchases: membros podem ler
CREATE POLICY "purchases_select" ON credit_purchases
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_members WHERE subscriber_id = auth.uid()
        )
    );

-- storage_quotas: membros podem ler
CREATE POLICY "storage_select" ON storage_quotas
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_members WHERE subscriber_id = auth.uid()
        )
    );

-- service_pricing: todos podem ler (é público)
CREATE POLICY "pricing_select_all" ON service_pricing
    FOR SELECT USING (true);

-- Grants para service_role (Edge Functions)
GRANT ALL ON service_usage_log TO service_role;
GRANT ALL ON company_credits TO service_role;
GRANT ALL ON credit_purchases TO service_role;
GRANT ALL ON storage_quotas TO service_role;
GRANT ALL ON service_pricing TO service_role;

-- =====================================================
-- FIM DA MIGRATION 027
-- =====================================================
