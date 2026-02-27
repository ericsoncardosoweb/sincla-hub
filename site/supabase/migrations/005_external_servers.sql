-- =====================================================
-- SINCLA HUB - SERVIDORES EXTERNOS + INFRAESTRUTURA
-- Migration: 005_external_servers.sql
-- Data: 2026-02-22
-- =====================================================

-- =====================================================
-- 1. TABELA DE SERVIDORES EXTERNOS
-- =====================================================

CREATE TABLE IF NOT EXISTS external_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação
    name VARCHAR(100) NOT NULL,              -- "Servidor Premium 01"
    url VARCHAR(255) NOT NULL,               -- "https://sincla-srv01.easypanel.host"
    provider VARCHAR(50) DEFAULT 'easypanel', -- easypanel | aws | gcp | azure
    region VARCHAR(50) DEFAULT 'br-south',   -- Região do servidor
    
    -- Capacidade
    max_companies INT DEFAULT 50,            -- Quantas empresas suporta
    
    -- Status e Saúde
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'maintenance', 'offline', 'provisioning')),
    last_health_check TIMESTAMPTZ,
    health_status JSONB DEFAULT '{}',        -- {cpu_percent, memory_percent, disk_percent, latency_ms, uptime}
    
    -- Configuração de Database (opcional — para servidores com DB dedicado)
    db_host VARCHAR(255),
    db_port INT DEFAULT 5432,
    db_name VARCHAR(100),
    db_credentials_encrypted TEXT,           -- AES-encrypted credentials
    has_database BOOLEAN DEFAULT false,
    
    -- Metadados
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_external_servers_updated_at
    BEFORE UPDATE ON external_servers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_external_servers_status ON external_servers(status);

-- =====================================================
-- 2. CAMPOS DE MODO EXTERNO EM COMPANIES
-- =====================================================

-- Vincular empresa a servidor externo
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS external_server_id UUID REFERENCES external_servers(id) ON DELETE SET NULL;

-- Flag de modo externo ativo
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS external_mode BOOLEAN DEFAULT false;

-- Flag de banco de dados dedicado
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS external_db_enabled BOOLEAN DEFAULT false;

-- Detalhes da conexão externa do DB (quando ativo)
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS external_db_config JSONB DEFAULT NULL;
-- Formato: { "host": "...", "port": 5432, "database": "...", "migrated_at": "2026-...", "version": "1.0" }

-- Índice para queries rápidas
CREATE INDEX IF NOT EXISTS idx_companies_external_server ON companies(external_server_id);
CREATE INDEX IF NOT EXISTS idx_companies_external_mode ON companies(external_mode) WHERE external_mode = true;

-- =====================================================
-- 3. RLS PARA EXTERNAL_SERVERS
-- =====================================================

ALTER TABLE external_servers ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver servidores
CREATE POLICY "Admins can view servers" ON external_servers
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE is_active = true)
    );

-- Apenas admins podem gerenciar servidores
CREATE POLICY "Admins can manage servers" ON external_servers
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM admin_users WHERE is_active = true)
    );

-- =====================================================
-- 4. FUNÇÃO: CONTAR EMPRESAS POR SERVIDOR
-- =====================================================

CREATE OR REPLACE FUNCTION get_server_stats(p_server_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_companies', COUNT(*),
        'active_companies', COUNT(*) FILTER (WHERE c.status = 'active'),
        'companies_with_db', COUNT(*) FILTER (WHERE c.external_db_enabled = true)
    ) INTO v_result
    FROM companies c
    WHERE c.external_server_id = p_server_id
      AND c.external_mode = true;
    
    RETURN COALESCE(v_result, '{"total_companies": 0, "active_companies": 0, "companies_with_db": 0}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FUNÇÃO: RESOLVER SERVIDOR DE UMA EMPRESA
-- =====================================================

CREATE OR REPLACE FUNCTION resolve_company_server(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
    v_company RECORD;
    v_server RECORD;
    v_product RECORD;
BEGIN
    -- Buscar empresa
    SELECT 
        c.id, c.external_mode, c.external_server_id, 
        c.external_db_enabled, c.external_db_config
    INTO v_company
    FROM companies c
    WHERE c.id = p_company_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Company not found');
    END IF;
    
    -- Se modo externo ativo, retornar servidor dedicado
    IF v_company.external_mode AND v_company.external_server_id IS NOT NULL THEN
        SELECT s.url, s.status, s.has_database
        INTO v_server
        FROM external_servers s
        WHERE s.id = v_company.external_server_id
          AND s.status = 'active';
        
        IF FOUND THEN
            RETURN json_build_object(
                'mode', 'external',
                'server_url', v_server.url,
                'server_status', v_server.status,
                'has_dedicated_db', v_company.external_db_enabled,
                'db_config', CASE WHEN v_company.external_db_enabled 
                    THEN v_company.external_db_config 
                    ELSE NULL 
                END
            );
        END IF;
    END IF;
    
    -- Modo padrão: usar URL do produto
    RETURN json_build_object(
        'mode', 'shared',
        'server_url', NULL,
        'server_status', 'active',
        'has_dedicated_db', false,
        'db_config', NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. VIEW: VISÃO GERAL DE SERVIDORES (admin)
-- =====================================================

CREATE OR REPLACE VIEW admin_servers_overview AS
SELECT 
    s.id,
    s.name,
    s.url,
    s.provider,
    s.region,
    s.status,
    s.max_companies,
    s.has_database,
    s.last_health_check,
    s.health_status,
    s.created_at,
    COUNT(c.id) AS connected_companies,
    s.max_companies - COUNT(c.id) AS available_slots,
    COUNT(c.id) FILTER (WHERE c.external_db_enabled = true) AS companies_with_db
FROM external_servers s
LEFT JOIN companies c ON c.external_server_id = s.id AND c.external_mode = true
GROUP BY s.id;
