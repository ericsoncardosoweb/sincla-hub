# Sincla Talento — Plano de Execução Detalhado (Interview Workspace)

> **Documento mestre de implementação**  
> **Data:** 2026-06-27  
> **Referência estratégica:** [`TALENTO-PLANO-INTERVIEW-WORKSPACE.md`](./TALENTO-PLANO-INTERVIEW-WORKSPACE.md)  
> **Repositório:** `tools/vagas/` → GitHub `sincla-talento`  
> **Supabase:** `zsnjddocencekcupzxeh`  
> **URL produção:** `https://app.sincla.com.br/talento/{slug}/...`

---

## 1. Objetivo e escopo

Implementar paridade operacional com o benchmark InHire/InTerview, com **diferencial Sincla = Chat de Entrevista proprietário** (sem WhatsApp).

### 1.1 Dentro do escopo

| Área | Entrega |
|------|---------|
| Workspace por vaga | 10 abas no contexto da vaga |
| Talentos | Kanban/lista enriquecido, bulk, drag-drop |
| Agente de triagem | Fit alto/médio/baixo com explicação |
| Entrevistas Chat | Wizard 3 passos + página candidato + KPIs |
| Automações básicas | Etapa → e-mail com link de entrevista |
| Busca inteligente | NL → filtros (fase D) |
| Webhooks | Eventos novos (`entrevista.*`, `triagem.*`) |

### 1.2 Fora do escopo (Fase E — backlog)

- WhatsApp / BSP
- Multipublicação LinkedIn/Indeed
- HireVue / vídeo síncrono
- Diversidade avançada
- Google Calendar sync (agenda humana)

### 1.3 Princípios inegociáveis

1. **IA:** somente Hub `ai-generate` via proxy `ai-insight` — ver [`IA-CENTRAL.md`](./IA-CENTRAL.md)
2. **Segurança:** candidato entrevista via token opaco; RLS por `empresa_id`
3. **Deploy:** nunca push/deploy sem autorização explícita
4. **UI:** Mantine + padrões existentes (`AppLayout`, `RichTextEditor`, React Query)

---

## 2. Visão de entrega (timeline)

Estimativa para **1 dev full-time** (+ revisões). Paralelizar backend/frontend reduz ~20%.

```
Sprint 0   │████│ Prep + dívida técnica                    (1 sem)
Sprint 1–2 │████████│ Fase A — Workspace shell + Talentos  (2 sem)
Sprint 3–4 │████████│ Fase A — Kanban rico + schema base   (2 sem)
Sprint 5–6 │████████│ Fase B — Agente triagem              (2 sem)
Sprint 7–10│████████████████│ Fase C — Chat Entrevista ★   (4 sem)
Sprint 11–13│████████████│ Fase D — Busca + Automatizar     (3 sem)
Sprint 14+ │░░░░│ Fase E — backlog                         (contínuo)
```

**MVP comercial (demo vendável):** fim Sprint 10 — workspace + triagem + chat funcional end-to-end.

---

## 3. Arquitetura de rotas (alvo)

### 3.1 Admin — novo vs legado

| Rota nova | Componente | Substitui |
|-----------|------------|-----------|
| `/talento/{slug}/vagas/{vagaId}` | `VagaWorkspace` | — (default aba Talentos) |
| `/talento/{slug}/vagas/{vagaId}/talentos` | `VagaTabTalentos` | `pipeline/{vagaId}` |
| `/talento/{slug}/vagas/{vagaId}/entrevistas` | `VagaTabEntrevistas` | — |
| `/talento/{slug}/vagas/{vagaId}/entrevistas/nova` | `EntrevistaWizard` | — |
| `/talento/{slug}/vagas/{vagaId}/entrevistas/{fluxoId}` | `EntrevistaDetalhe` | — |
| `/talento/{slug}/vagas/{vagaId}/agente-triagem` | `VagaTabAgenteTriagem` | — |
| `/talento/{slug}/vagas/{vagaId}/analytics` | `VagaTabAnalytics` | — |
| `/talento/{slug}/vagas/{vagaId}/sobre` | `VagaTabSobre` | modal edit em GerenciarVagas |
| `/talento/{slug}/vagas/{vagaId}/divulgacao` | `VagaTabDivulgacao` | — |
| `/talento/{slug}/vagas/{vagaId}/formulario` | `VagaTabFormulario` | questionários globais |
| `/talento/{slug}/vagas/{vagaId}/testes` | placeholder Fase E | — |
| `/talento/{slug}/vagas/{vagaId}/kits` | placeholder Fase E | — |

**Redirect legado:** `pipeline/:vagaId` → `vagas/:vagaId/talentos` (301 no router).

### 3.2 Portal candidato — novo

| Rota | Componente |
|------|------------|
| `/p/{slug}/entrevista/{token}` | `EntrevistaChatPage` |
| `/p/{slug}/entrevista/{token}/obrigado` | `EntrevistaChatObrigado` (CSAT concluído) |

### 3.3 Alterações em arquivos existentes

| Arquivo | Mudança |
|---------|---------|
| `src/App.tsx` | Rotas workspace + entrevista pública + redirect pipeline |
| `src/components/AppLayout.tsx` | Remover item Pipeline solto; Vagas → lista; link workspace |
| `src/pages/GerenciarVagas.tsx` | Clique na vaga → `navigate(vagas/{id})` |
| `src/lib/tenantRouting.ts` | Helpers `buildVagaRoute(slug, vagaId, tab?)` |

---

## 4. Estrutura de pastas (nova)

```
tools/vagas/src/
├── pages/
│   ├── VagaWorkspace/
│   │   ├── index.tsx                 # shell header + tabs + Outlet
│   │   ├── VagaWorkspaceHeader.tsx   # título, SLA badge, Editar
│   │   ├── tabs/
│   │   │   ├── TalentosTab.tsx
│   │   │   ├── AnalyticsTab.tsx
│   │   │   ├── SobreTab.tsx
│   │   │   ├── DivulgacaoTab.tsx
│   │   │   ├── FormularioTab.tsx
│   │   │   ├── EntrevistasTab.tsx
│   │   │   └── AgenteTriagemTab.tsx
│   │   └── components/
│   │       ├── CandidatoCard.tsx
│   │       ├── KanbanBoard.tsx
│   │       ├── CandidatosLista.tsx
│   │       └── BulkActionsBar.tsx
│   ├── Entrevistas/
│   │   ├── EntrevistaWizard.tsx
│   │   ├── steps/
│   │   │   ├── StepConfiguracao.tsx
│   │   │   ├── StepPerguntas.tsx
│   │   │   └── StepPublicacao.tsx
│   │   ├── EntrevistaDetalhe.tsx
│   │   └── EntrevistaRespostas.tsx
│   └── Public/
│       ├── EntrevistaChatPage.tsx
│       └── EntrevistaChatObrigado.tsx
├── services/
│   ├── vaga-workspace.ts
│   ├── triagem-agente.ts
│   ├── entrevista-fluxos.ts
│   └── entrevista-chat.ts
├── hooks/
│   ├── useVagaWorkspace.ts
│   ├── useCandidaturasVaga.ts
│   └── useEntrevistaChat.ts
└── types/
    └── workspace.ts
```

---

## 5. Migrations — ordem e conteúdo

Todas em `tools/vagas/supabase/migrations/`. **Nunca editar migration aplicada** — sempre nova.

### 5.1 Sprint 1 — `20260701000000_workspace_candidatura_base.sql`

**Objetivo:** campos para cards ricos e fit placeholder.

```sql
-- candidatos
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS pretensao_salarial NUMERIC;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS fonte TEXT
  CHECK (fonte IS NULL OR fonte IN ('PORTAL','LINKEDIN','HUNTING','INDICACAO','API','MANUAL'));
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- candidaturas
ALTER TABLE candidaturas ADD COLUMN IF NOT EXISTS fit_nivel TEXT
  CHECK (fit_nivel IS NULL OR fit_nivel IN ('BAIXO','MEDIO','ALTO'));
ALTER TABLE candidaturas ADD COLUMN IF NOT EXISTS fit_score NUMERIC;
ALTER TABLE candidaturas ADD COLUMN IF NOT EXISTS fit_explicacao JSONB;
ALTER TABLE candidaturas ADD COLUMN IF NOT EXISTS triagem_em TIMESTAMPTZ;
ALTER TABLE candidaturas ADD COLUMN IF NOT EXISTS etapa_entrada_em TIMESTAMPTZ DEFAULT now();
ALTER TABLE candidaturas ADD COLUMN IF NOT EXISTS sub_status TEXT
  CHECK (sub_status IS NULL OR sub_status IN ('ATIVO','DESISTENTE','REPROVADO'));

-- vagas — SLA
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS sla_dias INTEGER;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS sla_inicio_em DATE;

-- índices
CREATE INDEX IF NOT EXISTS idx_candidaturas_vaga_fit ON candidaturas(vaga_id, fit_nivel);
CREATE INDEX IF NOT EXISTS idx_candidaturas_vaga_sub_status ON candidaturas(vaga_id, sub_status);
```

**RLS:** policies existentes em `candidaturas`/`candidatos` já filtram por empresa via join — validar com MCP após apply.

**Critério de aceite:** insert candidatura com `fonte=PORTAL`; query por `fit_nivel` não quebra.

---

### 5.2 Sprint 3 — `20260703000000_vaga_etapas_workspace.sql`

**Objetivo:** etapas por vaga (kanban customizável).

```sql
CREATE TABLE IF NOT EXISTS vaga_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID NOT NULL REFERENCES vagas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  cor TEXT DEFAULT 'blue',
  tipo TEXT DEFAULT 'PADRAO'
    CHECK (tipo IN ('PADRAO','LISTADOS','ABORDADOS','INSCRITOS','FIT_CULTURAL','FIT_TECNICO')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (vaga_id, ordem)
);

ALTER TABLE candidaturas ADD COLUMN IF NOT EXISTS etapa_id UUID REFERENCES vaga_etapas(id);

-- seed etapas padrão via trigger ou script pós-migration
```

**Script pós-apply:** `scripts/seed_vaga_etapas.mjs` — para vagas existentes sem etapas.

**Critério de aceite:** mover candidato atualiza `etapa_id` + `etapa_entrada_em`.

---

### 5.3 Sprint 5 — `20260705000000_triagem_agente.sql`

```sql
CREATE TABLE triagem_agente_config (
  vaga_id UUID PRIMARY KEY REFERENCES vagas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT TRUE,
  peso_salario NUMERIC NOT NULL DEFAULT 0.33 CHECK (peso_salario BETWEEN 0 AND 1),
  peso_curriculo NUMERIC NOT NULL DEFAULT 0.34 CHECK (peso_curriculo BETWEEN 0 AND 1),
  peso_formulario NUMERIC NOT NULL DEFAULT 0.33 CHECK (peso_formulario BETWEEN 0 AND 1),
  salario_min NUMERIC,
  salario_max NUMERIC,
  nota_formulario_min NUMERIC DEFAULT 0.6,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT triagem_pesos_soma CHECK (
    ABS(peso_salario + peso_curriculo + peso_formulario - 1) < 0.01
  )
);

-- respostas questionário (portal)
CREATE TABLE IF NOT EXISTS candidatura_questionario_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id UUID NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,
  questionario_id UUID NOT NULL,
  respostas JSONB NOT NULL DEFAULT '{}',
  nota NUMERIC,
  passou BOOLEAN,
  eliminatoria_falhou BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (candidatura_id, questionario_id)
);
```

**RLS:** `triagem_agente_config` — SELECT/INSERT/UPDATE para staff da `empresa_id`.

---

### 5.4 Sprint 7 — `20260707000000_entrevista_chat.sql`

```sql
CREATE TABLE entrevista_fluxos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID NOT NULL REFERENCES vagas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RASCUNHO'
    CHECK (status IN ('RASCUNHO','PUBLICADO','ARQUIVADO')),
  total_perguntas INTEGER NOT NULL DEFAULT 6,
  pct_tecnico INTEGER NOT NULL DEFAULT 40,
  pct_cultural INTEGER NOT NULL DEFAULT 30,
  pct_trajetoria INTEGER NOT NULL DEFAULT 30,
  automacao_etapa_id UUID REFERENCES vaga_etapas(id),
  automacao_acao TEXT CHECK (automacao_acao IN ('ENVIAR_LINK_EMAIL')),
  automacao_delay_min INTEGER DEFAULT 5,
  email_assunto TEXT,
  email_corpo_html TEXT,
  horas_economizadas_por_sessao NUMERIC DEFAULT 0.4,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT entrevista_pct_soma CHECK (pct_tecnico + pct_cultural + pct_trajetoria = 100)
);

CREATE TABLE entrevista_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fluxo_id UUID NOT NULL REFERENCES entrevista_fluxos(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  texto TEXT NOT NULL,
  tipo_resposta TEXT NOT NULL
    CHECK (tipo_resposta IN ('TEXTO_CURTO','TEXTO_LONGO','MULTIPLA','AUDIO')),
  natureza TEXT NOT NULL
    CHECK (natureza IN ('TECNICO','CULTURAL','TRAJETORIA')),
  peso TEXT NOT NULL DEFAULT 'MEDIO'
    CHECK (peso IN ('ALTO','MEDIO','BAIXO')),
  pre_eliminatoria BOOLEAN DEFAULT FALSE,
  opcoes JSONB, -- múltipla escolha
  criterios JSONB NOT NULL DEFAULT '[]',
  status_revisao TEXT DEFAULT 'AGUARDANDO'
    CHECK (status_revisao IN ('AGUARDANDO','APROVADA','REJEITADA')),
  UNIQUE (fluxo_id, ordem)
);

CREATE TABLE entrevista_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fluxo_id UUID NOT NULL REFERENCES entrevista_fluxos(id) ON DELETE CASCADE,
  candidatura_id UUID NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','EM_ANDAMENTO','CONCLUIDA','EXPIRADA','REPROVADA')),
  pergunta_atual_ordem INTEGER DEFAULT 1,
  pontuacao_final NUMERIC,
  csat INTEGER CHECK (csat IS NULL OR csat BETWEEN 1 AND 5),
  iniciada_em TIMESTAMPTZ,
  concluida_em TIMESTAMPTZ,
  expira_em TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (fluxo_id, candidatura_id)
);

CREATE TABLE entrevista_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID NOT NULL REFERENCES entrevista_sessoes(id) ON DELETE CASCADE,
  pergunta_id UUID NOT NULL REFERENCES entrevista_perguntas(id) ON DELETE CASCADE,
  resposta_texto TEXT,
  resposta_audio_path TEXT,
  resposta_json JSONB,
  pontuacao NUMERIC,
  avaliacao_ia JSONB,
  pre_eliminada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sessao_id, pergunta_id)
);

CREATE INDEX idx_entrevista_sessoes_token ON entrevista_sessoes(token);
CREATE INDEX idx_entrevista_fluxos_vaga ON entrevista_fluxos(vaga_id, status);
```

**Storage bucket:** `entrevista-audio` — path `{empresa_id}/{sessao_id}/{pergunta_id}.webm`, policy upload anon com token validado na Edge Function (não RLS direto no bucket público).

---

### 5.5 Sprint 11 — `20260711000000_automacoes_busca.sql`

```sql
CREATE TABLE automacoes_vaga (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID NOT NULL REFERENCES vagas(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  gatilho TEXT NOT NULL
    CHECK (gatilho IN ('ETAPA_ENTRADA','CANDIDATURA_CRIADA','FIT_ALTO','ENTREVISTA_CONCLUIDA')),
  condicao JSONB DEFAULT '{}',
  acao TEXT NOT NULL
    CHECK (acao IN ('ENVIAR_ENTREVISTA','MOVER_ETAPA','EMAIL','WEBHOOK_OUT')),
  acao_params JSONB NOT NULL DEFAULT '{}',
  delay_min INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE busca_inteligente_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID NOT NULL REFERENCES vagas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  query_nl TEXT NOT NULL,
  filtros JSONB NOT NULL,
  resultados_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 5.6 Webhooks — `20260708000000_webhooks_entrevista_triagem.sql`

Estender triggers existentes (`webhook_outbox`):

| Evento | Gatilho |
|--------|---------|
| `entrevista.sessao_criada` | INSERT `entrevista_sessoes` |
| `entrevista.concluida` | UPDATE status → CONCLUIDA |
| `entrevista.reprovada` | UPDATE status → REPROVADA (pré-eliminatória) |
| `triagem.fit_atualizado` | UPDATE `candidaturas.fit_nivel` |
| `candidatura.etapa_alterada` | UPDATE `candidaturas.etapa_id` |

Documentar em `tools/api/docs/WEBHOOKS-TALENTO.md` + OpenAPI.

---

## 6. Edge Functions — especificação

Todas em `tools/vagas/supabase/functions/`.

### 6.1 `triagem-agente-run`

| Item | Detalhe |
|------|---------|
| **Auth** | Service role (cron) ou staff JWT |
| **Input** | `{ vaga_id?, candidatura_id? }` — batch ou unitário |
| **Lógica** | 1) score salário; 2) score formulário; 3) chama Hub IA currículo vs JD (tier standard); 4) weighted sum → `fit_nivel` + `fit_explicacao` |
| **Output** | `{ processed: N, results: [...] }` |
| **Trigger** | DB trigger AFTER INSERT/UPDATE candidatura; pg_cron nightly reconciliation |

**Prompt IA (currículo):** JSON estruturado `{ score: 0-100, motivos: string[] }` — parse com fallback Groq.

---

### 6.2 `entrevista-gerar-perguntas`

| Item | Detalhe |
|------|---------|
| **Auth** | Staff JWT |
| **Input** | `{ fluxo_id }` |
| **Lógica** | Lê vaga (JD, requisitos, faixa salarial) + distribuição pct; gera N perguntas via Hub tier **standard**; insere em `entrevista_perguntas` status AGUARDANDO |
| **Output** | `{ perguntas: [...] }` |

---

### 6.3 `entrevista-chat` (pública — token)

| Item | Detalhe |
|------|---------|
| **Auth** | Header `x-entrevista-token` ou body `{ token }` — **sem JWT candidato** |
| **Actions** | `iniciar` · `proxima_pergunta` · `enviar_resposta` · `status` |
| **Validação** | Token válido, não expirado, fluxo PUBLICADO |
| **Resposta** | Persiste em `entrevista_respostas`; dispara async `entrevista-avaliar-resposta` |
| **Rate limit** | 30 req/min por token |

---

### 6.4 `entrevista-avaliar-resposta`

| Item | Detalhe |
|------|---------|
| **Auth** | Service secret interno |
| **Input** | `{ resposta_id }` |
| **Lógica** | Hub tier **light** compara resposta vs `criterios`; calcula pontuação; se `pre_eliminatoria` e fail → sessão REPROVADA + candidatura sub_status REPROVADO |
| **Async** | Invocado via `supabase.functions.invoke` fire-and-forget ou fila |

---

### 6.5 `entrevista-finalizar`

| Item | Detalhe |
|------|---------|
| **Input** | `{ sessao_id, csat }` |
| **Lógica** | Média ponderada respostas → `pontuacao_final`; status CONCLUIDA; webhook outbox; executa `automacoes_vaga` se configurado |
| **Output** | `{ pontuacao_final, reprovada }` |

---

### 6.6 `entrevista-enviar-link` (automação e-mail)

| Item | Detalhe |
|------|---------|
| **Auth** | Service role / cron worker |
| **Input** | `{ candidatura_id, fluxo_id, delay_min? }` |
| **Lógica** | Upsert sessão + token; monta URL; envia e-mail via **gateway** `POST /v1/talento/email/send` (criar se não existir) ou Edge Hub transacional |
| **Template vars** | `{{candidato_nome}}`, `{{vaga_titulo}}`, `{{link_entrevista}}`, `{{empresa_nome}}` |

---

### 6.7 `busca-inteligente`

| Item | Detalhe |
|------|---------|
| **Auth** | Staff JWT |
| **Input** | `{ vaga_id, query_nl }` |
| **Lógica** | Hub tier **light** → JSON filtros `{ skills?, salario_max?, etapa?, fonte?, tags?, operador: AND|OR }` |
| **Output** | Filtros + count; salva histórico |

---

## 7. Plano sprint a sprint

### Sprint 0 — Preparação (3–5 dias)

| ID | Tarefa | Arquivos | DoD |
|----|--------|----------|-----|
| S0.1 | Branch `feature/vaga-workspace` | git | Branch criada |
| S0.2 | Confirmar menu Entrevistas oculto | `AppLayout.tsx` | ✅ já comentado — validar rota `/entrevistas` redirect ou 404 amigável |
| S0.3 | Spike UI chat (estático) | `Public/EntrevistaChatPage.tsx` mock | Mobile 375px ok; sem backend |
| S0.4 | Types workspace | `types/workspace.ts` | Interfaces VagaWorkspace, CandidaturaEnriquecida |
| S0.5 | Atualizar contextualização | `.agent/workflows/contextualizacao.md` | Link para estes docs |

**Gate Sprint 0:** protótipo chat aprovado visualmente pelo PO.

---

### Sprint 1 — Workspace shell (5 dias)

| ID | Tarefa | DoD |
|----|--------|-----|
| S1.1 | `VagaWorkspace/index.tsx` — header + Tabs Mantine | 10 abas renderizam; abas E vazias = "Em breve" |
| S1.2 | `VagaWorkspaceHeader` — título, badge SLA, Editar | SLA calculado se `sla_dias` + `sla_inicio_em` |
| S1.3 | Rotas em `App.tsx` | `/vagas/:vagaId/*` nested routes |
| S1.4 | `GerenciarVagas` — click row → workspace | Pipeline antigo ainda acessível via redirect |
| S1.5 | `buildVagaRoute()` helper | Testes manuais navegação |
| S1.6 | React Query `useVagaWorkspace(vagaId)` | Loading/error states |

**Gate Sprint 1:** abrir vaga → workspace com header; URL estável compartilhável.

---

### Sprint 2 — Aba Talentos (lista) (5 dias)

| ID | Tarefa | DoD |
|----|--------|-----|
| S2.1 | Extrair lógica de `PipelineKanban.tsx` → `TalentosTab` | Lista funcional |
| S2.2 | Sub-tabs Ativos / Desistentes / Reprovados | Filtro `sub_status` |
| S2.3 | Toggle Lista / Kanban (SegmentedControl) | Estado persiste em URL `?view=kanban` |
| S2.4 | Busca por nome (debounced) | Filtra client-side inicialmente |
| S2.5 | Migration `20260701000000` apply staging | Campos novos populados |

**Gate Sprint 2:** lista candidatos na aba Talentos = paridade mínima com pipeline atual.

---

### Sprint 3 — Kanban rico (5 dias)

| ID | Tarefa | DoD |
|----|--------|-----|
| S3.1 | Migration `vaga_etapas` + seed script | Vagas existentes com colunas |
| S3.2 | `KanbanBoard` com `@dnd-kit/core` | Drag entre colunas |
| S3.3 | Persistir `etapa_id` on drop | Optimistic update + rollback on error |
| S3.4 | `CandidatoCard` — fonte, tags, tempo etapa | Badge fonte + "há X dias" |
| S3.5 | Fit badge placeholder (cinza "Triagem pendente") | Até Fase B |

**Dependência:** `@dnd-kit/core` + `@dnd-kit/sortable` no `package.json`.

**Gate Sprint 3:** kanban drag-drop estável com 50+ cards (ScrollArea).

---

### Sprint 4 — Bulk actions + polish Talentos (5 dias)

| ID | Tarefa | DoD |
|----|--------|-----|
| S4.1 | Checkbox seleção + `BulkActionsBar` | Reprovar / Avançar etapa |
| S4.2 | Modal confirmação bulk reprovar | Atualiza `sub_status=REPROVADO` |
| S4.3 | Avançar → próxima etapa por ordem | Respeita `vaga_etapas.ordem` |
| S4.4 | Empty states + skeleton loading | Mobile testado |
| S4.5 | Redirect `pipeline/:vagaId` → workspace | Links antigos funcionam |

**Gate Sprint 4:** **Fase A completa** — demo interna workspace + talentos.

---

### Sprint 5 — Agente triagem — config + salário (5 dias)

| ID | Tarefa | DoD |
|----|--------|-----|
| S5.1 | Migration triagem + questionário respostas | Apply staging |
| S5.2 | `AgenteTriagemTab` — sliders pesos + faixa salarial | Soma pesos = 100% |
| S5.3 | Score salário (determinístico) | ✓ verde / ↓ vermelho na lista |
| S5.4 | Portal: salvar respostas questionário na candidatura | `candidatura_questionario_respostas` |
| S5.5 | Scoring formulário + knock-out | `eliminatoria_falhou` → REPROVADO |

**Gate Sprint 5:** formulário scored no portal; config agente salva por vaga.

---

### Sprint 6 — Agente triagem — IA currículo (5 dias)

| ID | Tarefa | DoD |
|----|--------|-----|
| S6.1 | Edge `triagem-agente-run` v1 | Deploy staging |
| S6.2 | Integração Hub via `ai-insight` extendido ou invoke direto server-side | Sem chave no browser |
| S6.3 | Trigger on candidatura INSERT | Fit calculado < 60s |
| S6.4 | Abas Baixo / Médio / Alto fit | Contadores no tab |
| S6.5 | Tabela fit — barra % + coluna formulário Passou/Falhou | Match benchmark screenshot |
| S6.6 | Modal "Entenda o agente" (onboarding) | Texto dos 3 critérios |

**Gate Sprint 6:** **Fase B completa** — candidato novo recebe fit automático.

---

### Sprint 7 — Entrevistas — schema + dashboard (5 dias)

| ID | Tarefa | DoD |
|----|--------|-----|
| S7.1 | Migration entrevista_* | Apply staging |
| S7.2 | `EntrevistasTab` — KPI cards (4 métricas) | Queries agregadas |
| S7.3 | Grid cards fluxos (Ativas / Arquivadas) | CRUD list |
| S7.4 | Service `entrevista-fluxos.ts` | React Query hooks |
| S7.5 | RLS policies entrevista tables | Teste cross-tenant negado |

**Gate Sprint 7:** dashboard vazio/zero state + criar rascunho fluxo.

---

### Sprint 8 — Wizard entrevista (5 dias)

| ID | Tarefa | DoD |
|----|--------|-----|
| S8.1 | `EntrevistaWizard` stepper 3 passos | Navegação Voltar/Próximo |
| S8.2 | Step Config — sliders natureza sincronizados | Soma 100% + recalcula qtd |
| S8.3 | Edge `entrevista-gerar-perguntas` | Gera ao entrar Step 2 |
| S8.4 | Step Perguntas — editar, tipos, critérios, pré-eliminatória | UI match benchmark |
| S8.5 | Step Publicação — toggle, etapa trigger, delay, e-mail | Salva fluxo PUBLICADO |

**Gate Sprint 8:** recrutador cria entrevista publicada com 6 perguntas IA revisadas.

---

### Sprint 9 — Chat candidato (5 dias)

| ID | Tarefa | DoD |
|----|--------|-----|
| S9.1 | `EntrevistaChatPage` — branded header, progresso | Logo + cor empresa |
| S9.2 | Edge `entrevista-chat` — fluxo turno a turno | Uma pergunta por vez |
| S9.3 | Tipos TEXTO_CURTO, TEXTO_LONGO, MULTIPLA | Validação client |
| S9.4 | Tipo AUDIO — MediaRecorder + upload Storage | Max 2 min; fallback texto |
| S9.5 | Edge `entrevista-avaliar-resposta` | Score async |
| S9.6 | Tela CSAT + `entrevista-finalizar` | Redirect obrigado |

**Gate Sprint 9:** candidato completa entrevista em mobile; score visível no admin.

---

### Sprint 10 — Admin respostas + automação (5 dias)

| ID | Tarefa | DoD |
|----|--------|-----|
| S10.1 | `EntrevistaRespostas` — transcript por candidato | Áudio player |
| S10.2 | Pré-eliminatória reprova candidato | Status REPROVADA + sub_status |
| S10.3 | Edge `entrevista-enviar-link` + trigger etapa | E-mail com link em 5 min |
| S10.4 | Webhook `entrevista.concluida` | Teste outbound Integrações UI |
| S10.5 | KPI horas economizadas | `sessoes_concluidas * horas_por_sessao` |

**Gate Sprint 10:** **Fase C MVP** — fluxo end-to-end: publicar → mover etapa → e-mail → chat → score → webhook.

---

### Sprint 11 — Busca inteligente (5 dias)

| ID | Tarefa | DoD |
|----|--------|-----|
| S11.1 | Modal "Assistente de Busca" na aba Talentos | Tabs Como usar / Histórico |
| S11.2 | Edge `busca-inteligente` | 3 exemplos PT funcionam |
| S11.3 | Aplicar filtros na lista/kanban | Enter para buscar |
| S11.4 | Histórico salvo | Últimas 20 queries |

---

### Sprint 12 — Automatizar (5 dias)

| ID | Tarefa | DoD |
|----|--------|-----|
| S12.1 | Migration `automacoes_vaga` | Apply |
| S12.2 | Modal Automatizar — CRUD regras | Gatilho etapa + ação |
| S12.3 | Worker processa fila delay (pg_cron ou outbox) | Reusa padrão webhook-dispatch |
| S12.4 | Ações: ENVIAR_ENTREVISTA, MOVER_ETAPA, WEBHOOK_OUT | Pelo menos 2 ações |

---

### Sprint 13 — Analytics + Divulgação + Sobre (5 dias)

| ID | Tarefa | DoD |
|----|--------|-----|
| S13.1 | `AnalyticsTab` — funil por etapa, time-in-stage | Chart Mantine/recharts |
| S13.2 | `SobreTab` — embed edit JD (reuse GerenciarVagas form) | Save inline |
| S13.3 | `DivulgacaoTab` — link portal + UTM builder + fontes | Copy link |
| S13.4 | `FormularioTab` — link questionário da vaga | Scoring config |

**Gate Sprint 13:** **Fase D completa**.

---

## 8. Gateway API (sincla-api) — extensões

| Endpoint | Método | Fase | Notas |
|----------|--------|------|-------|
| `/v1/talento/email/send` | POST | C | Template entrevista; secret service |
| `/v1/talento/public/entrevista/{token}` | GET | C | Metadados sessão (opcional — preferir Edge) |
| OpenAPI eventos webhook | — | C | Atualizar yaml |

**Regra:** página chat candidato fala **direto com Edge Function** `entrevista-chat` (Supabase anon key + token), não expor service role.

---

## 9. Testes e QA

### 9.1 Checklist por fase

**Fase A**
- [ ] Abrir workspace de vaga ABERTA e ENCERRADA (estados diferentes)
- [ ] Kanban 200 candidatos — scroll performance
- [ ] Bulk reprovar 10 candidatos
- [ ] Mobile 375px — tabs scroll horizontal

**Fase B**
- [ ] Candidato salário acima faixa → fit BAIXO componente salário
- [ ] Knock-out formulário → REPROVADO automático
- [ ] Re-run triagem após editar JD

**Fase C**
- [ ] Token expirado → mensagem amigável
- [ ] Token já CONCLUIDA → read-only ou obrigado
- [ ] Áudio gravado e reproduzido no admin
- [ ] Pré-eliminatória na pergunta 2 → sessão para
- [ ] Webhook `entrevista.concluida` recebido em endpoint teste
- [ ] CSAT 1–5 salvo

### 9.2 Testes automatizados (mínimo)

| Tipo | O quê |
|------|-------|
| Unit | Scoring salário, soma pesos triagem, distribuição perguntas |
| Integration | `entrevista-chat` turno completo (Deno test) |
| E2E (opcional) | Playwright: wizard → token → 1 resposta |

---

## 10. Deploy e rollout

### 10.1 Ordem de deploy (requer autorização)

1. Migrations Supabase Vagas (`db push`)
2. Edge Functions novas (uma a uma; `entrevista-chat` por último)
3. Secrets: `ENTREVISTA_TOKEN_PEPPER`, `WEBHOOK_*` existentes
4. Gateway API (se e-mail endpoint novo)
5. Easypanel `sincla-talento` (frontend)
6. Validar cron pg_cron triagem/automação

### 10.2 Feature flags (env frontend)

```env
VITE_FEATURE_VAGA_WORKSPACE=true
VITE_FEATURE_ENTREVISTA_CHAT=false  # true após Sprint 9 staging OK
VITE_FEATURE_BUSCA_INTELIGENTE=false
```

Permite rollout gradual sem branch long-lived em prod.

### 10.3 Migração usuários existentes

| Ação | Quando |
|------|--------|
| Seed `vaga_etapas` vagas existentes | Pós migration Sprint 3 |
| Backfill `sub_status=ATIVO` candidaturas | Migration Sprint 1 |
| Recalcular fit batch | Script one-shot pós Sprint 6 |
| Comunicar nova URL workspace | Release notes |

---

## 11. Riscos e mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| IA lenta na triagem | UX lista vazia de fit | Placeholder + job async + badge "Calculando..." |
| Custo IA alto (200 candidatos/vaga) | Billing | Batch + tier light onde possível; cache score currículo |
| Áudio Storage custo | Infra | Limite 2 min; compressão; lifecycle 90 dias |
| Schema drift rs_selecoes vs candidaturas | Confusão produto | Documentar: **candidaturas** = source of truth pipeline; seleções = legado consultoria |
| Drag-drop mobile | UX | Lista default mobile; kanban desktop |
| E-mail transacional não pronto | Automação bloqueada | MVP: copiar link manual + webhook; e-mail Sprint 10 |

---

## 12. Definição de pronto (DoD global)

Uma tarefa só está **Done** quando:

1. Código em `sincla-talento` com types atualizados
2. Migration aplicada em staging (não prod sem OK)
3. RLS validado (tenant A não vê tenant B)
4. Loading / error / empty states na UI
5. Mobile verificado na tela tocada
6. Sem chave IA no frontend (lint/grep)
7. Documentação mínima em contextualização se nova Edge Function

---

## 13. Ordem de prioridade se precisar cortar escopo

Se timeline apertar, manter nesta ordem (não negociar):

1. **VagaWorkspace shell + Talentos kanban** (Sprint 1–4)
2. **Chat entrevista end-to-end** (Sprint 7–10) — diferencial
3. **Agente triagem** (Sprint 5–6)
4. Busca inteligente (Sprint 11)
5. Automatizar completo (Sprint 12)
6. Analytics/Divulgação (Sprint 13)

---

## 14. Referências cruzadas

| Documento | Uso |
|-----------|-----|
| [`TALENTO-PLANO-INTERVIEW-WORKSPACE.md`](./TALENTO-PLANO-INTERVIEW-WORKSPACE.md) | Mapa funcional benchmark ↔ Sincla |
| [`TALENTO-BENCHMARK-MERCADO.md`](./TALENTO-BENCHMARK-MERCADO.md) | Comparativo mercado |
| [`VAGAS-PLANO-EXECUCAO.md`](./VAGAS-PLANO-EXECUCAO.md) | Plano legado — **atualizar §fases** apontando para este doc |
| [`IA-CENTRAL.md`](./IA-CENTRAL.md) | Tiers e proxy ai-insight |
| `tools/api/docs/WEBHOOKS-TALENTO.md` | Eventos outbound |
| `tools/vagas/.agent/workflows/contextualizacao.md` | Contexto agente |

---

## 15. Próxima ação (aguardando OK)

1. PO aprova timeline e ordem de corte (§13)
2. Dev inicia **Sprint 0** + **Sprint 1** na branch `feature/vaga-workspace`
3. Após Sprint 1: demo workspace shell para validação das abas

---

*Versão 1.0 — Plano de execução detalhado. Revisar após cada gate de fase.*
