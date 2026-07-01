-- Fase 0 / CS-2: Vocabulario de status de assinatura
-- --------------------------------------------------
-- Objetivo: ampliar o CHECK de subscriptions.status para incluir os
-- estados do ciclo de inadimplencia/cancelamento que serao usados
-- nas Fases 1 e 2, SEM alterar comportamento agora (additivo).
--
-- Estados:
--   trial            -> periodo de teste
--   active           -> em dia
--   past_due         -> vencido, dentro da tolerancia (ainda acessa)
--   frozen           -> congelado (15d+): ferramentas indisponiveis
--   suspended        -> suspenso manualmente (admin)
--   pending_deletion -> marcado para exclusao (45d+)
--   canceled         -> cancelado
--
-- Dados atuais sao todos 'active' -> nao ha violacao.

ALTER TABLE public.subscriptions
    DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_status_check
    CHECK (status::text = ANY (ARRAY[
        'trial',
        'active',
        'past_due',
        'frozen',
        'suspended',
        'pending_deletion',
        'canceled'
    ]::text[]));
