-- =====================================================
-- SINCLA HUB - SCHEMA CENTRAL
-- Migration: 001_initial_schema.sql
-- Data: 2026-02-02
-- =====================================================

-- =====================================================
-- CAMADA 1: ASSINANTES (Donos das empresas)
-- =====================================================

-- Assinantes (pessoa que paga - pode ter várias empresas)
CREATE TABLE IF NOT EXISTS subscribers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(20),
    cpf_cnpj VARCHAR(18),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscribers_updated_at
    BEFORE UPDATE ON subscribers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CAMADA 2: EMPRESAS (Multi-tenant por assinante)
-- =====================================================

-- Empresas (cada assinante pode ter várias)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    
    -- Identificação
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    cnpj VARCHAR(18),
    
    -- Personalização (Branding)
    custom_domain VARCHAR(255),
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#0087ff',
    secondary_color VARCHAR(7) DEFAULT '#ff8c00',
    
    -- Contexto da empresa (para IA e outras plataformas)
    description TEXT,
    industry VARCHAR(100),
    employee_count INT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'canceled')),
    settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_companies_subscriber ON companies(subscriber_id);
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_status ON companies(status);

-- =====================================================
-- CAMADA 3: MEMBROS (Usuários dentro de empresas)
-- =====================================================

-- Membros de empresas (colaboradores, gestores, etc.)
CREATE TABLE IF NOT EXISTS company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    
    invited_by UUID REFERENCES subscribers(id),
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, user_id)
);

CREATE TRIGGER update_company_members_updated_at
    BEFORE UPDATE ON company_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_company_members_company ON company_members(company_id);
CREATE INDEX idx_company_members_user ON company_members(user_id);
CREATE INDEX idx_company_members_role ON company_members(role);

-- =====================================================
-- CAMADA 4: PRODUTOS E ASSINATURAS
-- =====================================================

-- Catálogo de produtos Sincla
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    base_url VARCHAR(255) NOT NULL,
    webhook_url VARCHAR(255),
    webhook_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dados iniciais dos produtos
INSERT INTO products (id, name, description, icon, base_url) VALUES
    ('rh', 'Sincla RH', 'Sistema de gestão para RH com I.A', 'IconUsers', 'https://rh.sincla.com.br'),
    ('ead', 'Sincla EAD', 'Central de cursos e treinamentos a distância', 'IconSchool', 'https://ead.sincla.com.br'),
    ('leads', 'Sincla Leads', 'Plataforma de captura de Leads com construtor de LPs', 'IconTarget', 'https://leads.sincla.com.br'),
    ('agenda', 'Sincla Agenda', 'Gestão de reuniões, compromissos e produtividade', 'IconCalendar', 'https://agenda.sincla.com.br'),
    ('intranet', 'Sincla Intranet', 'Sistema de comunicação para empresas', 'IconBuildingCommunity', 'https://intranet.sincla.com.br')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    base_url = EXCLUDED.base_url;

-- Assinaturas por EMPRESA (não por assinante)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id),
    
    plan VARCHAR(50) DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'business', 'enterprise')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'trial', 'past_due', 'canceled', 'suspended')),
    
    seats_limit INT DEFAULT 5,
    seats_used INT DEFAULT 0,
    
    -- Gateway de pagamento
    external_subscription_id VARCHAR(255),
    external_customer_id VARCHAR(255),
    
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, product_id)
);

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_product ON subscriptions(product_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Acesso de membros a produtos específicos
CREATE TABLE IF NOT EXISTS member_product_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_member_id UUID NOT NULL REFERENCES company_members(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id),
    
    access_level VARCHAR(50) DEFAULT 'user' CHECK (access_level IN ('admin', 'manager', 'user', 'viewer')),
    
    granted_by UUID REFERENCES subscribers(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_member_id, product_id)
);

-- Índices
CREATE INDEX idx_member_product_access_member ON member_product_access(company_member_id);
CREATE INDEX idx_member_product_access_product ON member_product_access(product_id);

-- =====================================================
-- CAMADA 5: CONTATOS E SINCRONIZAÇÃO
-- =====================================================

-- Contatos centralizados (fonte de verdade)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Dados básicos
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Metadados
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    
    -- Origem
    source_product VARCHAR(50) REFERENCES products(id),
    source_id VARCHAR(255),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_source ON contacts(source_product);

-- Configuração de sincronização por empresa/produto
CREATE TABLE IF NOT EXISTS sync_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id),
    
    -- Controle de sincronização
    sync_enabled BOOLEAN DEFAULT true,
    sync_direction VARCHAR(20) DEFAULT 'both' CHECK (sync_direction IN ('to_hub', 'from_hub', 'both')),
    sync_contacts BOOLEAN DEFAULT true,
    sync_tags BOOLEAN DEFAULT true,
    
    -- Filtros (só sincroniza contatos com essas tags)
    filter_tags JSONB DEFAULT '[]',
    
    -- Mapeamento de campos customizados
    field_mapping JSONB DEFAULT '{}',
    
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20),
    last_sync_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, product_id)
);

CREATE TRIGGER update_sync_settings_updated_at
    BEFORE UPDATE ON sync_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Log de sincronizações
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id),
    
    direction VARCHAR(20) CHECK (direction IN ('to_hub', 'from_hub')),
    records_synced INT DEFAULT 0,
    records_created INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    records_failed INT DEFAULT 0,
    error_details JSONB,
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_sync_logs_company ON sync_logs(company_id);
CREATE INDEX idx_sync_logs_product ON sync_logs(product_id);
CREATE INDEX idx_sync_logs_started ON sync_logs(started_at DESC);

-- =====================================================
-- CAMADA 6: TOKENS E INTEGRAÇÕES
-- =====================================================

-- Tokens de API para produtos externos
CREATE TABLE IF NOT EXISTS api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id),
    
    token_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    scopes JSONB DEFAULT '["read"]',
    
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_api_tokens_company ON api_tokens(company_id);
CREATE INDEX idx_api_tokens_product ON api_tokens(product_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_product_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

-- Usuário vê seus próprios dados
CREATE POLICY "Users view own subscriber data" ON subscribers
    FOR ALL USING (id = auth.uid());

-- Usuário vê empresas onde é membro ou é dono
CREATE POLICY "Users view own companies" ON companies
    FOR SELECT USING (
        id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
        OR subscriber_id = auth.uid()
    );

-- Usuário pode criar empresa se for assinante
CREATE POLICY "Users can create companies" ON companies
    FOR INSERT WITH CHECK (subscriber_id = auth.uid());

-- Usuário pode editar empresa se for owner ou admin
CREATE POLICY "Users can update own companies" ON companies
    FOR UPDATE USING (
        subscriber_id = auth.uid()
        OR id IN (
            SELECT company_id FROM company_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Usuário vê membros das suas empresas
CREATE POLICY "Users view company members" ON company_members
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
    );

-- Admins podem gerenciar membros
CREATE POLICY "Admins manage company members" ON company_members
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Usuário vê assinaturas das suas empresas
CREATE POLICY "Users view company subscriptions" ON subscriptions
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
    );

-- Usuário vê acessos das suas empresas
CREATE POLICY "Users view member access" ON member_product_access
    FOR SELECT USING (
        company_member_id IN (
            SELECT id FROM company_members 
            WHERE company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
        )
    );

-- Usuário vê contatos das suas empresas
CREATE POLICY "Users view company contacts" ON contacts
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
    );

-- Usuário pode criar/editar contatos nas suas empresas
CREATE POLICY "Users manage company contacts" ON contacts
    FOR ALL USING (
        company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
    );

-- Usuário vê configurações de sync das suas empresas
CREATE POLICY "Users view sync settings" ON sync_settings
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
    );

-- Admins podem gerenciar sync settings
CREATE POLICY "Admins manage sync settings" ON sync_settings
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Usuário vê logs de sync das suas empresas
CREATE POLICY "Users view sync logs" ON sync_logs
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
    );

-- Usuário vê tokens das suas empresas
CREATE POLICY "Users view api tokens" ON api_tokens
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid())
    );

-- Admins podem gerenciar tokens
CREATE POLICY "Admins manage api tokens" ON api_tokens
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- FUNCTIONS AUXILIARES
-- =====================================================

-- Função para criar subscriber automaticamente após auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscribers (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar subscriber
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para criar member automaticamente quando criar empresa
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.company_members (company_id, user_id, role, status, joined_at)
    VALUES (NEW.id, NEW.subscriber_id, 'owner', 'active', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar member owner
CREATE TRIGGER on_company_created
    AFTER INSERT ON companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();

-- Função para gerar slug único
CREATE OR REPLACE FUNCTION public.generate_unique_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
    slug TEXT;
    counter INT := 0;
BEGIN
    -- Remove caracteres especiais e converte para lowercase
    slug := lower(regexp_replace(base_name, '[^a-zA-Z0-9]+', '-', 'g'));
    slug := trim(both '-' from slug);
    
    -- Verifica se já existe
    WHILE EXISTS (SELECT 1 FROM companies WHERE companies.slug = slug) LOOP
        counter := counter + 1;
        slug := lower(regexp_replace(base_name, '[^a-zA-Z0-9]+', '-', 'g'));
        slug := trim(both '-' from slug) || '-' || counter::TEXT;
    END LOOP;
    
    RETURN slug;
END;
$$ LANGUAGE plpgsql;
