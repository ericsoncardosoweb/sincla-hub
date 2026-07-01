# Storage — Medição de banda + Auto-expansão de cota (design)

> Status: **proposta para validação** (não implementado)
> Hub (sincla-hub) · Produto `ead` (e demais satélites)
> Pré-requisito já no ar: `get-usage`, `stream-webhook`, `service_usage_log` com custo correto.

---

## 1. Objetivo

1. **Medir a banda entregue** (maior custo real do CDN) por empresa, com franquia mensal + excedente.
2. **Auto-expandir a cota de storage** quando a empresa estourar o limite, cobrando no cartão já
   cadastrado na assinatura (Asaas) e ajustando o valor recorrente — sem travar o upload.

---

## 2. Medição de banda (franquia + excedente)

### ⚠️ Limitação do Bunny (importante)
A API de estatísticas do **Bunny Stream NÃO retorna banda por vídeo/empresa** — só
`viewsChart`/`watchTimeChart` (views e tempo assistido). A banda real só existe:
- a nível de **biblioteca** (`GET /videolibrary/{id}` → `TrafficUsage` do mês) — **agregado de todos os tenants**;
- a nível de **pull zone** (`/statistics?pullZone=` → `TotalBandwidthUsed`) — idem, compartilhado.

Como a conta Bunny é uma só e o isolamento é por Collection (não por pull zone), **não há banda
real por empresa**. Portanto a banda por tenant é necessariamente uma **estimativa**.

### Método (estimativa por vídeo)
Para cada vídeo: `bitrate ≈ storageSize / length` (bytes/seg). A entrega estimada =
`watchTimeSegundos × bitrate`. Soma por `company_id`. O `watchTimeChart` vem de
`GET /library/{lib}/statistics?videoGuid={guid}&dateFrom&dateTo` (janela = ciclo do mês).

Reconciliação: somatório das estimativas deve ficar próximo do `TrafficUsage` da biblioteca
(sanity check mensal). Campo `bandwidth.estimated = true` exposto no `get-usage`.

### Mecanismo (cron diário no Hub)
- Edge Function `stream-bandwidth-sync` (agendada via `pg_cron` ou scheduler) roda 1x/dia:
  1. Para cada empresa com vídeos, soma a banda entregue no ciclo atual.
  2. Grava em `storage_quotas.bandwidth_bytes` (novo campo) + `bandwidth_by_tool`.
  3. Registra delta em `service_usage_log` (`service_type='bandwidth'`, idempotente como o stream-webhook).
- Franquia: `product_plans.limits.bandwidth_gb` (PF 100 / PJ 500 — já configurado).
- Excedente: cobrado por GB acima da franquia (preço em `service_pricing` novo `service_type='bandwidth'`).

### Itens a criar
- `ALTER TYPE service_type ADD VALUE 'bandwidth'` (enum).
- `service_pricing`: linha bandwidth (sugestão custo ≈ R$0,05/GB · preço ≈ R$0,30–0,40/GB).
- `storage_quotas`: colunas `bandwidth_bytes`, `bandwidth_quota_bytes`, `bandwidth_by_tool`.
- `get-usage`: incluir bloco `bandwidth` no retorno.

---

## 3. Auto-expansão de cota (modelo C)

### Gatilho
No `stream-upload-init` (já checa quota) e/ou no `stream-webhook`, quando
`stream_bytes + novo_upload > stream_quota_bytes`:

- **Sem auto-expansão habilitada** → retorna `quota_exceeded` (EAD mostra CTA "Ampliar espaço").
- **Com auto-expansão habilitada** (flag `storage_quotas.auto_expand = true`) → dispara expansão.

### Fluxo de cobrança (reusa Asaas existente)
```
EAD upload → stream-upload-init detecta estouro
   └─ se auto_expand:
        1. escolhe o próximo pacote (ex.: +10/+50/+200 GB) suficiente
        2. cria/atualiza recorrência no Asaas:
             - opção A (simples): createAddonPayment (cobrança avulsa no cartão) — mês corrente
             - opção B (recorrente): novo subscription_addon storage + ajuste do total
        3. credita a cota: storage_quotas.stream_quota_bytes += pacote
        4. registra em credit_purchases + service_usage_log
        5. notifica o admin (send-notification): "Seu espaço foi ampliado em X GB (R$ Y/mês)"
        6. upload prossegue sem bloqueio
```

### Peças já existentes (Hub)
- `app/src/shared/services/asaasService.ts`: `createSubscription`, `createAddonPayment`,
  `cancelSubscription`, `createOrGetCustomer`, `listPaymentsBySubscription`.
- Edge de checkout Asaas (proxy `callAsaasCheckout`).
- `subscription_addons`, `credit_purchases`, `storage_quotas`, RPC `sync_storage_quota_from_entitlements`.

### Decisões (definidas)
1. **Cobrança recorrente** mensal (o pacote ampliado soma à assinatura até o admin reduzir). ✅
2. **Opt-in**: auto-expansão **desligada por padrão**; o admin habilita em "Seu plano" com **teto**. ✅
3. **Teto**: **+200 GB/ciclo** automático; acima disso pede confirmação manual (`needs_confirmation`). ✅
4. **Falha de cobrança**: **bloqueia o upload** (`payment_failed`) — não libera sem cobrança aprovada. ✅
5. **Pacote escolhido**: o **menor** pacote (+10/+50/+200 GB) que cobre a necessidade. ✅

---

## STATUS DE IMPLEMENTAÇÃO (24/06/2026)

Backend completo e no ar. UI opt-in pendente.

| Peça | Estado |
|------|--------|
| `storage_quotas`: `auto_expand` (default false), `auto_expand_cap_bytes` (200 GB), `auto_expand_used_bytes` | ✅ migração `20260624193000` |
| Tabela `company_payment_methods` (token cartão, RLS service-role only) | ✅ |
| `asaas-checkout` v16: captura `creditCard.creditCardToken` → `company_payment_methods` (bloco aditivo isolado) | ✅ |
| Edge `storage-auto-expand` v1: menor pacote, teto, cobra token recorrente, sobe quota, log + notifica | ✅ |
| `stream-upload-init` v2: ao estourar quota com `auto_expand` on, chama auto-expand; falha = 402 block | ✅ |
| Cron mensal reset `auto_expand_used_bytes` (dia 1, 03:00) | ✅ `reset-auto-expand-cycle` |
| **UI Hub**: toggle opt-in + teto em "Seu plano"/consumo (admin) | ⏳ pendente |
| **Validação sandbox**: checkout salva token + cobrança via `creditCardToken` (checar `remoteIp`) | ⏳ pendente |

> Como `auto_expand` nasce **false** e exige `company_payment_methods` populado (token salvo no
> próximo checkout com cartão), **ninguém é cobrado** até habilitar explicitamente. Ativar em prod
> só após validar em sandbox que: (a) o checkout salva o token; (b) cobrança com `creditCardToken`
> passa sem exigir `remoteIp`/CCV. Se o Asaas exigir `remoteIp`, ajustar a `storage-auto-expand`
> para enviar um IP fixo no payload.

---

## 4. Ordem de implementação sugerida

| Etapa | Entrega | Risco |
|-------|---------|-------|
| 1 | `service_type='bandwidth'` + `service_pricing` + colunas em `storage_quotas` | baixo |
| 2 | `stream-bandwidth-sync` (cron) + `get-usage` com banda | médio |
| 3 | Flag `auto_expand` + UI "Seu plano" (opt-in + teto) | baixo |
| 4 | Auto-expansão no `stream-upload-init` + cobrança Asaas | **alto (toca dinheiro)** |
| 5 | Alertas 80%/100% de storage e banda (send-notification) | baixo |

> Etapa 4 só após validação das 4 decisões acima e teste em sandbox Asaas.
