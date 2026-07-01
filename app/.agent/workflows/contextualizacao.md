---
description: Contextualização completa do Sincla Hub (App) para o agente IA
---

# /contextualizacao — Sincla Hub (App)

> Leia este arquivo **sempre ao iniciar uma tarefa** no projeto `app/`.
> Este é o **orquestrador central** do ecossistema Sincla — gerencia identidade, billing e SSO.

---

## 🏷️ Identidade do Projeto

| Campo | Valor |
|-------|-------|
| **Nome** | Sincla Hub |
| **Diretório** | `c:\www\sincla\app\` |
| **URL Produção** | `app.sincla.com.br` |
| **Supabase Ref** | `igwjtvdanulrwntdyfbt` |
| **Supabase URL** | https://igwjtvdanulrwntdyfbt.supabase.co |
| **Git** | Monorepo raiz (`c:\www\sincla\.git`) |
| **Deploy** | Independente (verificar workflow de deploy) |

---

## 🛠️ Stack Tecnológica

```
Frontend:     React 19, TypeScript
UI Library:   Mantine 8.3.x (⚠️ peer dep crítica — manter ^8.3.16)
Build:        Vite 7
Icons:        Tabler Icons
State:        Context API (AuthContext, CompanyContext)
Routing:      React Router
Pagamentos:   Asaas (asaasService.ts)
Storage:      Supabase Storage (Bunny CDN via storage.ts)
```

---

## 🗂️ Estrutura de Pastas

```
app/src/
├── App.tsx                   ← Router principal
├── components/
│   ├── dashboard/
│   │   └── DashboardLayout.tsx  ← Layout principal do painel
│   ├── checkout/             ← Componentes de checkout
│   ├── notifications/        ← Notificações in-app
│   ├── shared/               ← Componentes compartilhados
│   └── signature-visual/     ← Assinatura visual da marca
├── pages/
│   ├── Dashboard/
│   │   ├── DashboardHome.tsx     ← Home do painel (ferramentas, empresas)
│   │   ├── Companies.tsx         ← Gestão de empresas
│   │   ├── CompanySettings.tsx   ← Configurações da empresa
│   │   ├── Subscriptions.tsx     ← Assinaturas e planos
│   │   ├── Team.tsx              ← Membros da equipe
│   │   ├── Contacts.tsx          ← Contatos centralizados
│   │   ├── Integrations.tsx      ← Integrações externas
│   │   ├── Profile.tsx           ← Perfil do usuário
│   │   └── Onboarding.tsx        ← Onboarding inicial
│   ├── Admin/                ← Painel super-admin
│   ├── Partner/              ← Área de parceiros/consultores
│   ├── Checkout/             ← Fluxo de compra/upgrade
│   └── auth/                 ← Login, Cadastro, Recuperação
├── shared/
│   ├── contexts/
│   │   ├── AuthContext.tsx        ← Contexto de autenticação (hook: useAuth)
│   │   └── CompanyContext.tsx     ← Contexto de empresa ativa
│   ├── services/
│   │   ├── asaasService.ts       ← Integração Asaas (pagamentos)
│   │   ├── cross-auth.ts         ← Geração de tokens SSO cross-tool
│   │   ├── notificationService.ts ← Envio de notificações
│   │   └── storage.ts            ← Upload/download Supabase Storage
│   ├── lib/                  ← Supabase client, utils
│   ├── types/                ← Types globais do Hub
│   └── styles/               ← Estilos globais compartilhados
```

---

## 🔐 Autenticação e Sessão

### Contexto (`AuthContext.tsx`)
```ts
const { user, session, subscriber, loading } = useAuth()
```
- `user` → auth.users do Supabase
- `subscriber` → registro em `subscribers` (perfil estendido)
- Supabase GoTrue gerencia sessão (JWT + refresh automático)

### CompanyContext (`CompanyContext.tsx`)
```ts
const { company, setCompany } = useCompany()
```
Empresa ativa selecionada pelo usuário.

### Geração de Token SSO (cross-auth.ts)
Quando usuário clica numa ferramenta satélite:
```ts
// Gera JWT com payload completo e redireciona para /sso?token=<jwt>
await generateCrossToken({ userId, companyId, productId })
```

---

## 🏢 Modelo de Negócio e Dados

### Hierarquia Multi-tenant
```
Subscriber (quem paga)
  └── Companies (N empresas)
        ├── Company Members (convidados)
        │     └── Member Product Access (por ferramenta)
        └── Subscriptions (ferramentas assinadas)

Partner (consultor)
  └── Gerencia empresas de outros subscribers
```

### Tabelas Principais do Hub
| Tabela | Descrição |
|--------|-----------|
| `subscribers` | Assinantes (= auth.users.id) |
| `admin_users` | Super-admins da plataforma |
| `companies` | Empresas (tenants) — slug, branding, CNPJ |
| `company_members` | Vínculo usuário ↔ empresa (role: owner/admin/manager/member) |
| `products` | Catálogo de ferramentas (rh, ead, agenda...) |
| `product_plans` | Planos por ferramenta (starter, pro, business) |
| `subscriptions` | Assinaturas ativas por empresa |
| `plan_features` / `plan_feature_values` | Features por plano |
| `member_product_access` | Nível de acesso: advanced / basic |
| `partners` | Consultores (affiliate_code, commission_percent) |
| `partner_commissions` | Comissões recorrentes por assinatura |
| `contacts` | Contatos centralizados (hub) |
| `sync_settings` / `sync_logs` | Sincronização com satélites |
| `api_tokens` | Tokens de API por empresa/produto |
| `notifications` | Notificações in-app do hub |

### Níveis de Permissão
| Nível | Slug | Descrição |
|-------|------|-----------|
| Avançado | `advanced` | CRUD completo |
| Básico | `basic` | Somente leitura e ações simples |

### Billing (Asaas)
- `asaasService.ts` → criação de clientes, assinaturas, cobranças
- Webhook `/billing-webhook` recebe eventos Asaas → atualiza `subscriptions`

---

## 🛰️ Edge Functions do Hub

| Função | Propósito |
|--------|-----------|
| `validate-cross-token` | Valida JWT SSO enviado por satélite |
| `generate-cross-token` | Gera JWT SSO para redirecionar ao satélite |
| `check-permission` | Verifica acesso cascata (owner→partner→member) |
| `check-subscription` | Verifica assinatura ativa da empresa |
| `billing-webhook` | Recebe eventos Asaas |
| `get-company-branding` | Retorna branding (logo, cores) da empresa |
| `sync-contacts` | Sincroniza contatos com satélites |
| `send-push` | Web Push com VAPID signing |

---

## 🎨 Padrões de UI/UX

### Navegação Principal (Sidebar)
- Seção **"Meus APPs"** colapsável com sub-items por ferramenta ativa
- Cards de ferramentas com ações rápidas: **"Acessar"** e **"Compartilhar"**
- Empresas com troca via CompanyContext

### Design Tokens
```css
--color-primary: #0087ff;
--bg-base: #0a0a0f;
--bg-elevated: #12121a;
--bg-card: #1a1a24;
--text-primary: #ffffff;
```

### DashboardLayout
O layout principal (`DashboardLayout.tsx`) contém:
- Header com busca global
- Sidebar com navegação multi-empresa
- Content area com lazy loading de módulos

---

## 🚀 Deploy

Verificar `.github/workflows/` para pipeline atual do Hub.
Migration SQL: pasta `app/supabase/migrations/`

---

## Supabase CLI

| Campo | Valor |
|-------|-------|
| **Project ref** | `igwjtvdanulrwntdyfbt` |
| **URL** | https://igwjtvdanulrwntdyfbt.supabase.co |

Tokens e senha de banco: variáveis locais (`.env`) ou MCP Supabase — **nunca** em docs versionados.

---

## 🚫 Regras de Ouro do Hub

1. O Hub é o **single source of truth** de identidade — nunca criar user/company duplicado
2. SSO tokens têm validade de **5 minutos** — não cachear token SSO
3. Sempre usar hint de FK em joins Supabase com ambiguidade
4. Migrations → sempre SQL manual no Supabase Dashboard
5. Nunca alterar Mantine 8 → versão maior sem avaliar peer deps
6. **Nunca fazer deploy** sem aprovação explícita
