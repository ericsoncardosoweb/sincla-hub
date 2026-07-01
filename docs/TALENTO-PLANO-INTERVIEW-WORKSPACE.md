# Sincla Talento — Plano Interview Workspace (referência InHire/InTerview)

> **Data:** 2026-06-27  
> **Decisão estratégica:** replicar o **modelo operacional** do benchmark (workspace por vaga, triagem IA, entrevistas estruturadas, automações), com **diferencial Sincla = Chat de Entrevista proprietário** (sem WhatsApp — risco de bloqueio, dependência Meta, custo BSP).  
> **Impacto:** reprioriza roadmap; integrações/webhooks **permanecem**, mas deixam de ser o foco principal do produto.

---

## 1. O que o benchmark faz (extraído das telas)

### 1.1 Modelo mental: **Workspace por vaga**

Tudo gira em torno de **uma vaga aberta** (`FullStack Engineer - Intera`), não em menus globais espalhados.

| Elemento | Comportamento |
|----------|----------------|
| **Header da vaga** | Título, badge SLA (ex.: 23/39 dias), botão Editar vaga |
| **Abas horizontais** | Módulos da vaga no mesmo contexto (sem sair da tela) |

**Abas do benchmark:**

| Aba | Função |
|-----|--------|
| **Talentos (N)** | Pipeline principal — lista/kanban, busca, triagem, bulk actions |
| **Analytics** | KPIs da vaga (funil, tempo, conversão) |
| **Sobre a vaga** | JD, requisitos, faixa salarial, responsáveis |
| **Divulgação** | Onde publicar, links, tracking de fonte |
| **Diversidade** | Métricas e metas DEI |
| **Formulário personalizado** | Perguntas de candidatura + scoring + knock-out |
| **Testes** | Assessments técnicos/comportamentais |
| **Kits de entrevista** | Scorecards para entrevistadores humanos |
| **Entrevistas (WhatsApp no benchmark)** | **InTerview** — entrevistas assíncronas automatizadas |
| **Agente de triagem** | Configuração do classificador IA (fit alto/médio/baixo) |

### 1.2 Aba Talentos — operação diária

| Feature | Detalhe |
|---------|---------|
| **Toggle Lista / Kanban** | Mesmos dados, duas visões |
| **Busca inteligente** | NL: *"react AND node AND São Paulo AND salário < 12000"* — combina skills, salário, etapa, formulário, empresa, contrato, fonte, cargo, local, tags (E/OU) |
| **Busca por nome / currículo** | Modos alternativos à busca inteligente |
| **Ordenar + Filtros** | Filtros salvos e combináveis |
| **Automatizar** | Regras quando candidato entra/move etapa |
| **Sub-abas status** | Ativos · Desistentes · Reprovados |
| **Kanban por etapas** | Colunas customizáveis (Listados, Abordados, Inscritos, Fit Cultural, Fit Técnico…) |
| **Card do candidato** | Avatar, nome, tempo na etapa, **fonte** (Hunting, LinkedIn, Portal, Indicação), **tags** (Priorizado, Dúvida, skills), **fit IA** (Alto/Médio fit com a vaga) |
| **Bulk actions** | Selecionar vários → Reprovar / Segue (avançar) |

### 1.3 Agente de triagem (IA)

Classifica candidatos em **Baixo / Médio / Alto fit** com transparência:

| Critério | Como usa |
|----------|----------|
| **Pretensão salarial** | Dentro ou fora da faixa da vaga (indicador visual ✓/↓) |
| **Compatibilidade do currículo** | Match JD + requisitos (score %) |
| **Formulário personalizado** | Nota mínima + perguntas eliminatórias |

**UI:** abas por fit + tabela com barra de % + coluna formulário (Passou/Falhou) + ações em massa.

### 1.4 InTerview (benchmark = WhatsApp → Sincla = Chat proprietário)

#### Dashboard de entrevistas (por vaga)

| KPI | Exemplo |
|-----|---------|
| Total de entrevistas | 668 |
| Horas economizadas | 261,6h |
| Pontuação final média | 8,6 |
| CSAT médio | 4,6/5 |

**Cards por fluxo:** Alinhamento inicial, Background check, Papo inicial — cada um com questões, entrevistados, pontuação, CSAT, "Ver respostas".

#### Wizard criar entrevista (3 passos)

**Passo 1 — Configuração**

- Nome da entrevista (ex.: Triagem inicial)
- Quantidade de perguntas (ex.: 6)
- **Natureza das perguntas** (sliders somando 100%):
  - Técnico (40%)
  - Fit cultural (30%)
  - Trajetória (30%)

**Passo 2 — Perguntas**

- IA gera perguntas a partir da vaga
- Recrutador edita/aprova ("Aguardando revisão")
- **Tipos de resposta:** múltipla escolha, áudio, texto curto, texto longo
- **Critérios de avaliação** por pergunta (Alto/Médio/Baixo peso)
- **Pré-eliminatória:** resposta inadequada → reprova automática
- Exemplo: pretensão salarial com 3 critérios ponderados

**Passo 3 — Publicação**

- Toggle publicar (gera link único)
- **Automação:** ao mover para etapa X (ex.: Screening) → enviar link por e-mail após N minutos
- Template de e-mail configurável

#### Experiência candidato (Sincla — diferencial)

| Benchmark (WhatsApp) | Sincla Talento |
|----------------------|----------------|
| Link abre WhatsApp | Link abre **`/p/{slug}/entrevista/{token}`** — página branded |
| Conversa em thread WA | **Chat UI** responsiva (mobile-first) |
| Áudio via WA | Áudio via **MediaRecorder** + Storage |
| Risco bloqueio Meta | **Zero dependência** WhatsApp |
| CSAT no fim | CSAT in-app (1–5) + NPS opcional |

---

## 2. Sincla Talento hoje — inventário honesto

### 2.1 O que temos (base reutilizável)

| Módulo | Onde | Nota |
|--------|------|------|
| CRUD vagas | `GerenciarVagas` | Modal, não workspace por vaga |
| Pipeline Kanban | `PipelineKanban/{vagaId}` | Etapas básicas, sem drag-drop, sem fit IA |
| Seleções | `GerenciarSelecoes` + `DetalhesSelecao` | Paralelo ao benchmark; schema drift |
| Banco talentos | `PoolTalentos` | Sem tags avançadas, sem fonte rica |
| Etapas globais | `EtapasSelecao` | Deveria ser **por vaga** no workspace |
| Questionários | `QuestionariosSelecao` | Admin ok; **sem scoring no portal** |
| Filtros | `FiltrosCandidatos` | JSON salvo; **não aplica triagem auto** |
| Templates JD | `TemplatesVagas` | Ok |
| Termos LGPD | `TermosLGPD` | Ok |
| IA texto vaga | `rs-ia-vagas` → Hub | Só JD, não triagem |
| Portal carreiras | `/p/{slug}/vagas` | Ok |
| Candidatura | `DetalhesVaga` stepper | Sem questionário scored |
| Integrações | `Integracoes` | API tokens + webhooks ✅ (W0–W5) |
| Bridge RH | `vagas-rh-bridge` | Parcial |

### 2.2 O que NÃO temos (gaps vs benchmark)

| Gap | Prioridade para paridade |
|-----|-------------------------|
| **Workspace por vaga (abas)** | P0 — reorganização UX |
| **Busca inteligente (NL)** | P1 |
| **Agente de triagem + fit alto/médio/baixo** | P0 |
| **Kanban rico** (tags, fonte, fit, tempo) | P0 |
| **Bulk actions** | P1 |
| **Automatizar** (regras por etapa) | P1 |
| **Chat de entrevista (InTerview-like)** | **P0 — diferencial** |
| **Wizard entrevista 3 passos** | P0 |
| **Dashboard KPIs entrevista** | P1 |
| **Analytics por vaga** | P1 |
| **Divulgação / tracking fonte** | P2 |
| **Diversidade** | P3 |
| **Testes/assessments** | P2 |
| **Kits entrevista humana** | P2 |
| **SLA por vaga** | P2 |
| **Entrevistas agenda** | P2 (stub quebrado hoje) |

### 2.3 Dívida técnica que bloqueia

| Item | Impacto |
|------|---------|
| `entrevistas.ts` stub + `AgendaEntrevistas` chama funções inexistentes | Runtime error se menu habilitado |
| Pipeline usa `status` enum fixo vs `etapa_id` custom | Kanban limitado |
| Questionário sem respostas/score no DB | Triagem IA incompleta |
| Candidato sem `pretensao_salarial`, `tags[]`, `fonte` estruturada | Cards do benchmark impossíveis |
| Sem tabela `automacoes` / `regras_etapa` | Botão Automatizar vazio |
| GerenciarVagas ≠ detalhe vaga | Precisa nova rota `/talento/{slug}/vagas/{vagaId}` |

---

## 3. Arquitetura alvo — Sincla Interview Workspace

```
┌─────────────────────────────────────────────────────────────────┐
│  VagaWorkspace  /talento/{slug}/vagas/{vagaId}                  │
├─────────────────────────────────────────────────────────────────┤
│ [Talentos] [Analytics] [Sobre] [Divulgação] [Formulário]        │
│ [Testes] [Kits] [Entrevistas Chat ★] [Agente Triagem]           │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   candidaturas +              entrevista_fluxos +
   triagem_scores              entrevista_sessoes +
   tags/fonte                  entrevista_respostas
         │                              │
         └──────────┬───────────────────┘
                    ▼
            Hub ai-generate (tier standard/light)
            Gateway (e-mail, webhooks, API)
            Supabase Vagas (RLS empresa_id)
```

### 3.1 Diferencial: Chat de Entrevista

**Fluxo candidato:**

1. Recebe e-mail com link `https://app.sincla.com.br/p/{slug}/entrevista/{token}`
2. Página branded (logo, cor empresa, progresso)
3. Chat conduz **uma pergunta por vez** (texto/áudio/múltipla escolha)
4. IA avalia resposta vs critérios (async, fila)
5. CSAT no final → atualiza KPIs da vaga
6. Webhook `entrevista.concluida` + move etapa se automação configurada

**Fluxo recrutador:**

1. Aba **Entrevistas** → dashboard KPIs
2. **+ Criar entrevista** → wizard 3 passos
3. Revisar perguntas IA → publicar
4. Ver respostas por candidato (transcript + score + áudio)

**Por que não WhatsApp:**

- Bloqueio/limitação BSP e templates
- UX fragmentada (sai da marca Sincla)
- LGPD/consentimento mais difícil de auditar
- Chat proprietário = **asset do produto** + dados no nosso Supabase

---

## 4. Modelo de dados (novo — migrations)

### 4.1 Triagem e candidatura enriquecida

```sql
-- candidatos (alter)
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS pretensao_salarial NUMERIC;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS fonte TEXT; -- PORTAL, LINKEDIN, HUNTING, INDICACAO, API
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- candidaturas (alter)
ALTER TABLE candidaturas ADD COLUMN IF NOT EXISTS fit_nivel TEXT CHECK (fit_nivel IN ('BAIXO','MEDIO','ALTO'));
ALTER TABLE candidaturas ADD COLUMN IF NOT EXISTS fit_score NUMERIC;
ALTER TABLE candidaturas ADD COLUMN IF NOT EXISTS fit_explicacao JSONB;
ALTER TABLE candidaturas ADD COLUMN IF NOT EXISTS triagem_em TIMESTAMPTZ;

-- tags por vaga (opcional)
CREATE TABLE vaga_tags (...);
CREATE TABLE candidatura_tags (...);
```

### 4.2 Agente de triagem (config por vaga)

```sql
CREATE TABLE triagem_agente_config (
  vaga_id UUID PRIMARY KEY REFERENCES vagas(id),
  peso_salario NUMERIC DEFAULT 0.33,
  peso_curriculo NUMERIC DEFAULT 0.34,
  peso_formulario NUMERIC DEFAULT 0.33,
  salario_min NUMERIC,
  salario_max NUMERIC,
  nota_formulario_min NUMERIC DEFAULT 0.6,
  ativo BOOLEAN DEFAULT TRUE
);
```

### 4.3 Entrevistas Chat (core diferencial)

```sql
CREATE TABLE entrevista_fluxos (
  id UUID PRIMARY KEY,
  vaga_id UUID NOT NULL REFERENCES vagas(id),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  nome TEXT NOT NULL,
  status TEXT CHECK (status IN ('RASCUNHO','PUBLICADO','ARQUIVADO')),
  total_perguntas INT,
  pct_tecnico INT, pct_cultural INT, pct_trajetoria INT,
  publicado BOOLEAN DEFAULT FALSE,
  automacao_etapa_id UUID,
  automacao_acao TEXT, -- ENVIAR_LINK_EMAIL
  automacao_delay_min INT,
  email_template_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entrevista_perguntas (
  id UUID PRIMARY KEY,
  fluxo_id UUID REFERENCES entrevista_fluxos(id),
  ordem INT,
  texto TEXT NOT NULL,
  tipo_resposta TEXT CHECK (tipo_resposta IN ('TEXTO_CURTO','TEXTO_LONGO','MULTIPLA','AUDIO')),
  natureza TEXT CHECK (natureza IN ('TECNICO','CULTURAL','TRAJETORIA')),
  peso TEXT CHECK (peso IN ('ALTO','MEDIO','BAIXO')),
  pre_eliminatoria BOOLEAN DEFAULT FALSE,
  criterios JSONB DEFAULT '[]', -- [{texto, peso}]
  status_revisao TEXT DEFAULT 'AGUARDANDO'
);

CREATE TABLE entrevista_sessoes (
  id UUID PRIMARY KEY,
  fluxo_id UUID NOT NULL,
  candidatura_id UUID NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('PENDENTE','EM_ANDAMENTO','CONCLUIDA','EXPIRADA','REPROVADA')),
  pontuacao_final NUMERIC,
  csat INT CHECK (csat BETWEEN 1 AND 5),
  iniciada_em TIMESTAMPTZ,
  concluida_em TIMESTAMPTZ
);

CREATE TABLE entrevista_respostas (
  id UUID PRIMARY KEY,
  sessao_id UUID NOT NULL,
  pergunta_id UUID NOT NULL,
  resposta_texto TEXT,
  resposta_audio_url TEXT,
  resposta_json JSONB,
  pontuacao NUMERIC,
  avaliacao_ia JSONB,
  pre_eliminada BOOLEAN DEFAULT FALSE
);
```

### 4.4 Automações

```sql
CREATE TABLE automacoes_vaga (
  id UUID PRIMARY KEY,
  vaga_id UUID NOT NULL,
  gatilho TEXT, -- ETAPA_ENTRADA, CANDIDATURA_CRIADA, FIT_ALTO
  condicao JSONB,
  acao TEXT, -- ENVIAR_ENTREVISTA, MOVER_ETAPA, EMAIL, WEBHOOK
  acao_params JSONB,
  ativo BOOLEAN DEFAULT TRUE
);
```

### 4.5 Busca inteligente (fase 2)

```sql
CREATE TABLE busca_inteligente_historico (
  id UUID PRIMARY KEY,
  vaga_id UUID,
  usuario_id UUID,
  query_nl TEXT,
  query_sql JSONB,
  resultados_count INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Edge Functions / serviços novos

| Function | Responsabilidade |
|----------|------------------|
| `triagem-agente-run` | Recalcula fit (salário + currículo + formulário) — cron ou on-change |
| `entrevista-gerar-perguntas` | IA gera N perguntas por natureza (Hub tier standard) |
| `entrevista-chat` | Turno do chat: próxima pergunta, recebe resposta, persiste |
| `entrevista-avaliar-resposta` | IA pontua vs critérios + pré-eliminatória |
| `entrevista-finalizar` | CSAT, KPIs, webhook, automação etapa |
| `busca-inteligente` | NL → filtros estruturados (tier light) |

**IA:** sempre via Hub `ai-generate` / proxy `ai-insight` — nunca chave no frontend.

---

## 6. Impacto no que estávamos fazendo

| Trabalho recente | Status | Ajuste |
|------------------|--------|--------|
| Webhooks W0–W5 | ✅ Feito | **Manter** — alimenta ATS externo quando entrevista concluir |
| Integrações UI | ✅ Feito | **Manter** — aba Conectores ok |
| Rebrand Talento | ✅ Feito | **Manter** |
| Pipeline Kanban atual | 🟡 | **Substituir** por aba Talentos no workspace |
| AgendaEntrevistas | ❌ Stub | **Repensar** — calendário humano vira sub-módulo; foco = Chat |
| GerenciarVagas lista | ✅ | **Manter** como índice; clique abre **VagaWorkspace** |
| Fase 6 plano antigo (só API) | 📋 | **Expandida** — API + workspace + chat |
| Entrevistas WhatsApp (benchmark) | — | **Nunca fazer** — Chat Sincla desde o dia 1 |

---

## 7. Plano de implantação por fases

### Fase A — Fundação Workspace (4–6 semanas)

**Objetivo:** navegação igual ao benchmark; Talentos utilizável.

| # | Entrega | Esforço |
|---|---------|---------|
| A1 | Rota `VagaWorkspace` + layout abas (shell) | M |
| A2 | Migrar Pipeline → aba **Talentos** (kanban + lista) | L |
| A3 | Schema: tags, fonte, pretensão_salarial, fit_* | M |
| A4 | Cards candidato ricos (fonte, tags, tempo, fit placeholder) | M |
| A5 | Sub-abas Ativos / Desistentes / Reprovados | S |
| A6 | Drag-and-drop kanban + persistir etapa_id | L |
| A7 | Bulk Reprovar / Avançar | M |

### Fase B — Agente de Triagem (3–4 semanas)

| # | Entrega | Esforço |
|---|---------|---------|
| B1 | `triagem_agente_config` + aba **Agente de triagem** | M |
| B2 | Scoring salário + formulário (questionário scored no portal) | L |
| B3 | Scoring currículo via IA (Hub) | M |
| B4 | Abas Baixo/Médio/Alto fit + tabela com barra % | M |
| B5 | Edge `triagem-agente-run` + trigger on candidatura/update | M |

### Fase C — Chat de Entrevista ★ Diferencial (6–8 semanas)

| # | Entrega | Esforço |
|---|---------|---------|
| C1 | Migrations entrevista_* | M |
| C2 | Wizard 3 passos (Config → Perguntas → Publicação) | L |
| C3 | `entrevista-gerar-perguntas` (IA) | M |
| C4 | UI revisão perguntas + critérios + pré-eliminatória | L |
| C5 | **Página pública chat** `/p/{slug}/entrevista/{token}` | XL |
| C6 | `entrevista-chat` + `entrevista-avaliar-resposta` | L |
| C7 | Dashboard KPIs (total, horas, pontuação, CSAT) | M |
| C8 | Ver respostas (recrutador) + áudio player | M |
| C9 | Automação: etapa → e-mail com link (Hub/gateway) | M |
| C10 | Webhook `entrevista.concluida` | S |

### Fase D — Inteligência operacional (4–6 semanas)

| # | Entrega | Esforço |
|---|---------|---------|
| D1 | Busca inteligente (NL) | L |
| D2 | Automatizar (UI + `automacoes_vaga`) | L |
| D3 | Analytics por vaga (funil, SLA badge) | L |
| D4 | Aba Sobre + Divulgação (links, UTM, fontes) | M |

### Fase E — Paridade mercado (backlog)

| # | Entrega |
|---|---------|
| E1 | Testes/assessments |
| E2 | Kits entrevista humana (scorecard) |
| E3 | Diversidade |
| E4 | Agenda humana + Google/365 |
| E5 | Multipublicação job boards |

---

## 8. Wireframe lógico — VagaWorkspace

```
/talento/{slug}/vagas/{vagaId}
├── Talentos          ← kanban/lista (default)
├── Analytics
├── Sobre a vaga
├── Divulgação
├── Formulário
├── Testes            (E1)
├── Kits entrevista   (E2)
├── Entrevistas       ← ★ Chat Sincla (substitui WhatsApp)
└── Agente triagem
```

**Menu lateral global** (AppLayout): Vagas (lista) · Banco talentos · Config global · Integrações

---

## 9. Métricas de sucesso (produto)

| Métrica | Meta |
|---------|------|
| Time-to-first-interview-link | < 15 min após publicar vaga |
| Taxa conclusão entrevista chat | > 60% |
| CSAT entrevista | > 4.0 |
| Redução tempo triagem manual | 50% vs sem agente |
| Zero dependência WhatsApp | 100% entrevistas no chat Sincla |

---

## 10. Próximo passo imediato (sprint 0)

1. **Aprovar** este plano e repriorizar `docs/VAGAS-PLANO-EXECUCAO.md`
2. **Esconder** menu Entrevistas (AgendaEntrevistas stub) até Fase C/E4
3. **Spike C5:** protótipo estático da página chat candidato (mobile)
4. **Migration A3 + C1** em branch dedicada `feature/vaga-workspace`
5. **Shell VagaWorkspace** com abas vazias + migrar Pipeline como primeira aba

---

## 11. Referências internas

- Benchmark mercado: `docs/TALENTO-BENCHMARK-MERCADO.md`
- Webhooks (continua válido): `docs/WEBHOOKS` em `tools/api/docs/WEBHOOKS-TALENTO.md`
- IA central: `docs/IA-CENTRAL.md`
- Contexto app: `tools/vagas/.agent/workflows/contextualizacao.md`

---

*Documento vivo — revisar após aprovação do Fase A shell.*
