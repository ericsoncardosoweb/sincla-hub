# Sincla Recrutamento (Vagas) — Plano de Execução

> Documento mestre para colocar o produto em produção com qualidade profissional.
> Escopo: `tools/vagas/` · Supabase `zsnjddocencekcupzxeh` · Hub · Gateway `api.sincla.com.br`

**Versão:** 1.0 · **Data:** 2026-06-26  
**Princípios inegociáveis:** LGPD · Segurança · Performance · UX · Escalabilidade · **sem gambiarras**

---

## 1. Visão e posicionamento

O **Sincla Recrutamento** é ferramenta satélite do Hub, vendida como produto `recrutamento` no catálogo. O código vive em `tools/vagas/` e o slug técnico da API permanece `vagas` (já registrado no gateway).

| Camada | Papel |
|--------|--------|
| **Hub** | Identidade, billing, SSO, troca de empresa, permissões por produto |
| **Recrutamento (app)** | Operação R&S, portal de carreiras, área do candidato |
| **Gateway (`sincla-api`)** | API pública, tokens, uploads, IA, e-mail — **nunca expor Supabase** |
| **Supabase Vagas** | Dados multi-tenant, RLS, Edge Functions internas |

### Decisão de identidade (bloqueador #0)

Unificar **tudo** no product_id **`recrutamento`**:

- Hub: catálogo, checkout, assinaturas, `generate-cross-token`
- `sso-login`: aceitar `recrutamento` (migrar assinatura legada `vagas` → `recrutamento`)
- URL de produção: `https://app.sincla.com.br/vagas/`
- Desativar produto duplicado `vagas` no Hub após migração de assinaturas

---

## 2. Personas e jornadas

| Persona | Necessidade |
|---------|-------------|
| **Empresa contratante** | Publicar vagas, triar candidatos, LGPD, portal próprio |
| **Consultoria / R&S parceira** | Operar várias empresas clientes, trocar contexto rápido |
| **Recrutador interno** | Pipeline, entrevistas, IA para textos de vaga |
| **Candidato** | Ver vagas, candidatar-se, gerir currículo, **direitos LGPD** |
| **Integrador externo** | Embutir vagas em site próprio via API tokenizada |

---

## 3. Análise heurística de usabilidade (Nielsen + contexto LGPD)

### 3.1 Portal de carreiras (`/p/{slug}/vagas`)

| Heurística | Situação atual | Diretriz |
|------------|----------------|----------|
| **Visibilidade do status** | Portal sempre tenta carregar; sem indicação se desligado | Estados claros: *Ativo*, *Somente convidados*, *Indisponível* |
| **Correspondência sistema ↔ mundo real** | URLs `/p/` vs admin `/recrutamento/` confundem | Manter `/p/{slug}` para candidatos (URL curta compartilhável); documentar |
| **Controle e liberdade** | Candidato não vê fluxo de exclusão de dados | Painel candidato com aba **Privacidade** sempre visível |
| **Consistência** | Branding parcial (logo/cor) | Herdar branding Hub via SSO + override por empresa |
| **Prevenção de erro** | Candidatura sem aceite LGPD explícito | Checkbox + link termo + registro de versão do termo |
| **Reconhecimento vs memorização** | Filtros de vaga ok | Manter busca + filtros visíveis no mobile |
| **Flexibilidade** | Portal só “público implícito” | Três modos configuráveis (ver §5.2) |
| **Estética minimalista** | UI Mantine consistente | Revisar encoding PT-BR e empty states |
| **Recuperação de erros** | Fallback Supabase expõe stack interna | Gateway obrigatório em prod; fallback só dev |
| **Ajuda** | Sem FAQ LGPD no portal | Microcopy: “Seus dados”, “Como excluir conta”, prazo inatividade |

### 3.2 Área administrativa

| Problema | Impacto | Correção |
|----------|---------|----------|
| Sem rota `/smart-access` | SSO Hub quebrado | Fase 1 |
| `useProtectedAuth` → `/` (404) | Usuário perdido | Redirect Hub ou login explicativo |
| Troca de empresa inexistente | Consultorias bloqueadas | Seletor no header (Fase 4) |
| Menu “Configurações” sem rota | Frustração | Implementar ou remover até existir |
| Entrevistas na UI, stub no backend | Erro em runtime | Esconder menu até Fase 6 ou implementar |

### 3.3 Mobile

- Portal: cards de vaga em coluna única, filtros em drawer
- Painel candidato: formulário currículo em steps (não scroll infinito)
- Admin: sidebar colapsável (já existe Burger)

---

## 4. Arquitetura alvo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         app.sincla.com.br                                │
│  Hub Dashboard ──SSO──► /recrutamento/smart-access                        │
│  Troca empresa Hub ──► novo token ou switch local (multi-empresa)       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Recrutamento  │     │ api.sincla.com  │     │ Supabase Vagas  │
│ SPA (nginx)   │     │ .br (FastAPI)   │     │ (RLS + Edge Fn) │
│               │     │                 │     │                 │
│ Admin UI      │     │ /v1/vagas/public│     │ sso-login       │
│ Portal /p/    │────►│ /v1/vagas/*     │────►│ ai-insight      │
│ Candidato     │     │ /v1/vagas/      │     │ vagas-rh-bridge │
│               │     │   candidate/*   │     │ upload-curriculo│
│               │     │ /v1/ai/generate │     │ lgpd-*          │
└───────────────┘     └─────────────────┘     └─────────────────┘
```

### 4.1 Regra de exposição (segurança)

| Tipo de chamada | Canal |
|-----------------|--------|
| Leitura pública (vagas abertas, branding) | Gateway `/v1/vagas/public/*` |
| CRUD admin (integradores) | Gateway `/v1/vagas/*` + Bearer `api_tokens` |
| SSO, bridge RH, LGPD server-side | Edge Functions (não documentadas publicamente) |
| IA, upload, e-mail | Gateway ou Edge Function com secret — **nunca browser → OpenAI/SMTP** |
| Auth candidato (fase 1) | Supabase GoTrue direto + RLS restritiva |
| Auth candidato (fase 2) | Gateway proxy auth (opcional, maior blindagem) |

---

## 5. Modelo de dados — extensões necessárias

### 5.1 Empresa — portal configurável

```sql
-- empresas (alter)
portal_modo TEXT NOT NULL DEFAULT 'PUBLICO'
  CHECK (portal_modo IN ('PUBLICO', 'PRIVADO', 'DESLIGADO')),
portal_url_slug TEXT UNIQUE,  -- default = slug
portal_exige_login BOOLEAN DEFAULT FALSE,
inativar_candidatos_meses INTEGER DEFAULT 24,  -- LGPD inatividade
```

| Modo | Comportamento |
|------|---------------|
| `PUBLICO` | Lista vagas ABERTA+EXTERNA sem login |
| `PRIVADO` | Exige login candidato ou link assinado (`?invite=`) |
| `DESLIGADO` | 404 amigável; admin continua acessível |

### 5.2 Multi-empresa (consultorias)

Espelhar padrão RH (`usuario_empresas` M:N):

```sql
CREATE TABLE usuario_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  perfil TEXT NOT NULL CHECK (perfil IN ('ADMIN','MASTER','RECRUTADOR')),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (usuario_id, empresa_id)
);
```

- SSO: upsert **todas** empresas às quais o membro Hub tem `member_product_access` para `recrutamento`
- UI: **Company Switcher** no header (lista empresas do usuário; persistir `current_empresa_id` em localStorage + validar no servidor)
- Hub continua source of truth: revogar acesso no Hub → próximo request falha

### 5.3 Delegação empresa ↔ consultoria

```sql
CREATE TABLE empresa_delegacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_contratante_id UUID NOT NULL REFERENCES empresas(id),
  empresa_parceira_id UUID NOT NULL REFERENCES empresas(id),
  permissoes JSONB NOT NULL DEFAULT '{}',
  -- ex.: {"listar_vagas":true,"gerenciar_candidatos":true,"publicar_no_portal_parceiro":true}
  status TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','ATIVA','REVOGADA')),
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (empresa_contratante_id, empresa_parceira_id)
);
```

**Fluxo:**

1. Consultoria solicita vínculo (ou contratante convida)
2. Admin da **empresa contratante** aprova no Hub ou no app Recrutamento
3. Com `publicar_no_portal_parceiro`, vagas da contratante aparecem no portal `/p/{slug-parceiro}/vagas` (badge “Cliente: X”)
4. RLS: usuário da parceira só acessa dados de contratantes com delegação `ATIVA`

### 5.4 API tokens (por conta)

```sql
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,  -- gerado server-side; exibido uma vez
  escopos TEXT[] NOT NULL DEFAULT '{vagas:read}',
  -- vagas:read | vagas:write | candidatos:read | webhook:candidatura
  rate_limit_por_minuto INTEGER DEFAULT 60,
  ativo BOOLEAN DEFAULT TRUE,
  ultimo_uso TIMESTAMPTZ,
  expira_em TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- CRUD de tokens: **somente admin** via UI “Integrações → API”
- Gateway já valida contra `api_tokens` (`tools/api/app/core/auth.py`)
- Documentação OpenAPI gerada a partir de `resources.py` + rotas públicas

### 5.5 LGPD — candidato

```sql
-- candidatos (alter)
auth_id UUID UNIQUE,
consentimento_termo_id UUID REFERENCES rs_termos_lgpd(id),
consentimento_em TIMESTAMPTZ,
consentimento_ip INET,
ultimo_acesso TIMESTAMPTZ,
status_conta TEXT DEFAULT 'ATIVA'
  CHECK (status_conta IN ('ATIVA','INATIVA_LGPD','EXCLUIDA','ANONIMIZADA')),
exclusao_solicitada_em TIMESTAMPTZ,
exclusao_concluida_em TIMESTAMPTZ,

CREATE TABLE lgpd_solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID NOT NULL REFERENCES candidatos(id),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('ACESSO','PORTABILIDADE','EXCLUSAO','REVOGACAO_CONSENTIMENTO')),
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  concluido_em TIMESTAMPTZ
);

CREATE TABLE lgpd_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade TEXT NOT NULL,
  entidade_id UUID NOT NULL,
  acao TEXT NOT NULL,
  actor_id UUID,
  actor_tipo TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Política de inatividade (24 meses — recomendado LGPD):**

1. Job diário (`pg_cron` ou Edge Function agendada): candidatos sem `ultimo_acesso` há 24 meses
2. E-mail aviso 30 dias antes (via gateway → serviço de e-mail Hub)
3. Após prazo: `status_conta = 'INATIVA_LGPD'` → anonimizar PII (nome, email, telefone, CPF, currículo); **manter** registro de candidatura anonimizado para métricas legais do processo seletivo
4. Candidato pode reativar login antes do prazo = reset contador

**Direitos no painel candidato (`/p/{slug}/privacidade`):**

- Baixar meus dados (JSON/PDF)
- Revogar consentimento (impede novas candidaturas)
- Excluir conta (fluxo com confirmação + e-mail)
- Ver termo aceito e data

---

## 6. RLS — substituir políticas permissivas

Estado atual: `USING (true)` em todas as tabelas — **inaceitável para produção**.

### 6.1 Admin/recrutador

```sql
-- Função helper
CREATE FUNCTION auth_empresa_ids() RETURNS SETOF UUID AS $$
  SELECT empresa_id FROM usuario_empresas ue
  JOIN usuarios u ON u.id = ue.usuario_id
  WHERE u.auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

Políticas por tabela: `empresa_id IN (SELECT auth_empresa_ids())` + delegações ativas.

### 6.2 Candidato

- `candidatos`: `auth_id = auth.uid()`
- `candidaturas`: via join candidato
- `vagas` SELECT público: somente `status = 'ABERTA' AND tipo_vaga = 'EXTERNA'` **e** portal_modo ≠ 'DESLIGADO'

### 6.3 Service role

- Apenas Edge Functions e gateway (server-side)
- **Remover** `VITE_SUPABASE_SERVICE_ROLE_KEY` do frontend

---

## 7. Gateway — rotas a implementar/ativar

### 7.1 Já preparado

| Rota | Uso |
|------|-----|
| `GET /v1/vagas/public/empresas/{slug}` | Branding portal |
| `GET /v1/vagas/public/vagas` | Listagem pública |
| `GET /v1/vagas/public/vagas/{id}` | Detalhe vaga |
| `GET/POST /v1/vagas/vagas` | API tokenizada (CRUD) |

### 7.2 A criar (passthrough ou handlers dedicados)

| Rota | Motivo |
|------|--------|
| `POST /v1/vagas/candidate/register` | Cadastro sem expor anon key patterns |
| `POST /v1/vagas/candidate/login` | Idem |
| `GET /v1/vagas/candidate/me` | Perfil autenticado |
| `POST /v1/vagas/candidate/lgpd/export` | Portabilidade |
| `POST /v1/vagas/candidate/lgpd/delete` | Exclusão |
| `POST /v1/vagas/uploads/curriculo` | Upload com validação MIME/tamanho |
| `POST /v1/vagas/ai/generate-texto` | Proxy → `ai-insight` (rate limit por empresa) |

**Env Easypanel `sincla-api`:**

```
VAGAS_SUPABASE_URL=https://zsnjddocencekcupzxeh.supabase.co
VAGAS_SERVICE_ROLE_KEY=<secret>
```

---

## 8. Plano de execução por fases

> Cada fase tem **critério de pronto** testável. Não iniciar fase N+1 sem N concluída.

---

### Fase 0 — Alinhamento e higiene (3–5 dias)

**Objetivo:** eliminar bloqueadores do diagnóstico sem features novas.

| # | Entrega | Detalhes |
|---|---------|----------|
| 0.1 | Repo `sincla-recrutamento` | `.git` em `tools/vagas/`, Dockerfile + nginx (`base: '/recrutamento/'`) |
| 0.2 | Unificar product_id | Migration Hub: merge `vagas` → `recrutamento`; `sso-login` aceita `recrutamento` |
| 0.3 | SmartAccess | Copiar `SinclaCallbackPage` do EAD; rotas `/recrutamento/smart-access` |
| 0.4 | Fix SSO callback | Usar `magicLink` + `origin`; redirect `/recrutamento/{slug}/dashboard` |
| 0.5 | Fix bugs imediatos | `auth_id` no candidato; encoding UTF-8; esconder Entrevistas |
| 0.6 | Deploy Easypanel | Serviço `apps/sincla-recrutamento`; envs públicas Vite |
| 0.7 | Deploy Edge Functions | `ai-insight` + secrets `HUB_FUNCTIONS_URL`, `AI_GATEWAY_SECRET` |

**Pronto quando:** usuário Hub com assinatura `recrutamento` abre app, vê dashboard, cria vaga.

---

### Fase 1 — Segurança baseline (5–7 dias)

**Objetivo:** blindagem antes de tráfego real.

| # | Entrega |
|---|---------|
| 1.1 | RLS multi-tenant real (§6) |
| 1.2 | Remover service role do browser |
| 1.3 | `api_tokens` + migration |
| 1.4 | Gateway Vagas ativo em produção |
| 1.5 | Portal usa **somente** gateway em prod (`VITE_API_BASE`) |
| 1.6 | Rate limiting gateway (por IP público + por token) |
| 1.7 | Advisors Supabase: zero critical |

**Pronto quando:** teste de penetração básico — anon key não lê dados de outra empresa.

---

### Fase 2 — Portal configurável (5–7 dias)

**Objetivo:** portal profissional com modos público/privado/desligado.

| # | Entrega |
|---|---------|
| 2.1 | Migration `portal_modo` + UI em Configurações |
| 2.2 | Gateway respeita modo (404 DESLIGADO; 401 PRIVADO sem sessão) |
| 2.3 | Estados UX: empty, loading, erro, portal desligado |
| 2.4 | Preview portal no admin (“Ver como candidato”) |
| 2.5 | SEO básico: title, meta, OG por empresa |
| 2.6 | Vaga: flag `visivel_portal` (override individual) |

**Pronto quando:** empresa alterna modos e comportamento muda sem redeploy.

---

### Fase 3 — Área do candidato + LGPD core (7–10 dias)

**Objetivo:** conformidade e autonomia do titular.

| # | Entrega |
|---|---------|
| 3.1 | Aceite termo versionado no cadastro/candidatura |
| 3.2 | Painel `/p/{slug}/privacidade` |
| 3.3 | Export JSON (portabilidade) via Edge `lgpd-export` |
| 3.4 | Exclusão conta (soft → anonimização) via Edge `lgpd-delete` |
| 3.5 | `lgpd_audit_log` em toda ação |
| 3.6 | Upload currículo via gateway (Storage bucket privado + signed URL) |
| 3.7 | Fix `getCandidatoByUserId` → `auth_id` |
| 3.8 | Comparer currículo: diff visual entre versão salva e edição atual |

**Pronto quando:** candidato exporta, exclui conta, e auditoria registra.

---

### Fase 4 — Inatividade 24 meses (3–4 dias)

| # | Entrega |
|---|---------|
| 4.1 | Campo `ultimo_acesso` atualizado a cada login/ação |
| 4.2 | Cron aviso D-30 (`pg_cron` + template e-mail) |
| 4.3 | Cron anonimização D+0 após 24 meses |
| 4.4 | Config por empresa (`inativar_candidatos_meses`, default 24) |
| 4.5 | Copy legal revisável (não bloqueante jurídico, mas claro) |

**Pronto when:** job em staging processa candidato fake inativo.

---

### Fase 5 — Multi-empresa + consultorias (7–10 dias)

**Objetivo:** parceiro R&S opera vários clientes.

| # | Entrega |
|---|---------|
| 5.1 | `usuario_empresas` + migration dados existentes |
| 5.2 | SSO cria vínculos para todas empresas Hub autorizadas |
| 5.3 | Company Switcher no header (Mantine Menu + busca) |
| 5.4 | `empresa_delegacoes` + fluxo aprovação |
| 5.5 | RLS inclui empresas delegadas |
| 5.6 | Portal parceiro: vagas de clientes com delegação |
| 5.7 | Hub Integrations: toggle “Permitir consultoria X” (sync) |

**Pronto quando:** usuário consultoria alterna 3 empresas e vê vagas corretas.

---

### Fase 6 — API para integradores (5–7 dias)

**Objetivo:** cada conta embeda vagas em sites externos.

| # | Entrega |
|---|---------|
| 6.1 | UI “Integrações → Chaves API” (criar, revogar, escopos) |
| 6.2 | OpenAPI publicada (`/docs` filtrado ou site dev) |
| 6.3 | Widget JS opcional: `<script src=".../embed/vagas.js">` |
| 6.4 | CORS restrito por token (domínios permitidos) |
| 6.5 | Webhook `candidatura.criada` (HMAC secret) — opcional nesta fase |
| 6.6 | Logs de uso API por token |

**Pronto quando:** site externo lista vagas com Bearer token documentado.

---

### Fase 7 — Integrações operacionais (7–10 dias)

| # | Entrega |
|---|---------|
| 7.1 | Bridge RH: secrets + UI ativar integração + `rh_integrado` |
| 7.2 | Sync cargos/equipes testado contra RH real |
| 7.3 | Promote candidato → colaborador RH |
| 7.4 | Tabela + CRUD entrevistas |
| 7.5 | Página Agenda Entrevistas funcional |
| 7.6 | IA textos vaga via `ai-insight` (já codificado) |

---

### Fase 8 — Backlog estratégico (pós-MVP)

| Item | Notas |
|------|-------|
| DISC / Profiler | Parceria ou engine; não prometer no site até existir |
| Auth candidato 100% gateway | Migrar GoTrue para proxy |
| Analytics R&S | time-to-hire, funil |
| Testes técnicos candidato | |
| App mobile candidato | PWA primeiro |

---

## 9. Matriz de responsabilidades técnica

| Componente | Repo | Deploy |
|------------|------|--------|
| SPA Recrutamento | `sincla-recrutamento` | Easypanel `sincla-recrutamento` |
| Migrations Vagas | idem | `supabase db push` |
| Edge Functions Vagas | idem | `supabase functions deploy` |
| Gateway rotas Vagas | `sincla-api` | Easypanel `sincla-api` |
| Hub product/SSO | `sincla-hub` | Easypanel `sincla-app` |
| IA central | `sincla-hub` | `ai-generate` + secrets |

---

## 10. Performance e escalabilidade

| Área | Estratégia |
|------|------------|
| Listagem portal | Cache CDN no gateway (60s) + `staleTime` React Query |
| Kanban | Paginação candidaturas; virtualização se >100 cards |
| Upload | Presigned URL direto Storage; limite 5MB PDF |
| IA | Rate limit por `company_id`; tier `light` para sugestões curtas |
| Cron LGPD | Batch 500 candidatos/run |
| Índices | Já existem em `empresa_id`, `slug`; adicionar `(empresa_id, status, tipo_vaga)` |

---

## 11. Checklist LGPD (produto)

- [ ] Base legal documentada por finalidade (seleção, banco talentos)
- [ ] Termo versionado + registro de aceite
- [ ] Portabilidade self-service
- [ ] Exclusão / anonimização
- [ ] Inatividade 24 meses com aviso
- [ ] Audit log imutável
- [ ] DPO/contato empresa no portal
- [ ] Suboperadores listados (Supabase, Sincla, e-mail)
- [ ] RLS impede vazamento cross-tenant

---

## 12. Ordem de execução resumida

```
Fase 0  Alinhamento + SSO + deploy          ← COMEÇAR AQUI
Fase 1  Segurança (RLS, gateway, tokens)
Fase 2  Portal público/privado
Fase 3  Candidato + LGPD core
Fase 4  Inatividade 24 meses
Fase 5  Multi-empresa + delegações
Fase 6  API integradores
Fase 7  RH bridge + entrevistas
Fase 8  Backlog (DISC, etc.)
```

**Estimativa MVP production-grade (Fases 0–4):** 4–6 semanas  
**MVP + consultorias + API (Fases 0–6):** 8–10 semanas  
**Produto completo operacional (0–7):** 10–14 semanas

---

## 13. O que NÃO fazer (anti-padrões)

| Gambiarra | Solução correta |
|-----------|-----------------|
| Dois product_id (`vagas` + `recrutamento`) | Um só: `recrutamento` |
| SSO retornar session no callback sem magicLink | Padrão EAD |
| Service role no Vite | RLS + Edge Functions |
| Portal chamar Supabase em prod | Gateway |
| Chave OpenAI no frontend | `ai-insight` → Hub |
| RLS `USING (true)` | Políticas por tenant |
| Consultoria logar/deslogar por cliente | Company switcher + M:N |
| Excluir hard candidatura em processo ativo | Anonimizar PII, reter evento |

---

## 14. Referências internas

- Diagnóstico agente: conversa 2026-06-26
- Gateway: `.cursor/rules/08-api-gateway.mdc`, `tools/api/README.md`
- IA: `.cursor/rules/09-ia-central.mdc`, `docs/IA-CENTRAL.md`
- Satélite: `docs/SATELLITE_INTEGRATION_GUIDE.md`
- Contexto tool: `tools/vagas/.agent/workflows/contextualizacao.md`

---

## 15. Próximo passo imediato

Iniciar **Fase 0.1–0.4** em branch `feat/recrutamento-fase0-foundation`:

1. SmartAccess + fix product_id
2. Dockerfile/nginx + `base: '/recrutamento/'`
3. Migration Hub unificar produto
4. Remover service role do frontend

Aguardar autorização explícita antes de deploy ou push (rule `02-no-auto-deploy`).

---

## Status de execução (2026-06-26)

| Item | Status |
|------|--------|
| Fase 0 código (SmartAccess, rotas, Dockerfile) | ✅ local |
| Hub migration `recruitment_product_unify` | ✅ aplicada (MCP) |
| `sso-login` + `ai-insight` deploy Vagas | ✅ remoto |
| Fase 1 migration `api_tokens` + RLS | ✅ aplicada (`db push`) |
| Secret `AI_GATEWAY_SECRET` no projeto Vagas | ⏳ configurar no Dashboard Supabase |
| Easypanel `sincla-recrutamento` | ⏳ pendente |
| Auth redirect URLs `/vagas/**` | ⏳ Supabase Dashboard → Auth |
