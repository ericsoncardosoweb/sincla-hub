-- =====================================================
-- SINCLA HUB - MIGRATION 026
-- Infra para Identidade Unificada (Fase 1)
-- user_model em products, user_type em company_members,
-- tabela provision_logs
-- Data: 2026-03-25
-- =====================================================

-- ============================
-- 1. Flag B2B/B2C por Produto
-- ============================
-- Define a direção do fluxo de identidade:
-- 'b2b' = Hub é dono dos usuários, provisiona na ferramenta
-- 'b2c' = Ferramenta é dona, "Enviar pra Hub" sob demanda

ALTER TABLE products ADD COLUMN IF NOT EXISTS user_model TEXT DEFAULT 'b2b'
  CHECK (user_model IN ('b2b', 'b2c'));

-- Definir produtos B2C (ferramentas voltadas ao cliente final)
UPDATE products SET user_model = 'b2c' WHERE id IN ('leads', 'crm');
-- EAD é híbrido, mas default B2B (treinamento corporativo)
-- Empresa define se quer B2C na configuração

-- ============================
-- 2. Tipo de Acesso do Membro
-- ============================
-- Classifica o membro dentro da empresa:
-- collaborator = funcionário operacional
-- manager      = gestor que configura ferramentas
-- external     = usuário externo (consultor, contador)
-- student      = aluno/aprendiz (EAD corporativo)
-- customer     = cliente final promovido ao Hub (ex-B2C)

ALTER TABLE company_members ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'collaborator'
  CHECK (user_type IN ('collaborator', 'manager', 'external', 'student', 'customer'));

-- ============================
-- 3. Tabela de Auditoria de Provisionamento
-- ============================
-- Registra cada tentativa de provisionar/revogar acesso em ferramentas

CREATE TABLE IF NOT EXISTS provision_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_member_id UUID REFERENCES company_members(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    product_id VARCHAR(50) REFERENCES products(id),
    subscriber_id UUID REFERENCES subscribers(id) ON DELETE SET NULL,

    action TEXT NOT NULL CHECK (action IN ('provision', 'revoke', 'sync')),
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),

    error_message TEXT,
    request_payload JSONB,
    response_data JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provision_logs_member ON provision_logs(company_member_id);
CREATE INDEX idx_provision_logs_company ON provision_logs(company_id);
CREATE INDEX idx_provision_logs_status ON provision_logs(status);
CREATE INDEX idx_provision_logs_created ON provision_logs(created_at DESC);

-- RLS
ALTER TABLE provision_logs ENABLE ROW LEVEL SECURITY;

-- Admins podem ver logs da sua empresa
CREATE POLICY "Company admins view provision logs" ON provision_logs
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM company_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );
