-- Fase 4 (pricing) — correções comerciais + custo real no service_usage_log
-- 1) Pacotes de storage com desconto por volume (avulso R$1/GB → pacotes mais baratos)
-- 2) Storage incluído competitivo (PF 25GB / PJ 100GB) + franquia de banda por plano
-- 3) Trigger que calcula total_cost_brl/total_resale_brl por GB (fonte: service_pricing),
--    corrigindo o custo que zerava por usar custo por byte em numeric(12,6).

-- ─── 1. Pacotes de storage ────────────────────────────────────────────────────
UPDATE public.service_pricing SET price_brl = 9.00,  cost_brl = 5.00,  updated_at = now()
    WHERE service_type = 'storage' AND unit_amount = 10737418240;   -- +10 GB
UPDATE public.service_pricing SET price_brl = 40.00, cost_brl = 25.00, updated_at = now()
    WHERE service_type = 'storage' AND unit_amount = 53687091200;   -- +50 GB

INSERT INTO public.service_pricing (service_type, name, unit_amount, unit_label, cost_brl, price_brl, volume_discount_percent, is_active, sort_order)
SELECT 'storage', 'Pacote Storage +200 GB/mês', 214748364800, '200 GB', 100.00, 140.00, 0, true,
       COALESCE((SELECT MAX(sort_order) FROM public.service_pricing), 0) + 1
WHERE NOT EXISTS (
    SELECT 1 FROM public.service_pricing WHERE service_type = 'storage' AND unit_amount = 214748364800
);

-- ─── 2. Planos base: storage incluído + franquia de banda ──────────────────────
UPDATE public.product_plans
   SET limits = jsonb_set(jsonb_set(limits, '{storage_gb}', '25'), '{bandwidth_gb}', '100'),
       updated_at = now()
 WHERE product_id = 'ead' AND slug = 'ead-pf';

UPDATE public.product_plans
   SET limits = jsonb_set(jsonb_set(limits, '{storage_gb}', '100'), '{bandwidth_gb}', '500'),
       updated_at = now()
 WHERE product_id = 'ead' AND slug = 'ead-pj';

-- ─── 3. Custo correto no service_usage_log ─────────────────────────────────────
-- total_* são colunas GERADAS (quantity * unit_cost). quantity é em unidade nativa
-- (bytes p/ storage). O custo por byte (~4,7e-10) não cabia em numeric(12,6) e zerava.
-- Solução: widenizar a precisão do custo unitário (custo POR BYTE/unidade nativa).

ALTER TABLE public.service_usage_log DROP COLUMN IF EXISTS total_cost_brl;
ALTER TABLE public.service_usage_log DROP COLUMN IF EXISTS total_resale_brl;

ALTER TABLE public.service_usage_log
    ALTER COLUMN unit_cost_brl   TYPE numeric(24,18),
    ALTER COLUMN resale_cost_brl TYPE numeric(24,18);

ALTER TABLE public.service_usage_log
    ADD COLUMN total_cost_brl   numeric(14,2) GENERATED ALWAYS AS (round((quantity)::numeric * unit_cost_brl, 2))   STORED,
    ADD COLUMN total_resale_brl numeric(14,2) GENERATED ALWAYS AS (round((quantity)::numeric * resale_cost_brl, 2)) STORED;

-- Trigger: preenche o custo unitário (por unidade nativa) a partir de service_pricing.
CREATE OR REPLACE FUNCTION public.compute_service_usage_cost()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    base_cost   numeric;
    base_price  numeric;
    base_unit   bigint;
BEGIN
    -- Respeita custo unitário já informado explicitamente
    IF COALESCE(NEW.unit_cost_brl, 0) > 0 OR COALESCE(NEW.resale_cost_brl, 0) > 0 THEN
        RETURN NEW;
    END IF;

    -- Unidade base = menor unit_amount ativo daquele service_type (ex.: 1 GB p/ storage)
    SELECT cost_brl, price_brl, unit_amount
      INTO base_cost, base_price, base_unit
      FROM public.service_pricing
     WHERE service_type = NEW.service_type AND is_active = true
     ORDER BY unit_amount ASC
     LIMIT 1;

    IF base_unit IS NULL OR base_unit = 0 THEN
        RETURN NEW;
    END IF;

    -- custo POR unidade nativa (ex.: por byte) = preço do pacote base / tamanho do pacote
    NEW.unit_cost_brl   := base_cost  / base_unit::numeric;
    NEW.resale_cost_brl := base_price / base_unit::numeric;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_service_usage_cost ON public.service_usage_log;
CREATE TRIGGER trg_compute_service_usage_cost
    BEFORE INSERT ON public.service_usage_log
    FOR EACH ROW EXECUTE FUNCTION public.compute_service_usage_cost();

-- Backfill: recalcula custo unitário das linhas existentes (totais recalculam sozinhos)
UPDATE public.service_usage_log u
   SET unit_cost_brl   = b.cost_brl  / b.unit_amount::numeric,
       resale_cost_brl = b.price_brl / b.unit_amount::numeric
  FROM (
        SELECT DISTINCT ON (service_type) service_type, cost_brl, price_brl, unit_amount
          FROM public.service_pricing
         WHERE is_active = true
         ORDER BY service_type, unit_amount ASC
       ) b
 WHERE u.service_type = b.service_type
   AND COALESCE(u.unit_cost_brl, 0) = 0
   AND COALESCE(u.quantity, 0) > 0;
