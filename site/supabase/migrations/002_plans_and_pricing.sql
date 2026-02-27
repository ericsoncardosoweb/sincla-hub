-- =====================================================
-- SINCLA HUB - PLANOS E PREÇOS
-- Migration: 002_plans_and_pricing.sql
-- Data: 2026-02-02
-- =====================================================

-- =====================================================
-- PLANOS DE PRODUTOS
-- =====================================================

-- Planos disponíveis para cada produto
CREATE TABLE IF NOT EXISTS product_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Identificação
    name VARCHAR(100) NOT NULL, -- 'Starter', 'Pro', 'Business', 'Enterprise'
    slug VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Limites e Features
    features JSONB DEFAULT '[]', -- Array de features incluídas
    limits JSONB DEFAULT '{}', -- Ex: {"seats": 5, "storage_gb": 10}
    
    -- Preços
    price_monthly DECIMAL(10,2) DEFAULT 0, -- Preço mensal
    price_yearly DECIMAL(10,2) DEFAULT 0,  -- Preço anual (total)
    price_setup DECIMAL(10,2) DEFAULT 0,   -- Taxa de setup
    
    -- Descontos
    discount_yearly_percent INT DEFAULT 0, -- % de desconto no anual
    
    -- Configurações
    is_active BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false, -- Destacar como "mais popular"
    sort_order INT DEFAULT 0,
    
    -- Metadados
    trial_days INT DEFAULT 14,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(product_id, slug)
);

CREATE TRIGGER update_product_plans_updated_at
    BEFORE UPDATE ON product_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_product_plans_product ON product_plans(product_id);
CREATE INDEX idx_product_plans_active ON product_plans(is_active);

-- =====================================================
-- ATRIBUTOS/FEATURES DE PLANOS
-- =====================================================

-- Features que podem ser ativadas/desativadas por plano
CREATE TABLE IF NOT EXISTS plan_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    
    -- Categoria
    category VARCHAR(50), -- 'users', 'storage', 'integrations', 'support', etc.
    
    -- Tipo de valor
    value_type VARCHAR(20) DEFAULT 'boolean' CHECK (value_type IN ('boolean', 'number', 'text')),
    
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valores de features por plano
CREATE TABLE IF NOT EXISTS plan_feature_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES product_plans(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES plan_features(id) ON DELETE CASCADE,
    
    -- Valor (depende do value_type da feature)
    value_boolean BOOLEAN,
    value_number INT,
    value_text VARCHAR(255),
    
    UNIQUE(plan_id, feature_id)
);

-- =====================================================
-- USUÁRIOS ADMIN (Super Admins do Hub)
-- =====================================================

-- Admins do sistema (você e sua equipe)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support')),
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ATUALIZAR TABELA DE ASSINATURAS
-- =====================================================

-- Adicionar referência ao plano
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES product_plans(id);

-- Adicionar campos de billing
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS monthly_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS setup_fee_paid BOOLEAN DEFAULT false;

-- =====================================================
-- RLS PARA NOVAS TABELAS
-- =====================================================

-- Plans são públicos para leitura (todos podem ver planos disponíveis)
ALTER TABLE product_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active plans" ON product_plans
    FOR SELECT USING (is_active = true);

-- Features são públicas
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view features" ON plan_features
    FOR SELECT USING (is_active = true);

-- Feature values são públicos
ALTER TABLE plan_feature_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view feature values" ON plan_feature_values
    FOR SELECT USING (true);

-- Admin users só podem ser vistos por outros admins
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view admin users" ON admin_users
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE is_active = true)
    );

-- =====================================================
-- DADOS INICIAIS DE PLANOS
-- =====================================================

-- Planos para Sincla RH
INSERT INTO product_plans (product_id, name, slug, description, price_monthly, price_yearly, price_setup, discount_yearly_percent, features, limits, sort_order, is_popular) VALUES
('rh', 'Starter', 'starter', 'Ideal para pequenas empresas começando com RH', 97.00, 970.00, 0, 17, 
 '["Gestão de funcionários", "Folha de pagamento básica", "Relatórios simples"]',
 '{"seats": 5, "storage_gb": 5}', 1, false),
('rh', 'Pro', 'pro', 'Para empresas em crescimento com necessidades avançadas', 197.00, 1970.00, 0, 17,
 '["Tudo do Starter", "Recrutamento", "Avaliações de desempenho", "Integrações"]',
 '{"seats": 25, "storage_gb": 25}', 2, true),
('rh', 'Business', 'business', 'Solução completa para médias empresas', 397.00, 3970.00, 500.00, 17,
 '["Tudo do Pro", "IA para recrutamento", "Customização avançada", "Suporte prioritário"]',
 '{"seats": 100, "storage_gb": 100}', 3, false),
('rh', 'Enterprise', 'enterprise', 'Para grandes corporações com necessidades específicas', 0, 0, 0, 0,
 '["Tudo do Business", "Usuários ilimitados", "SLA dedicado", "Gerente de conta"]',
 '{"seats": -1, "storage_gb": -1}', 4, false);

-- Planos para Sincla EAD
INSERT INTO product_plans (product_id, name, slug, description, price_monthly, price_yearly, price_setup, discount_yearly_percent, features, limits, sort_order, is_popular) VALUES
('ead', 'Starter', 'starter', 'Comece a criar seus cursos online', 67.00, 670.00, 0, 17,
 '["Até 5 cursos", "Certificados básicos", "Relatórios simples"]',
 '{"courses": 5, "students": 100, "storage_gb": 10}', 1, false),
('ead', 'Pro', 'pro', 'Para criadores de conteúdo profissionais', 147.00, 1470.00, 0, 17,
 '["Cursos ilimitados", "Gamificação", "Integrações", "Domínio personalizado"]',
 '{"courses": -1, "students": 500, "storage_gb": 50}', 2, true),
('ead', 'Business', 'business', 'Academia corporativa completa', 297.00, 2970.00, 300.00, 17,
 '["Tudo do Pro", "White-label", "API", "Suporte prioritário"]',
 '{"courses": -1, "students": 2000, "storage_gb": 200}', 3, false);

-- Planos para Sincla Leads
INSERT INTO product_plans (product_id, name, slug, description, price_monthly, price_yearly, price_setup, discount_yearly_percent, features, limits, sort_order, is_popular) VALUES
('leads', 'Starter', 'starter', 'Capture leads com landing pages profissionais', 47.00, 470.00, 0, 17,
 '["3 landing pages", "Formulários", "Integrações básicas"]',
 '{"landing_pages": 3, "leads": 500}', 1, false),
('leads', 'Pro', 'pro', 'Escale sua captura de leads', 97.00, 970.00, 0, 17,
 '["Landing pages ilimitadas", "A/B Testing", "Automações", "Pixel tracking"]',
 '{"landing_pages": -1, "leads": 5000}', 2, true),
('leads', 'Business', 'business', 'Para agências e equipes de marketing', 197.00, 1970.00, 200.00, 17,
 '["Tudo do Pro", "Multi-domínio", "API", "White-label"]',
 '{"landing_pages": -1, "leads": -1}', 3, false);

-- Planos para Sincla Agenda
INSERT INTO product_plans (product_id, name, slug, description, price_monthly, price_yearly, price_setup, discount_yearly_percent, features, limits, sort_order, is_popular) VALUES
('agenda', 'Free', 'free', 'Grátis para sempre para uso pessoal', 0, 0, 0, 0,
 '["Calendário pessoal", "3 agendamentos/mês", "Lembretes por email"]',
 '{"bookings_per_month": 3, "calendars": 1}', 1, false),
('agenda', 'Pro', 'pro', 'Para profissionais autônomos', 37.00, 370.00, 0, 17,
 '["Agendamentos ilimitados", "Múltiplos calendários", "Página de agendamento", "Integrações"]',
 '{"bookings_per_month": -1, "calendars": 5}', 2, true),
('agenda', 'Team', 'team', 'Para equipes e empresas', 97.00, 970.00, 0, 17,
 '["Tudo do Pro", "Calendário de equipe", "Salas de reunião", "Relatórios"]',
 '{"bookings_per_month": -1, "calendars": -1, "team_members": 25}', 3, false);

-- Planos para Sincla Intranet
INSERT INTO product_plans (product_id, name, slug, description, price_monthly, price_yearly, price_setup, discount_yearly_percent, features, limits, sort_order, is_popular) VALUES
('intranet', 'Starter', 'starter', 'Comunicação interna simplificada', 97.00, 970.00, 0, 17,
 '["Feed de notícias", "Diretório de funcionários", "Documentos"]',
 '{"users": 25, "storage_gb": 10}', 1, false),
('intranet', 'Pro', 'pro', 'Intranet completa para sua empresa', 197.00, 1970.00, 0, 17,
 '["Tudo do Starter", "Grupos e comunidades", "Enquetes", "Integrações"]',
 '{"users": 100, "storage_gb": 50}', 2, true),
('intranet', 'Enterprise', 'enterprise', 'Para grandes organizações', 397.00, 3970.00, 500.00, 17,
 '["Tudo do Pro", "SSO corporativo", "Customização total", "SLA"]',
 '{"users": -1, "storage_gb": 500}', 3, false);
