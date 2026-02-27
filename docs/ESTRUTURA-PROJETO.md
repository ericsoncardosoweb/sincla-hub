# Sincla Hub — Estrutura do Projeto

> Última atualização: 22/02/2026

## Visão Geral

O Sincla é uma plataforma SaaS multi-tenant que oferece ferramentas empresariais (RH, EAD, Leads, Agenda, Intranet) sob um hub centralizado.

## Estrutura de Diretórios

```
sincla/
├── site/                          # Aplicação principal (Vite + React + Mantine)
│   ├── src/
│   │   ├── main.tsx               # Entry point
│   │   ├── App.tsx                # Router principal (react-router-dom)
│   │   ├── index.css              # CSS do entry point
│   │   │
│   │   ├── site/                  # 🌐 PÚBLICO (Landing page + páginas institucionais)
│   │   │   ├── pages/
│   │   │   │   ├── Landing.tsx    # Home com tema dark (data-landing)
│   │   │   │   ├── company/       # /empresa, /carreiras, /eventos, /blog...
│   │   │   │   ├── resources/     # /suporte, /marketplace, /comunidade...
│   │   │   │   └── learn-more/    # /parceiros, /treinamento, /documentacao...
│   │   │   └── components/
│   │   │       ├── layout/        # Header, Footer
│   │   │       ├── sections/      # Hero, Stats, Platforms, Partners...
│   │   │       ├── common/        # ScrollProgress
│   │   │       ├── modals/        # OnboardingModal
│   │   │       ├── signature-visual/
│   │   │       ├── visual-system/
│   │   │       └── page-template/
│   │   │
│   │   ├── app/                   # 🔐 AUTENTICADO (Dashboard + Admin)
│   │   │   ├── pages/
│   │   │   │   ├── auth/          # /login, /cadastro, /esqueci-senha, /auth/callback
│   │   │   │   ├── Dashboard/     # /painel (DashboardHome, Companies, Team, Settings)
│   │   │   │   └── Admin/         # /admin (AdminDashboard, Products, Plans)
│   │   │   └── components/
│   │   │       └── dashboard/     # DashboardLayout (AppShell)
│   │   │
│   │   └── shared/                # 🔗 COMPARTILHADO (Site + App)
│   │       ├── contexts/          # AuthContext, CompanyContext, index
│   │       ├── lib/               # supabase.ts (client)
│   │       ├── services/          # cross-auth.ts
│   │       ├── hooks/             # useMediaQuery, etc.
│   │       ├── types/             # TypeScript types
│   │       ├── styles/            # global.css, theme.ts
│   │       ├── data/              # platforms.ts (dados estáticos)
│   │       └── assets/            # Imagens e SVGs
│   │
│   ├── supabase/
│   │   ├── migrations/
│   │   │   ├── 001_initial_schema.sql      # Subscribers, Companies, Members, Products
│   │   │   ├── 002_plans_and_pricing.sql   # Plans, Features, Admin Users
│   │   │   └── 003_permissions_and_partners.sql  # Access levels, Partners, Commissions
│   │   └── functions/
│   │       ├── billing-webhook/            # Stripe/Asaas → subscriptions
│   │       ├── check-permission/           # Verificação de acesso (owner/partner/member)
│   │       ├── check-subscription/         # Verifica assinatura ativa
│   │       ├── generate-cross-token/       # SSO entre ferramentas
│   │       ├── validate-cross-token/       # Validação de cross-token
│   │       ├── get-company-branding/       # Branding da empresa
│   │       └── sync-contacts/              # Sincronização de contatos
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.app.json
│
├── tools/                         # Ferramentas satélite (apps independentes)
│   └── ead/                       # Sincla EAD (já existente)
│
├── packages/                      # Bibliotecas compartilhadas (futuro)
│   ├── ui/                        # @sincla/ui
│   ├── auth/                      # @sincla/auth
│   └── shared/                    # @sincla/shared
│
├── app/                           # Reservado (futuro multi-app)
└── docs/                          # Documentação do projeto
```

## Tema

| Área | Tema | Mecanismo |
|------|------|-----------|
| Landing Page (`/`) | **Dark** | `data-landing` attribute + CSS variables |
| Dashboard (`/painel`) | **Light** | `defaultColorScheme="light"` no MantineProvider |
| Admin (`/admin`) | **Light** | Herda do MantineProvider |
| Auth pages | **Light** | Backgrounds neutros (branco) |

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19 + TypeScript + Vite 7 |
| UI Library | Mantine Core + Notifications |
| Routing | react-router-dom |
| Data | TanStack Query + Supabase JS |
| Icons | Tabler Icons |
| Auth | Supabase Auth |
| Database | PostgreSQL (Supabase) |
| Edge Functions | Deno (Supabase Functions) |
| Billing | Stripe + Asaas (via webhook) |
