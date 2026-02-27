-- =====================================================
-- SINCLA HUB - CONTATOS CENTRALIZADOS
-- Migration: 011_company_contacts.sql
-- Data: 2026-02-26
-- Descrição: Base centralizada de contatos por empresa.
-- Todas as ferramentas enviam contatos para esta tabela.
-- =====================================================

-- Tabela de contatos centralizada
CREATE TABLE IF NOT EXISTS company_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identificação
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    cpf VARCHAR(14),
    
    -- Classificação
    contact_type VARCHAR(50) DEFAULT 'Contato',  -- Lead, Colaborador, Parceiro, Cliente, Fornecedor...
    source VARCHAR(50) DEFAULT 'manual',          -- manual, sincla-rh, sincla-crm, sincla-ead, import...
    tags JSONB DEFAULT '[]',
    
    -- Dados extras (flexível por ferramenta)
    metadata JSONB DEFAULT '{}',
    
    -- Observações
    notes TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger de updated_at
CREATE TRIGGER update_company_contacts_updated_at
    BEFORE UPDATE ON company_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Índices de performance
CREATE INDEX idx_company_contacts_company ON company_contacts(company_id);
CREATE INDEX idx_company_contacts_type ON company_contacts(company_id, contact_type);
CREATE INDEX idx_company_contacts_status ON company_contacts(company_id, status);
CREATE INDEX idx_company_contacts_source ON company_contacts(company_id, source);
CREATE INDEX idx_company_contacts_name ON company_contacts(company_id, name);

-- Constraints de unicidade parcial (evita duplicatas por empresa)
CREATE UNIQUE INDEX idx_contacts_unique_email 
    ON company_contacts(company_id, email) 
    WHERE email IS NOT NULL AND email != '';

CREATE UNIQUE INDEX idx_contacts_unique_cpf 
    ON company_contacts(company_id, cpf) 
    WHERE cpf IS NOT NULL AND cpf != '';

CREATE UNIQUE INDEX idx_contacts_unique_whatsapp 
    ON company_contacts(company_id, whatsapp) 
    WHERE whatsapp IS NOT NULL AND whatsapp != '';

-- RLS
ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;

-- Policy: membros da empresa podem ver contatos
CREATE POLICY "company_contacts_select" ON company_contacts
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Policy: membros ativos podem inserir contatos
CREATE POLICY "company_contacts_insert" ON company_contacts
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM company_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Policy: membros ativos podem atualizar contatos
CREATE POLICY "company_contacts_update" ON company_contacts
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM company_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Policy: admins e owners podem deletar contatos
CREATE POLICY "company_contacts_delete" ON company_contacts
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM company_members 
            WHERE user_id = auth.uid() 
            AND status = 'active'
            AND role IN ('owner', 'admin')
        )
    );
