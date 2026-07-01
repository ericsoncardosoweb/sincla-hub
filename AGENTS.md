# Sincla — Guia para agentes (Cursor)

Ecossistema SaaS multi-tenant: Hub central + site institucional + ferramentas satélite independentes.

## Onde começar

| Tarefa | Pasta | Docs |
|--------|-------|------|
| Painel, auth, billing, SSO | `app/` | `app/.agent/workflows/contextualizacao.md` |
| Landing / marketing | `site/` | `site/.agent/workflows/contextualizacao.md`, `docs/04-DESIGN-SYSTEM.md` |
| RH, Agenda, EAD, etc. | `tools/<nome>/` | `docs/SATELLITE_INTEGRATION_GUIDE.md` |
| Arquitetura macro | `docs/` | `docs/00-OVERVIEW.md`, `README.md` |

## Rules Cursor

Regras persistentes em `.cursor/rules/` (migradas de `.gemini/workflows/`):

- `00-sincla-ecosystem` — estrutura do monorepo
- `01-development-behavior` — padrões de código/UI
- `02-no-auto-deploy` — nunca deploy/push sem autorização
- `03-deploy-process` — repos e Easypanel
- `04-supabase` — MCP e project refs
- `05-app-hub` / `06-site-marketing` / `07-tools-satellite` — contexto por projeto

## Supabase

- **CLI + `app/.env`**: migrations, `db push`, `functions deploy`, scripts em `app/scripts/`
- **MCP** (config em `.cursor/mcp.json`): explorar schema, SQL, RLS, logs, types
  - `supabase-hub` → `igwjtvdanulrwntdyfbt` (Sincla APP)
  - `supabase-rh` → `fclqxinrkibiwhlhqfih`
  - `supabase-agenda` → `xupyvnyukhxdmfyrrozs`
  - `supabase-ead` → `gfgrifbpsfjugdmlyvjl`
  - `supabase-vagas` → `zsnjddocencekcupzxeh`

Cada servidor autentica via OAuth na primeira vez que for usado (Settings → Tools & MCP).

Credenciais CLI: `app/.env` (gitignored; template em `app/.env.example`).

## Workflows legados

Arquivos Antigravity/Gemini mantidos como referência:

- `.gemini/workflows/` — deploy e comportamento
- `{app,site}/.agent/workflows/` — contextualização por app
