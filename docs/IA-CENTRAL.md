# IA Central da Sincla

Motor único de IA do ecossistema. **Nenhuma chave de provedor (OpenAI/Groq) vive
no frontend.** Todas as ferramentas usam a mesma regra, os mesmos modelos e a
mesma fonte de chave.

## Princípio

- A chave dos provedores fica **somente** na Edge Function `ai-generate` do Hub
  (em *Edge Function Secrets*). Frontends nunca recebem `VITE_*_API_KEY` de IA.
- Provedor **principal: OpenAI**. **Fallback automático: Groq** (usado só se a
  OpenAI falhar). **Gemini: desativado** — a estrutura BYOK continua no código
  para uma fase futura, mas hoje retorna 501.

## Modelos (configuráveis por env, no Hub)

A escolha do modelo é por **tier**, não fixada no código das ferramentas:

| Tier | Quando usar | Env (Hub) | Valor atual |
|------|-------------|-----------|-------------|
| `standard` (padrão) | Tarefas **complexas**: análises, insights, geração de conteúdo, planos | `OPENAI_DEFAULT_MODEL` | `gpt-5.4-mini` |
| `light` | Tarefas **simples/curtas**: sugestões, classificação, títulos, normalização | `OPENAI_LIGHT_MODEL` | `gpt-5.4-nano` |
| (fallback) | Quando a OpenAI falha | `GROQ_FALLBACK_MODEL` | `llama-3.3-70b-versatile` |

Trocar de modelo no futuro = mudar a env no Hub. Não precisa redeploy de ferramenta.

## Secrets do Hub (Edge Function `ai-generate`)

```
OPENAI_API_KEY          # chave OpenAI (principal)
OPENAI_DEFAULT_MODEL    # gpt-5.4-mini  (tier standard / complexas)
OPENAI_LIGHT_MODEL      # gpt-5.4-nano  (tier light / simples)
GROQ_API_KEY            # chave Groq (fallback)
GROQ_FALLBACK_MODEL     # llama-3.3-70b-versatile
AI_GATEWAY_SECRET       # segredo server-to-server (proxies das ferramentas)
CROSS_TOKEN_SECRET      # validação do x-cross-token (SSO)
```

## Como uma ferramenta chama IA (padrão do app)

O frontend **não** chama provedor nem o Hub direto. Ele chama o **proxy da
própria ferramenta** (Edge Function `ai-insight`), que roda server-side, valida o
usuário, resolve o `company_id`/tenant e repassa ao Hub com o `x-service-secret`:

```
frontend (sessão da ferramenta)
   └─> Edge Function `ai-insight` (da própria ferramenta)
         • valida o usuário (Authorization)
         • resolve company_id (ex.: profiles.current_tenant_id)
         • adiciona x-service-secret (nunca exposto ao browser)
         └─> Hub `ai-generate`  → OpenAI (ou Groq no fallback)
```

Secrets do proxy `ai-insight` em **cada** ferramenta:

```
HUB_FUNCTIONS_URL    # https://<hub-ref>.supabase.co/functions/v1
AI_GATEWAY_SECRET    # mesmo segredo configurado no Hub
```

### Contrato (body e resposta)

Request (frontend → `ai-insight`; e `ai-insight` → `ai-generate`):

```jsonc
{
  "prompt": "texto obrigatório",
  "system": "instrução de sistema (opcional)",
  "tier": "standard",          // 'standard' (complexas) | 'light' (simples)
  "json": false,                // true => força resposta JSON
  "max_tokens": 800,
  "temperature": 0.4,
  "purpose": "dashboard_overview" // rótulo livre p/ logs
}
```

Resposta:

```jsonc
{ "text": "...", "provider": "openai", "model": "gpt-5.4-mini", "usage": { } }
```

> `provider` vem `"groq"` quando o fallback foi acionado.

## Entrada HTTP pelo gateway (`api.sincla.com.br`)

Para chamadas que **não** usam o client Supabase (uso server-to-server, scripts,
futuros integradores), o gateway expõe:

```
POST  https://api.sincla.com.br/v1/ai/generate
```

É um *forward* puro para o `ai-generate` do Hub — a autenticação é a mesma do
`ai-generate` (sessão do Hub, `x-cross-token` de SSO, ou `x-service-secret`). O
gateway **não** injeta segredo, para não virar proxy aberto.

## O que fica em cada frontend (`.env`)

Remover de **todas** as ferramentas (vão para o Hub/proxy):

```
VITE_GROQ_API_KEY      ❌ remover
VITE_OPENAI_API_KEY    ❌ remover
VITE_GEMINI_API_KEY    ❌ remover (Gemini não é usado)
```

Manter apenas o que aponta para o Hub/gateway (sem segredo de IA):

```
VITE_HUB_SUPABASE_URL
VITE_HUB_SUPABASE_ANON_KEY
VITE_API_BASE          # gateway central
```

## Checklist de migração por ferramenta

Para cada ferramenta que ainda chama provedor direto no frontend:

1. Garantir a Edge Function `ai-insight` (copiar de `tools/ead/supabase/functions/ai-insight`).
   - Ajustar a resolução de `company_id` ao schema da ferramenta.
   - Configurar `HUB_FUNCTIONS_URL` e `AI_GATEWAY_SECRET` como secrets.
2. Trocar cada chamada direta (`fetch` à Groq/OpenAI) por
   `supabase.functions.invoke('ai-insight', { body: { prompt, system, tier, ... } })`.
   - Manter a lógica de prompt; muda só o transporte.
   - Escolher `tier`: `standard` para conteúdo/análise; `light` para tarefas curtas.
3. Remover `VITE_GROQ_API_KEY` / `VITE_OPENAI_API_KEY` / `VITE_GEMINI_API_KEY` do
   código (`vite-env.d.ts`) e do `.env` no Easypanel.
4. **Rotacionar** as chaves antigas (já estiveram em bundles públicos).

### Estado atual

| Ferramenta | Proxy `ai-insight` | Frontend | Pendência |
|-----------|--------------------|----------|-----------|
| **Hub** | — (é a fonte: `ai-generate`) | — | Deploy do `ai-generate` (Groq fallback) + secrets |
| **EAD** | ✅ | `aiInsights.ts`, `groq.ts`, `aiAssistant.ts` ✅ via proxy | Deploy do frontend + remover `VITE_GROQ_API_KEY` no Easypanel |
| **RH** | ✅ criado | `aiInsightsService.ts`, `cargos-salarios-ia`, `GerenciarPDI` ✅ via proxy | Deploy `ai-insight`+`cargos-salarios-ia` + secrets; rebuild front; remover `VITE_GROQ_API_KEY` |
| **Vagas** | ✅ criado | `rs-ia-vagas.ts` ✅ via proxy | Deploy `ai-insight` + secrets; rebuild front; remover `VITE_OPENAI_API_KEY`/`VITE_GEMINI_API_KEY` |

Resolução de `company_id` por ferramenta no proxy:
- **EAD**: `profiles.current_tenant_id`.
- **RH**: `empresa_id` do body, validado em `usuario_empresas` (M:N).
- **Vagas**: `usuarios.auth_id → empresa_id` (1 empresa por usuário).

Em todas, `empresa.id` da ferramenta == `company_id` do Hub.
