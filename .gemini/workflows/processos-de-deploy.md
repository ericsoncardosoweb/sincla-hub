---
description: Processos de Deploy - Mapeamento de Repositórios e Serviços Easypanel
---

# Processos de Deploy — Sincla

## Estrutura de Repositórios

### Monorepo Principal → `sincla-hub`
- **Diretório local**: `c:\www\sincla` (raiz)
- **GitHub**: `ericsoncardosoweb/sincla-hub`
- **Remotes Git**:
  - `origin` → `sincla-hub.git` (deploy do Hub App)
  - `site` → `sincla-site.git` (deploy do Site institucional)
- **Contém**: `/app`, `/docs`, `/logos`, `/packages`, `/site`, `.gitignore`, `README.md`
- **NÃO contém**: `/tools` (cada ferramenta tem seu próprio repo)

### Ferramentas (repos independentes)

| Diretório Local | Repositório GitHub | Serviço Easypanel |
|---|---|---|
| `c:\www\sincla\tools\agenda` | `ericsoncardosoweb/sincla-agenda` | `apps/sincla-agenda` |
| `c:\www\sincla\tools\rh` | `ericsoncardosoweb/sincla-rh` | `apps/sincla-rh` |
| `c:\www\sincla\tools\bolso` | `ericsoncardosoweb/sincla-bolso` | `apps/sincla-bolso` |
| `c:\www\sincla\tools\ead` | `ericsoncardosoweb/sincla-ead` | `apps/sincla-ead` |
| `c:\www\sincla\tools\vagas` | `ericsoncardosoweb/sincla-talento` | `apps/sincla-talento` |

## Mapeamento Repos → Serviços Easypanel

| Repositório GitHub | Serviço Easypanel | Build Path | Porta |
|---|---|---|---|
| `sincla-hub` | `apps/sincla-app` | `/app` | 5172 (dev) |
| `sincla-site` | `apps/site-sincla` | `/site` | — |
| `sincla-agenda` | `apps/sincla-agenda` | `/` | 5176 (dev) |
| `sincla-rh` | `apps/sincla-rh` | `/` | — |
| `sincla-bolso` | `apps/sincla-bolso` | `/` | — |
| `sincla-ead` | `apps/sincla-ead` | `/` | — |
| `sincla-talento` | `apps/sincla-talento` | `/` | — |
| `sincla-api` | `apps/sincla-api` | `/` | 8000 |

## Comandos de Deploy

### Hub App (sincla-app)
```bash
# Sempre executar da RAIZ do monorepo
cd c:\www\sincla
git add -A
git commit -m "feat(hub): descricao"
git push origin main   # → sincla-hub → Easypanel sincla-app
```

### Site (site-sincla)
```bash
cd c:\www\sincla
git push site main   # → sincla-site → Easypanel site-sincla
```

### Ferramentas (agenda, rh, etc.)
```bash
# Cada ferramenta tem seu próprio repo
cd c:\www\sincla\tools\agenda
git add -A
git commit -m "feat(agenda): descricao"
git push origin main   # → sincla-agenda → Easypanel sincla-agenda
```

## ⚠️ REGRAS IMPORTANTES

1. **NUNCA fazer deploy automático** sem autorização do usuário
2. Para o Hub App: push de `c:\www\sincla` para `origin` (sincla-hub)
3. Para o Site: push de `c:\www\sincla` para `site` (sincla-site)
4. Para ferramentas: push do diretório da ferramenta em `tools/`
5. O Hub e o Site compartilham o mesmo monorepo local, mas têm repos GitHub SEPARADOS
6. **Variáveis de ambiente de produção** são configuradas no Easypanel, não no `.env` local

## URLs de Produção

| Serviço | URL |
|---|---|
| Hub App | `https://app.sincla.com.br` |
| Site | `https://sincla.com.br` |
| Agenda | `https://app.sincla.com.br/agenda/` |
| RH | `https://app.sincla.com.br/rh/` |
| Talento (app) | `https://app.sincla.com.br/talento/` |
| API Gateway | `https://api.sincla.com.br` |

---

## Supabase CLI — Sincla Ecosystem

> **Não versionar credenciais neste arquivo.** Use MCP do Supabase no Cursor ou variáveis locais.

### Variáveis (ambiente local / CI — nunca commitar)

| Variável | Uso |
|----------|-----|
| `SUPABASE_ACCESS_TOKEN` | Token pessoal em [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Senha do banco do projeto (Dashboard → Settings → Database) |

Preferir **MCP Supabase** (`https://mcp.supabase.com/mcp`) para operações via agente.

### Project Refs por Projeto

| Projeto | Diretório | SUPABASE_PROJECT_REF |
|---------|-----------|----------------------|
| Hub | `app/` | `igwjtvdanulrwntdyfbt` |
| Agenda | `tools/agenda/` | `xupyvnyukhxdmfyrrozs` |
| Bolso | `tools/bolso/` e `tools/bolso/api/` | `yjyiryqaokmqjeblsqgl` |
| CRM | `tools/crm/` | `szpvltsqkmklesdorgly` |
| EAD | `tools/ead/` | `gfgrifbpsfjugdmlyvjl` |
| Lead | `tools/lead/` | `fnncbpfhuejjebfwyqoq` |
| RH | `tools/rh/` | `fclqxinrkibiwhlhqfih` |
| Talento | `tools/vagas/` | `zsnjddocencekcupzxeh` |

### Comandos úteis com CLI

```bash
# Linkar projeto ao CLI (necessário uma vez por projeto)
supabase link --project-ref <SUPABASE_PROJECT_REF>

# Subir migration
supabase db push

# Deploy de Edge Function
supabase functions deploy <nome-da-funcao>

# Ver logs de Edge Function
supabase functions logs <nome-da-funcao>

# Diff do banco (gerar migration)
supabase db diff -f nome_da_migration

# Executar SQL direto
supabase db execute --query "SELECT * FROM tabela LIMIT 5;"
```
