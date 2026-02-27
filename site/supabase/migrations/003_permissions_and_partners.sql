-- =====================================================
-- SINCLA HUB - PERMISSÕES SIMPLIFICADAS + PARCEIROS
-- Migration: 003_permissions_and_partners.sql
-- Data: 2026-02-22
-- =====================================================

-- =====================================================
-- 1. SIMPLIFICAR ACCESS_LEVEL (4 níveis → 2)
-- =====================================================

-- Remover constraint atual e adicionar nova
ALTER TABLE member_product_access 
DROP CONSTRAINT IF EXISTS member_product_access_access_level_check;

-- Migrar dados existentes
UPDATE member_product_access 
SET access_level = CASE 
    WHEN access_level IN ('admin', 'manager') THEN 'advanced'
    ELSE 'basic'
END;

-- Nova constraint: apenas 'advanced' ou 'basic'
ALTER TABLE member_product_access 
ADD CONSTRAINT member_product_access_access_level_check 
CHECK (access_level IN ('advanced', 'basic'));

-- Atualizar default
ALTER TABLE member_product_access 
ALTER COLUMN access_level SET DEFAULT 'basic';

-- =====================================================
-- 2. PARCEIROS / CONSULTORES
-- =====================================================

CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    
    -- Tipo de parceiro
    type VARCHAR(20) DEFAULT 'consultant' 
        CHECK (type IN ('consultant', 'agency', 'reseller')),
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'suspended', 'inactive')),
    
    -- Código de afiliado (para comissões futuras)
    affiliate_code VARCHAR(50) UNIQUE,
    commission_percent DECIMAL(5,2) DEFAULT 10.00,
    
    -- Dados comerciais do parceiro
    company_name VARCHAR(255),
    cnpj VARCHAR(18),
    bio TEXT,
    
    -- Especialidades (ex: ["rh", "ead"])
    specialties JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_partners_user ON partners(user_id);
CREATE INDEX idx_partners_affiliate ON partners(affiliate_code);
CREATE INDEX idx_partners_status ON partners(status);

-- =====================================================
-- 3. COMISSÕES (estrutura pronta, sem lógica ativa)
-- =====================================================

CREATE TABLE IF NOT EXISTS partner_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    
    -- Valores
    amount DECIMAL(10,2) NOT NULL,
    percent_applied DECIMAL(5,2) NOT NULL,
    
    -- Status do pagamento
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'paid', 'canceled')),
    
    -- Período da comissão
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    
    -- Referência de pagamento
    payment_reference VARCHAR(255),
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_commissions_partner ON partner_commissions(partner_id);
CREATE INDEX idx_commissions_subscription ON partner_commissions(subscription_id);
CREATE INDEX idx_commissions_status ON partner_commissions(status);

-- =====================================================
-- 4. VÍNCULOS DE AFILIAÇÃO E CONSULTORIA
-- =====================================================

-- Quem indicou o assinante (afiliação)
ALTER TABLE subscribers
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES partners(id);

-- Consultor associado à empresa (gestão ativa)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscribers_referred ON subscribers(referred_by);
CREATE INDEX IF NOT EXISTS idx_companies_partner ON companies(partner_id);

-- =====================================================
-- 5. RLS PARA NOVAS TABELAS
-- =====================================================

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;

-- Parceiro vê seus próprios dados
CREATE POLICY "Partners view own data" ON partners
    FOR ALL USING (user_id = auth.uid());

-- Admins podem ver todos os parceiros
CREATE POLICY "Admins view all partners" ON partners
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE is_active = true)
    );

-- Admins podem gerenciar parceiros
CREATE POLICY "Admins manage partners" ON partners
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE is_active = true)
    );

-- Parceiro vê suas comissões
CREATE POLICY "Partners view own commissions" ON partner_commissions
    FOR SELECT USING (
        partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
    );

-- Admins podem ver/gerenciar todas as comissões
CREATE POLICY "Admins manage commissions" ON partner_commissions
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE is_active = true)
    );

-- =====================================================
-- 6. ATUALIZAR RLS DE member_product_access
-- =====================================================

-- Admins da empresa podem conceder acesso a produtos
DROP POLICY IF EXISTS "Admins manage member product access" ON member_product_access;
CREATE POLICY "Admins manage member product access" ON member_product_access
    FOR ALL USING (
        company_member_id IN (
            SELECT cm.id FROM company_members cm
            WHERE cm.company_id IN (
                SELECT company_id FROM company_members 
                WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            )
        )
    );

-- Parceiro pode ver acessos das empresas que gerencia
CREATE POLICY "Partners view managed company access" ON member_product_access
    FOR SELECT USING (
        company_member_id IN (
            SELECT cm.id FROM company_members cm
            JOIN companies c ON c.id = cm.company_id
            JOIN partners p ON p.id = c.partner_id
            WHERE p.user_id = auth.uid()
        )
    );

-- =====================================================
-- 7. FUNÇÃO DE VERIFICAÇÃO DE PERMISSÃO
-- =====================================================

-- Retorna o nível de acesso de um usuário a um produto em uma empresa
CREATE OR REPLACE FUNCTION public.check_user_product_access(
    p_user_id UUID,
    p_company_id UUID,
    p_product_id VARCHAR(50)
) RETURNS VARCHAR(20) AS $$
DECLARE
    v_access_level VARCHAR(20);
    v_is_owner BOOLEAN;
    v_is_partner BOOLEAN;
BEGIN
    -- 1. Verificar se é o dono da empresa (subscriber_id)
    SELECT EXISTS(
        SELECT 1 FROM companies 
        WHERE id = p_company_id AND subscriber_id = p_user_id
    ) INTO v_is_owner;
    
    IF v_is_owner THEN
        RETURN 'advanced'; -- Dono sempre tem acesso total
    END IF;
    
    -- 2. Verificar acesso como membro
    SELECT mpa.access_level INTO v_access_level
    FROM member_product_access mpa
    JOIN company_members cm ON cm.id = mpa.company_member_id
    WHERE cm.user_id = p_user_id 
      AND cm.company_id = p_company_id
      AND mpa.product_id = p_product_id
      AND cm.status = 'active';
    
    IF v_access_level IS NOT NULL THEN
        RETURN v_access_level;
    END IF;
    
    -- 3. Verificar se é parceiro/consultor da empresa
    SELECT EXISTS(
        SELECT 1 FROM companies c
        JOIN partners p ON p.id = c.partner_id
        WHERE c.id = p_company_id 
          AND p.user_id = p_user_id
          AND p.status = 'active'
    ) INTO v_is_partner;
    
    IF v_is_partner THEN
        -- Parceiro consultor tem acesso avançado a todos os produtos
        RETURN 'advanced';
    END IF;
    
    -- 4. Sem acesso
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar: verificar se empresa tem assinatura ativa do produto
CREATE OR REPLACE FUNCTION public.company_has_active_subscription(
    p_company_id UUID,
    p_product_id VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM subscriptions 
        WHERE company_id = p_company_id 
          AND product_id = p_product_id
          AND status IN ('active', 'trial')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para gerar código de afiliado único
CREATE OR REPLACE FUNCTION public.generate_affiliate_code(partner_name TEXT)
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    suffix TEXT;
BEGIN
    -- Gera código base: primeiras 4 letras + 4 dígitos aleatórios
    code := upper(left(regexp_replace(partner_name, '[^a-zA-Z]', '', 'g'), 4));
    suffix := lpad((random() * 9999)::int::text, 4, '0');
    code := code || suffix;
    
    -- Verifica unicidade
    WHILE EXISTS (SELECT 1 FROM partners WHERE affiliate_code = code) LOOP
        suffix := lpad((random() * 9999)::int::text, 4, '0');
        code := upper(left(regexp_replace(partner_name, '[^a-zA-Z]', '', 'g'), 4)) || suffix;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;
