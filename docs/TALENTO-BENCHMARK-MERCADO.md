# Sincla Talento — Benchmark de mercado e mapa de produto

> **Objetivo:** posicionar o Sincla Talento frente a RecruitCRM, InHire, Gupy e categorias de IA em R&S.  
> **Base:** análise de mercado (jun/2026) + inventário do código em `tools/vagas/` + `docs/VAGAS-PLANO-EXECUCAO.md`.  
> **Legenda de status:** ✅ temos · 🟡 temos, precisa aprimorar · ❌ não temos · 📋 planejado no plano de execução

---

## 1. Referências analisadas

| Player | Posicionamento | Destaques competitivos |
|--------|----------------|------------------------|
| **RecruitCRM** | ATS + CRM para agências | Agentes de IA (parse CV, formatação, submissão), multipublicação 5k+ job boards, pipeline customizável, automações, LGPD |
| **InHire** | ATS brasileiro (mid-market → enterprise) | Página de carreiras, triagem IA configurável, scorecard entrevista, testes, automações, KPIs/dashboards, extensão LinkedIn, **API REST** (`api.inhire.app`), Zapier, campos customizados |
| **Gupy** | Líder ATS Brasil | Agentes de IA (ordenação, pré-entrevista WhatsApp), kanban/lista, testes fit/habilidades, aprovação de vagas, carta oferta, calendário (Google/365), recrutamento interno, diversidade, admissão digital, API Enterprise |
| **Paradox / hireEZ / SeekOut** | IA pontual | Chatbot 24/7, outbound sourcing, busca talentos diversos |
| **HireVue / TurboHire** | Avaliação + analytics | Vídeo entrevista, ranking candidatos, dashboards time-to-hire |
| **Textio / Skillate** | IA de conteúdo/triagem | Otimização JD, screening automatizado, redução de viés |

**Tendências transversais (2024–2026):**

1. **Agentes de IA** (não só “botão gerar texto”) — parse de CV, triagem, comunicação, agendamento  
2. **Experiência candidato** — portal mobile, status transparente, poucos cliques  
3. **Dados e KPIs** — time-to-hire, funil, NPS candidato, dashboards por stakeholder  
4. **Integrações** — API + webhooks + Zapier; RH/admissão no fechamento  
5. **LGPD by design** — consentimento versionado, portabilidade, exclusão, audit trail  
6. **Flexibilidade** — campos/etapas/fluxos customizáveis sem depender de suporte  
7. **Consultorias** — multi-cliente, delegação, portal white-label  

---

## 2. Matriz comparativa — Sincla Talento vs mercado

### 2.1 Core ATS (vagas e pipeline)

| Capacidade | Mercado (referência) | Sincla Talento | Status | Ação |
|------------|---------------------|----------------|--------|------|
| CRUD de vagas | Gupy, InHire, RecruitCRM | GerenciarVagas — título, descrição RichText, cargo, equipe, status, salário, tipo INTERNA/EXTERNA, questionário, termo LGPD | ✅ | 🟡 Aprimorar: fluxo aprovação requisição, carta oferta, recrutamento interno |
| Código automático de vaga | Comum em ATS | `gerarCodigoVaga()` | ✅ | Manter |
| Templates de vaga | InHire, Gupy | TemplatesVagas + aplicar na criação | ✅ | 🟡 Aprimorar: biblioteca compartilhada entre empresas Hub |
| Pipeline Kanban | Gupy (lista/kanban), TurboHire | PipelineKanban por vaga, etapas custom (`rs_vaga_etapas`) ou fallback | ✅ | 🟡 Aprimorar: drag-and-drop, bulk actions, feedback em massa |
| Movimentação automática entre etapas | Gupy Scale | Manual (avançar/voltar/reprovar) | 🟡 | ❌ Desenvolver: regras/automações por etapa |
| Banco de talentos | RecruitCRM, InHire | PoolTalentos — CRUD, busca, stats | ✅ | 🟡 Aprimorar: tags, pools segmentados, import CSV |
| Processos seletivos (seleções) | InHire | GerenciarSelecoes + DetalhesSelecao (lista/kanban) | ✅ | 🟡 Aprimorar: reconciliar schema services ↔ migrations |
| Etapas configuráveis | Todos | EtapasSelecao, rs_vaga_etapas | ✅ | 🟡 Aprimorar: editor visual de funil |
| Questionários | Gupy, InHire | QuestionariosSelecao (admin) | 🟡 | ❌ Desenvolver: respostas no portal + scoring |
| Filtros salvos | Skillate, Gupy | FiltrosCandidatos (critérios JSON) | 🟡 | ❌ Desenvolver: aplicar filtro na triagem automática |
| Scorecard entrevista | InHire | Não | ❌ | ❌ Desenvolver: kit entrevista + avaliação estruturada |
| Aprovação de requisição de vaga | Gupy Enterprise | Não | ❌ | ❌ Desenvolver: workflow gestor → RH → publicar |
| Multipublicação job boards | RecruitCRM (5k+) | Não | ❌ | Backlog: integrações LinkedIn/Indeed/Catho |
| Recrutamento interno | Gupy Scale | Flag `tipo_vaga INTERNA` | 🟡 | ❌ Desenvolver: portal interno + visibilidade só colaboradores |

### 2.2 Portal de carreiras e candidato

| Capacidade | Mercado | Sincla Talento | Status | Ação |
|------------|---------|----------------|--------|------|
| Página de carreiras branded | InHire, Gupy | `/p/{slug}/vagas` — logo, cor, listagem, filtros | ✅ | 🟡 Aprimorar: SEO, OG tags, mobile polish |
| Detalhe + candidatura | Todos | DetalhesVaga stepper + upload currículo client-side | ✅ | 🟡 Aprimorar: upload via gateway/Storage privado |
| Cadastro currículo standalone | RecruitCRM talent pool | CadastrarCurriculo multi-step | ✅ | Manter |
| Login/registro candidato | Gupy portal | CandidatoLogin/Registro via GoTrue | ✅ | 🟡 Aprimorar: magic link, OAuth LinkedIn |
| Painel candidato | Gupy “portal do candidato” | CandidatoPainel — perfil + candidaturas | 🟡 | ❌ Desenvolver: status por etapa, timeline, NPS |
| Portal público/privado/desligado | Enterprise ATS | Sempre “público implícito” | ❌ | 📋 Fase 2 do plano |
| Acompanhar status transparente | Gupy | Lista candidaturas básica | 🟡 | ❌ Desenvolver: timeline + notificações |
| Mobile-first / PWA | Gupy, InHire | Mantine responsivo | 🟡 | ❌ Desenvolver: PWA + testes viewport |

### 2.3 Inteligência artificial

| Capacidade | Mercado | Sincla Talento | Status | Ação |
|------------|---------|----------------|--------|------|
| Gerar descrição/requisitos/benefícios JD | Textio, Gupy, InHire | rs-ia-vagas → ai-insight → Hub ai-generate | ✅ | 🟡 Aprimorar: fix encoding PT-BR; sugestão inclusiva (Textio-like) |
| Triagem / ranking candidatos | Gupy Agentes, Skillate | Tipos `notaIA`/`parecerIA` no service, **sem UI** | 🟡 | ❌ Desenvolver: scoring por vaga + explicação (“por que Muito Alta”) |
| Parse automático de CV | RecruitCRM Custom Field Agent | Não | ❌ | ❌ Desenvolver: extrair campos do PDF → candidato |
| Chatbot candidato 24/7 | Paradox Olivia | Não | ❌ | Backlog: FAQ + status via IA (tier light) |
| Agendamento IA | CalendarHero, Clara | Não | ❌ | Fase entrevistas + integração calendário |
| Redução de viés | Eightfold, Gupy | Não explícito | ❌ | ❌ Desenvolver: triagem cega opcional, audit de critérios |
| IA permissionável por etapa | InHire (novidade) | Não | ❌ | ❌ Desenvolver: toggles “IA atua em: triagem / JD / e-mail” |
| Pré-entrevista WhatsApp | Gupy | Não | ❌ | Backlog estratégico (integração gateway/messaging) |

### 2.4 Entrevistas e agenda

| Capacidade | Mercado | Sincla Talento | Status | Ação |
|------------|---------|----------------|--------|------|
| Agenda de entrevistas | Gupy (Google/365), InHire | UI AgendaEntrevistas **completa** | 🟡 | ❌ Desenvolver: tabela `entrevistas`, service real, sync calendário |
| Entrevista vídeo | HireVue | Não | ❌ | Backlog (integração Meet/Zoom link) |
| Lembretes automáticos | Gupy | Toast fake na UI | ❌ | ❌ Desenvolver: e-mail/WhatsApp via Hub/gateway |
| Scorecard pós-entrevista | InHire | Não | ❌ | ❌ Desenvolver |

### 2.5 Comunicação e engajamento

| Capacidade | Mercado | Sincla Talento | Status | Ação |
|------------|---------|----------------|--------|------|
| E-mail transacional candidato | Todos | TODO comentado em vagas.ts | ❌ | ❌ Desenvolver: confirmação, movimentação etapa, reprovação |
| E-mail em massa | RecruitCRM | Botão na UI pipeline sem backend | 🟡 | ❌ Desenvolver |
| Templates de comunicação | InHire | Não | ❌ | ❌ Desenvolver |
| WhatsApp | Gupy pré-entrevista | Não | ❌ | Backlog |
| NPS candidato | Gupy | Não | ❌ | Backlog analytics |

### 2.6 Analytics e KPIs

| Capacidade | Mercado | Sincla Talento | Status | Ação |
|------------|---------|----------------|--------|------|
| Dashboard operacional | InHire (“Dados e KPIs”) | Cards stats em GerenciarVagas | 🟡 | ❌ Desenvolver: time-to-hire, funil conversão, origem candidatos |
| Dashboards customizáveis | InHire, Gupy Enterprise | Não | ❌ | Backlog |
| Relatórios diversidade | Gupy Enterprise | Não | ❌ | Backlog (campos opcionais + agregação) |
| Export CSV/Excel | Comum | Não | ❌ | ❌ Desenvolver: candidatos, vagas, pipeline |

### 2.7 Integrações ecossistema Sincla (diferencial)

| Capacidade | Mercado | Sincla Talento | Status | Ação |
|------------|---------|----------------|--------|------|
| SSO Hub multi-tenant | Raro em ATS standalone | SmartAccess + sso-login ✅ | ✅ | Manter |
| Bridge Sincla RH | Parcial em mercado | vagas-rh-bridge: sync cargos/equipes, promote_candidato | 🟡 | 🟡 Aprimorar: UI promote no pipeline; ativar integração |
| Sincla EAD (testes na seleção) | Diferencial Sincla | Mencionado no site, **não wired** | ❌ | ❌ Desenvolver: matricular candidato em prova EAD |
| Billing Hub | Sincla only | Assinatura produto `talento` | ✅ | Manter |
| IA central Hub | Sincla only | ai-insight → ai-generate | ✅ | 🟡 Secret AI_GATEWAY_SECRET pendente |

### 2.8 LGPD e segurança

| Capacidade | Mercado | Sincla Talento | Status | Ação |
|------------|---------|----------------|--------|------|
| Termos LGPD versionados | RecruitCRM LGPD, Gupy | TermosLGPD admin + aceite no cadastro | 🟡 | 📋 Fase 3: registro IP, versão, audit |
| Portabilidade / exclusão titular | Obrigatório BR | Não | ❌ | 📋 Fase 3: lgpd-export, lgpd-delete |
| Inatividade 24 meses | Boa prática ANPD | Não | ❌ | 📋 Fase 4 |
| RLS multi-tenant | Obrigatório | Fase 1 aplicada (staff_empresa_ids) | ✅ | 🟡 Validar advisors zero critical |
| Gateway (não expor Supabase) | Best practice | Portal usa gateway + fallback Supabase | 🟡 | ❌ Desenvolver: remover fallback em prod |
| API tokens por conta | Enterprise | Tabela `api_tokens` + RLS, **sem UI** | 🟡 | 📋 Fase 6: UI Integrações |

### 2.9 Multi-empresa e consultorias

| Capacidade | Mercado | Sincla Talento | Status | Ação |
|------------|---------|----------------|--------|------|
| Company switcher | InHire agências | 1 usuário ↔ 1 empresa | ❌ | 📋 Fase 5: usuario_empresas |
| Delegação cliente ↔ consultoria | RecruitCRM agencies | Não | ❌ | 📋 Fase 5: empresa_delegacoes |
| Portal parceiro (vagas do cliente) | RecruitCRM | Não | ❌ | 📋 Fase 5 |
| Extensão LinkedIn sourcing | InHire Chrome | Não | ❌ | Backlog (extensão ou API LinkedIn) |

### 2.10 Avaliações comportamentais / técnicas

| Capacidade | Mercado | Sincla Talento | Status | Ação |
|------------|---------|----------------|--------|------|
| DISC / Profiler | Site Sincla promete | **Não implementado** | ❌ | Backlog Fase 8 — não prometer até existir |
| Testes técnicos (HackerRank) | Mercado tech | Não | ❌ | Backlog ou via EAD |
| Testes fit cultural | Gupy | Não | ❌ | Backlog |
| Gamificação (Pymetrics) | Nicho | Não | ❌ | Backlog |

---

## 3. O que temos hoje (resumo executivo)

**Pronto ou utilizável:**

- Admin: vagas, pipeline kanban, banco talentos, seleções, etapas, questionários (admin), filtros, templates, termos LGPD  
- Portal público: listagem, detalhe, candidatura, auth candidato, painel básico  
- SSO Hub → `/talento/{slug}/dashboard`  
- IA: geração de textos de vaga (Hub central)  
- Bridge RH parcial (sync cargos/equipes na sidebar)  
- RLS Fase 1 + api_tokens (schema)  
- Gateway leitura pública (empresa + vagas)  
- Repo `sincla-talento` + deploy Supabase parcial  

**Parcial / com dívida:**

- Questionários e filtros sem loop fechado no portal  
- LGPD só no admin + checkbox; sem direitos do titular  
- Entrevistas: fachada UI  
- Schema drift services ↔ migrations  
- Notificações/e-mail inexistentes  
- Analytics mínimos  

**Ausente vs mercado líder:**

- Triagem IA com ranking explicável  
- Webhooks entrada/saída (crítico — ver §4)  
- API integradores com UI  
- Automações de fluxo  
- KPIs/dashboards  
- Calendário integrado  
- Multipublicação  
- DISC/testes  

---

## 4. Webhooks e integrações — mapa completo

> **Requisito do produto:** área robusta de **webhooks de entrada** (receber eventos/cadastros externos) e **webhooks de saída** (notificar APIs externas quando o sistema dispara eventos).  
> **Estado atual:** ❌ **nada implementado** (nem tabelas, nem UI, nem dispatcher). Escopo `webhook:candidatura` existe só como string em `api_tokens.escopos` (Fase 1).

### 4.1 Arquitetura alvo (recomendada)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Sincla Talento (tenant)                          │
│  Admin UI: Integrações → Webhooks | API Keys | Logs | Testar payload    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ INBOUND       │     │ EVENT BUS       │     │ OUTBOUND        │
│ POST /v1/     │     │ (interno)       │     │ Dispatcher      │
│ talento/hooks │────►│ domain events   │────►│ POST para URLs  │
│ /{hook_id}    │     │ + outbox table  │     │ assinadas HMAC  │
└───────────────┘     └─────────────────┘     └─────────────────┘
        ▲                       ▲                       │
        │                       │                       ▼
  Sistemas externos      Ações no app            Zapier, ERP, site
  (site, HRIS, forms)    (CRUD, pipeline)        próprio, n8n, RH
```

**Princípios:**

1. **Nunca** expor Supabase direto — inbound/outbound via **gateway** (`api.sincla.com.br`)  
2. **Multi-tenant:** todo hook vinculado a `empresa_id`; token/HMAC por subscription  
3. **Idempotência:** header `Idempotency-Key` em inbound; `event_id` UUID em outbound  
4. **Retry outbound:** exponential backoff (ex.: 1m, 5m, 30m, 2h, 24h) + dead letter  
5. **Audit:** `webhook_delivery_log` imutável (LGPD + debug integrador)  
6. **Secrets:** HMAC secret gerado uma vez; rotação sem downtime (dual secret)  

### 4.2 Modelo de dados proposto

```sql
-- Subscriptions de webhook SAÍDA (empresa configura URL para receber eventos)
CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,              -- HMAC-SHA256 signing
  eventos TEXT[] NOT NULL,           -- ex.: {'candidatura.criada','vaga.publicada'}
  headers_extra JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Endpoints de webhook ENTRADA (URL única por integração externa)
CREATE TABLE webhook_inbound_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL,                -- URL: /v1/talento/hooks/inbound/{slug}
  secret TEXT NOT NULL,              -- validar X-Sincla-Signature
  tipos_aceitos TEXT[] NOT NULL,     -- ex.: {'candidato.upsert','candidatura.criar'}
  mapeamento JSONB DEFAULT '{}',     -- field mapping externo → interno
  ativo BOOLEAN DEFAULT TRUE,
  UNIQUE (empresa_id, slug)
);

-- Outbox + log de entregas SAÍDA
CREATE TABLE webhook_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  subscription_id UUID REFERENCES webhook_subscriptions(id),
  evento TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'PENDING',     -- PENDING|SENT|FAILED|DEAD
  tentativas INT DEFAULT 0,
  proxima_tentativa TIMESTAMPTZ,
  ultimo_erro TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE webhook_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL CHECK (direction IN ('IN','OUT')),
  empresa_id UUID NOT NULL,
  evento TEXT NOT NULL,
  http_status INT,
  request_headers JSONB,
  request_body JSONB,
  response_body TEXT,
  duracao_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.3 Catálogo de eventos do sistema (SAÍDA — hooks nativos)

Eventos que o Sincla Talento **deve emitir** para integradores:

| Evento | Quando dispara | Payload mínimo | Prioridade |
|--------|----------------|----------------|------------|
| `vaga.criada` | Nova vaga | vaga_id, titulo, status, empresa_id | P1 |
| `vaga.publicada` | status → ABERTA + visível portal | vaga_id, slug portal URL | P1 |
| `vaga.pausada` | status → PAUSADA | vaga_id | P2 |
| `vaga.encerrada` | status → FECHADA/CANCELADA | vaga_id | P2 |
| `candidato.criado` | Novo no banco talentos | candidato_id, email (hash opcional) | P1 |
| `candidato.atualizado` | Perfil alterado | candidato_id, campos_alterados | P2 |
| `candidatura.criada` | Nova candidatura | candidatura_id, vaga_id, candidato_id, origem | **P0** |
| `candidatura.movida` | Mudança etapa/status pipeline | candidatura_id, etapa_anterior, etapa_nova | P1 |
| `candidatura.reprovada` | Status reprovado + feedback | candidatura_id, motivo | P1 |
| `candidatura.contratada` | Status CONTRATADO | candidatura_id, vaga_id | P1 |
| `selecao.iniciada` | Seleção ATIVA | selecao_id, vaga_id | P2 |
| `entrevista.agendada` | Entrevista criada | entrevista_id, candidato_id, datetime | P2 |
| `entrevista.cancelada` | Cancelamento | entrevista_id | P3 |
| `lgpd.consentimento` | Aceite termo | candidato_id, termo_versao | P1 |
| `lgpd.exclusao_solicitada` | Titular pediu exclusão | candidato_id | P1 |
| `lgpd.exclusao_concluida` | Anonimização feita | candidato_id | P1 |
| `rh.colaborador_promovido` | promote_candidato OK | candidato_id, colaborador_rh_id | P2 |

**Formato envelope outbound (padrão):**

```json
{
  "id": "evt_uuid",
  "type": "candidatura.criada",
  "created_at": "2026-06-26T12:00:00Z",
  "empresa_id": "uuid",
  "data": { ... }
}
```

**Assinatura:** header `X-Sincla-Signature: sha256=...` sobre corpo raw + timestamp `X-Sincla-Timestamp` (anti-replay 5 min).

### 4.4 Webhooks de ENTRADA — o que receber

Endpoints inbound (`POST /v1/talento/hooks/inbound/{slug}`) para sistemas externos **empurrarem** dados:

| Tipo inbound | Caso de uso | Ação interna | Prioridade |
|--------------|-------------|--------------|------------|
| `candidato.upsert` | Form site próprio, feira, parceiro | Criar/atualizar candidato + origem | **P0** |
| `candidatura.criar` | Job board externo, landing custom | Criar candidatura se vaga existir | **P0** |
| `vaga.sync` | HRIS master publica vaga | Upsert vaga (modo integrador) | P1 |
| `candidatura.status` | ATS legado atualiza etapa | Atualizar pipeline (mapeamento etapas) | P2 |
| `webhook.test` | Botão “Testar” na UI | 200 OK + log | P1 |

**Validação inbound:**

- Bearer token **ou** HMAC `X-Sincla-Signature`  
- Escopo em `api_tokens`: `webhook:inbound`  
- Rate limit por token + IP  
- Schema validation (JSON Schema por tipo)  
- Resposta síncrona `{ "ok": true, "ids": {...} }` + evento outbound de confirmação opcional  

### 4.5 UI admin — Integrações (não existe)

Página `/talento/{slug}/integracoes` com abas:

| Aba | Conteúdo |
|-----|----------|
| **Chaves API** | CRUD api_tokens (já planejado Fase 6) |
| **Webhooks saída** | CRUD subscriptions, seleção eventos, secret, test ping |
| **Webhooks entrada** | URL + secret + tipos; copiar URL; mapeamento campos |
| **Logs** | Filtro por direção, evento, status HTTP, replay manual outbound |
| **Conectores** | Presets: Zapier, n8n, Sincla RH, Sincla EAD (futuro) |

### 4.6 Gateway — rotas a implementar (`sincla-api`)

| Método | Rota | Auth | Função |
|--------|------|------|--------|
| POST | `/v1/talento/hooks/inbound/{slug}` | HMAC ou Bearer | Receber evento externo |
| GET | `/v1/talento/webhooks/subscriptions` | Bearer admin token | Listar (proxy admin) |
| POST | `/v1/talento/webhooks/subscriptions` | Bearer | Criar subscription |
| POST | `/v1/talento/webhooks/test` | Bearer | Disparo teste |
| GET | `/v1/talento/webhooks/deliveries` | Bearer | Logs paginados |

Worker/cron (Edge ou API background): processar `webhook_outbox` a cada 30s.

### 4.7 Integrações nativas vs webhooks genéricos

| Integração | Tipo | Sincla hoje | Recomendação |
|------------|------|-------------|--------------|
| **Sincla RH** | Bridge síncrona Edge | vagas-rh-bridge parcial | Manter bridge + emitir `rh.colaborador_promovido` outbound |
| **Sincla EAD** | Bridge + webhook | Não | Inbound: resultado prova; Outbound: `candidatura.movida` → matrícula |
| **Sincla Hub billing** | N/A | OK | — |
| **Zapier / Make** | Outbound + inbound genérico | Não | Documentar após webhooks P0 |
| **LinkedIn** | API oficial / extensão | Não | Backlog; inbound `candidato.upsert` cobre import manual |
| **Google Calendar** | OAuth | Não | Fase entrevistas; não substituir webhooks |
| **Greenhouse/Lever** | ATS bidirecional | Não | Padrão InHire: mapear processo ↔ vaga via inbound/outbound |

### 4.8 Roadmap sugerido — webhooks (dentro do produto)

| Fase | Entrega | Dependência |
|------|---------|-------------|
| **W0** | Event emitter interno no código (single function `emitEvent`) | Refactor services |
| **W1** | Tabelas + outbound P0 (`candidatura.criada`, `candidatura.contratada`) | Gateway worker |
| **W2** | UI Integrações (subscriptions + logs) | W1 |
| **W3** | Inbound P0 (`candidato.upsert`, `candidatura.criar`) | api_tokens escopos |
| **W4** | Demais eventos P1/P2 + retry/DLQ | W1 |
| **W5** | Zapier template + OpenAPI webhooks | W2–W4 |

**Encaixe no plano existente:** expandir **Fase 6** (API integradores) para **Fase 6b — Webhooks** (não opcional — requisito de produto).

---

## 5. Priorização estratégica — ficar à frente do mercado

### 5.1 Diferenciais Sincla (aproveitar o ecossistema)

1. **Talento + RH + EAD fechando o ciclo** — contratação → colaborador → onboarding/trilha (Gupy faz parcial com admissão própria; Sincla pode integrar 3 produtos)  
2. **IA central Hub** — custo único, tier standard/light, sem chave no cliente  
3. **Multi-tenant Hub + consultorias** — billing centralizado, SSO, troca empresa  
4. **Gateway único** — segurança + webhooks + API para integradores  
5. **LGPD nativa** — vantagem vs ATS gringos mal adaptados ao BR  

### 5.2 Gap crítico vs InHire/Gupy (fechar primeiro)

| Ordem | Tema | Por quê |
|-------|------|---------|
| 1 | **Webhooks in/out + API UI** | Requisito explícito; InHire já tem API; enterprise exige |
| 2 | **Triagem IA + ranking explicável** | Gupy/InHire vendem isso como core |
| 3 | **LGPD titular completa** | Confiança BR + compliance |
| 4 | **Entrevistas + calendário** | UI já existe; mercado espera |
| 5 | **E-mail/automações pipeline** | Experiência candidato |
| 6 | **KPIs time-to-hire** | InHire destaca “Dados e KPIs” |
| 7 | **Multi-empresa consultorias** | RecruitCRM/InHire agências |
| 8 | **Parse CV + DISC** | Prometido no marketing Sincla — só após core |

### 5.3 O que aprimorar (já temos)

| Item | Aprimoramento |
|------|---------------|
| Pipeline Kanban | DnD, bulk, automações por regra |
| Geração IA JD | Encoding PT-BR, tom inclusivo, A/B títulos |
| Portal | Modos público/privado, SEO, status candidato |
| Bridge RH | Botão “Contratar” no pipeline → promote; sync bidirecional |
| Banco talentos | Import CSV, tags, deduplicação e-mail/CPF |
| Seleções | Alinhar schema; IA parecer por candidato na UI |
| Gateway | Remover fallback Supabase em prod; cache CDN |
| api_tokens | UI + escopos webhook + CORS por domínio |

### 5.4 O que desenvolver (não temos)

| Item | Notas |
|------|-------|
| **Webhooks entrada/saída** | §4 completo |
| Triagem IA candidatos | Agentes configuráveis por vaga |
| Parse PDF currículo | RecruitCRM-like |
| Scorecard entrevista | InHire kit |
| Dashboards KPI | Funil, TTH, origem |
| Automações fluxo | Mover etapa, e-mail, webhook |
| Aprovação requisição vaga | Enterprise |
| Carta oferta | Gupy Scale |
| Extensão LinkedIn | InHire |
| DISC/Profiler | Só quando engine definida |
| WhatsApp pré-entrevista | Integração messaging |

---

## 6. Posicionamento recomendado

**Hoje:** MVP operacional interno com portal, pipeline e IA de conteúdo — **abaixo** de InHire/Gupy em integrações, IA de triagem, analytics e comunicação.

**Meta 6–9 meses (Fases 2–6 + Webhooks W0–W3):**  
ATS **integrável por design** (webhooks + API + ecossistema Sincla) — nicho forte para PME/consultorias que usam Hub, com LGPD e IA central como moat.

**Meta 12+ meses:**  
Agentes de IA (triagem + parse CV + automações) + KPIs — competir em **funcionalidade** com InHire mid-market, sem competir head-to-head com Gupy enterprise em multipublicação.

---

## 7. Referências

- [RecruitCRM — Top 10 IA recruiting](https://recruitcrm.io/pt-br/blogues/ai-recruiting-tools/)
- [RecruitCRM — produto](https://recruitcrm.io/pt-br/)
- [InHire](https://www.inhire.com.br/)
- [InHire API docs](https://docs.inhire.com.br/)
- [Gupy R&S](https://www.gupy.io/software-de-recrutamento-e-selecao)
- Interno: `docs/VAGAS-PLANO-EXECUCAO.md`, `tools/vagas/.agent/workflows/contextualizacao.md`

---

*Documento vivo — revisar após Fase 2 (portal) e implementação Webhooks W1.*
