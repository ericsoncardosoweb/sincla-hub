# Sincla Ecosystem

> Organização macro de todas as plataformas do ecossistema Sincla.

## Estrutura

```
sincla/
├── site/           ← Site institucional (sincla.com.br)
├── app/            ← Painel geral (app.sincla.com.br)
├── tools/          ← Plataformas (git e deploy independentes)
│   ├── rh/         ← Sincla RH
│   ├── ead/        ← Sincla EAD
│   ├── bolso/      ← Sincla Bolso
│   ├── lead/       ← Sincla Leads
│   └── agenda/     ← Sincla Agenda
├── packages/       ← Pacotes npm compartilhados
│   ├── ui/         ← @sincla/ui — Tema, componentes
│   ├── auth/       ← @sincla/auth — Supabase, SSO
│   └── shared/     ← @sincla/shared — Types, hooks, utils
└── docs/           ← Documentação macro
```

## Domínios

| URL | Pasta | Descrição |
|-----|-------|-----------|
| `sincla.com.br` | `site/` | Landing page institucional |
| `app.sincla.com.br` | `app/` | Painel geral do Hub |
| `app.sincla.com.br/rh` | `tools/rh/` | Sincla RH |
| `app.sincla.com.br/ead` | `tools/ead/` | Sincla EAD |
| `app.sincla.com.br/bolso` | `tools/bolso/` | Sincla Bolso |
| `app.sincla.com.br/lead` | `tools/lead/` | Sincla Leads |
| `app.sincla.com.br/agenda` | `tools/agenda/` | Sincla Agenda |

## Git

- **Este repositório** gerencia: `docs/`, `packages/`, `site/`, `app/`
- **`tools/`** é ignorado pelo git raiz — cada tool tem seu `.git` independente
- Deploys são independentes por app

## Packages Compartilhados

Cada app pode consumir os pacotes via `npm link` ou path relativo:

```tsx
import { SinclaProvider } from '@sincla/ui';
import { AuthProvider, useAuth } from '@sincla/auth';
import { formatCurrency, type SinclaUser } from '@sincla/shared';
```
