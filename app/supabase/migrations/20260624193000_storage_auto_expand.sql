-- Auto-expansão de cota de armazenamento (modelo C): opt-in, teto por ciclo,
-- cobrança recorrente no cartão tokenizado (Asaas). Falha de cobrança = bloqueia upload.

ALTER TABLE public.storage_quotas
    ADD COLUMN IF NOT EXISTS auto_expand            boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS auto_expand_cap_bytes  bigint  NOT NULL DEFAULT 214748364800, -- 200 GB
    ADD COLUMN IF NOT EXISTS auto_expand_used_bytes bigint  NOT NULL DEFAULT 0;

-- Método de pagamento tokenizado por empresa (token NUNCA exposto ao cliente).
CREATE TABLE IF NOT EXISTS public.company_payment_methods (
    company_id        uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    asaas_customer_id text,
    asaas_card_token  text,
    card_brand        text,
    card_last4        text,
    updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_payment_methods ENABLE ROW LEVEL SECURITY;
-- Sem policies: apenas service_role (Edge Functions) acessa. Clientes ficam bloqueados.
