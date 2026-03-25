-- =============================================
-- SQL para Hub Supabase: Constraints de Unicidade Global
-- =============================================
-- Executar no SQL Editor do Supabase do Hub
-- Regra: No Hub, unicidade é GLOBAL (não por empresa)

-- 1. subscribers: cpf_cnpj único (se não nulo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_unique_cpf_cnpj
  ON subscribers (cpf_cnpj)
  WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != '';

-- 2. subscribers: phone único (se não nulo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_unique_phone
  ON subscribers (phone)
  WHERE phone IS NOT NULL AND phone != '';

-- subscribers.email já é único (= auth.users.email)
-- subscribers.id = auth.uid() (naturalmente único, PK)

-- 3. Limpar possíveis duplicatas em company_members
DELETE FROM company_members a
USING company_members b
WHERE a.id > b.id
  AND a.company_id = b.company_id
  AND a.user_id = b.user_id;

-- Reforçar constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_members_unique
  ON company_members (company_id, user_id);

-- =============================================
-- FIM
-- =============================================
