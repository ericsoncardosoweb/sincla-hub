# 🚀 Guia de Deploy - Sincla Hub no Supabase

Este documento contém **todas as configurações** que você precisa fazer no Supabase para o Sincla Hub funcionar. Siga cada seção cuidadosamente.

---

## 📋 Índice

1. [Criar Projeto no Supabase](#1-criar-projeto-no-supabase)
2. [Executar Migrations](#2-executar-migrations)
3. [Configurar Edge Functions](#3-configurar-edge-functions)
4. [Configurar Variáveis de Ambiente](#4-configurar-variáveis-de-ambiente)
5. [Configurar Autenticação](#5-configurar-autenticação)
6. [Adicionar Admin Master](#6-adicionar-admin-master)
7. [Configurar Webhooks (Opcional)](#7-configurar-webhooks)
8. [Configurar Cron Jobs (Opcional)](#8-configurar-cron-jobs)

---

## 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `sincla-hub`
   - **Database Password**: (guarde essa senha!)
   - **Region**: South America (São Paulo)
4. Aguarde a criação do projeto (~2 minutos)

### Copiar Credenciais

Após criar, vá em **Settings > API** e copie:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (NÃO exponha essa no frontend!)
```

---

## 2. Executar Migrations

### Opção A: Via Dashboard (Mais Fácil)

1. Vá em **SQL Editor** no dashboard do Supabase
2. Clique em **"New Query"**
3. Cole o conteúdo do arquivo `supabase/migrations/001_initial_schema.sql`
4. Clique em **"Run"**
5. Repita para `supabase/migrations/002_plans_and_pricing.sql`

### Opção B: Via CLI (Recomendado para Produção)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref SEU_PROJECT_REF

# Aplicar migrations
supabase db push
```

### 📁 Arquivos de Migration

| Arquivo | Descrição |
|---------|-----------|
| `001_initial_schema.sql` | Tabelas principais: subscribers, companies, company_members, products, subscriptions, contacts, sync_settings, sync_logs, api_tokens + RLS |
| `002_plans_and_pricing.sql` | Tabelas de planos: product_plans, plan_features, plan_feature_values, admin_users + Dados iniciais de planos |

---

## 3. Configurar Edge Functions

### Deploy das Edge Functions

```bash
# Na pasta do projeto
cd supabase/functions

# Deploy de todas as funções
supabase functions deploy generate-cross-token
supabase functions deploy validate-cross-token
supabase functions deploy check-subscription
supabase functions deploy check-permission
supabase functions deploy get-company-branding
supabase functions deploy sync-contacts
supabase functions deploy billing-webhook
```

### Ou via Dashboard

1. Vá em **Edge Functions**
2. Clique em **"Create a new function"**
3. Para cada função, cole o código do arquivo correspondente em `supabase/functions/*/index.ts`

### 📁 Edge Functions Disponíveis

| Função | Endpoint | Descrição | Cache |
|--------|----------|-----------|-------|
| `generate-cross-token` | `POST` | Gera JWT para SSO entre Hub e produtos | Não |
| `validate-cross-token` | `POST` | Valida JWT recebido pelos produtos | Não |
| `check-subscription` | `POST` | Verifica se empresa tem assinatura ativa | 60s |
| `check-permission` | `POST` | Verifica permissões do usuário | 60s |
| `get-company-branding` | `GET/POST` | Retorna branding da empresa | 5min |
| `sync-contacts` | `POST` | Sincroniza contatos Hub ↔ Produto | Não |
| `billing-webhook` | `POST` | Recebe eventos de gateways de pagamento | Não |

> 📖 **Documentação completa da API**: Veja `docs/SATELLITE_INTEGRATION_GUIDE.md`

---

## 4. Configurar Variáveis de Ambiente

### No Supabase Dashboard

Vá em **Settings > Edge Functions** e adicione:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `HUB_JWT_SECRET` | `sua-chave-secreta-aqui-32-chars` | Chave para assinar tokens SSO. Use uma string longa e segura! |

### No projeto local (.env)

Crie o arquivo `.env` na raiz do projeto:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Opcional: Para testes locais de Edge Functions
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 5. Configurar Autenticação

### No Supabase Dashboard

1. Vá em **Authentication > Providers**

2. **Email** (já habilitado por padrão):
   - ✅ Enable Email Signup
   - ✅ Enable Email Confirmations
   - (Opcional) Customize email templates

3. **Site URL** (em Authentication > URL Configuration):
   ```
   https://sincla.com.br
   ```

4. **Redirect URLs**:
   ```
   https://sincla.com.br/auth/callback
   http://localhost:5173/auth/callback
   ```

### Configurar Email Templates (Opcional)

Vá em **Authentication > Email Templates** e customize:

- **Confirm signup**: Email de confirmação de cadastro
- **Magic Link**: Email de login sem senha
- **Reset Password**: Email de recuperação de senha

---

## 6. Adicionar Admin Master

Para acessar o painel Admin (`/admin`), você precisa se cadastrar como admin.

### Via SQL Editor

Após criar sua conta normalmente, execute:

```sql
-- Substitua pelo seu user ID (encontre em Authentication > Users)
INSERT INTO admin_users (id, email, name, role, is_active)
VALUES (
    'SEU-USER-ID-AQUI',
    'seu@email.com',
    'Seu Nome',
    'super_admin',
    true
);
```

### Encontrar seu User ID

1. Vá em **Authentication > Users**
2. Encontre seu email
3. Copie o UUID da coluna "UID"

---

## 7. Configurar Webhooks

### Para integração com produtos externos

Se os produtos Sincla (RH, EAD, etc.) precisarem receber notificações do Hub:

1. Vá em **Database > Webhooks**
2. Clique em **"Create a new webhook"**

### Webhooks Sugeridos

| Nome | Tabela | Eventos | URL |
|------|--------|---------|-----|
| `on_subscription_change` | `subscriptions` | INSERT, UPDATE, DELETE | `https://produto.sincla.com.br/webhook/hub` |
| `on_company_update` | `companies` | UPDATE | `https://produto.sincla.com.br/webhook/branding` |
| `on_contact_sync` | `contacts` | INSERT, UPDATE | `https://produto.sincla.com.br/webhook/contacts` |

### Payload de exemplo

```json
{
  "type": "UPDATE",
  "table": "subscriptions",
  "schema": "public",
  "record": { ... },
  "old_record": { ... }
}
```

---

## 8. Configurar Cron Jobs

### Jobs Recomendados

Use **pg_cron** para tarefas agendadas. Habilite primeiro:

1. Vá em **Database > Extensions**
2. Procure por `pg_cron` e habilite

### Exemplos de Cron Jobs

Execute no **SQL Editor**:

```sql
-- Sincronização de contatos a cada hora
SELECT cron.schedule(
    'sync-contacts-hourly',
    '0 * * * *',  -- A cada hora
    $$
    SELECT sync_pending_contacts();
    $$
);

-- Limpeza de tokens expirados diariamente
SELECT cron.schedule(
    'cleanup-expired-tokens',
    '0 3 * * *',  -- 3h da manhã
    $$
    DELETE FROM api_tokens 
    WHERE expires_at < NOW() 
    OR revoked_at IS NOT NULL;
    $$
);

-- Verificar assinaturas vencidas
SELECT cron.schedule(
    'check-expired-subscriptions',
    '0 0 * * *',  -- Meia-noite
    $$
    UPDATE subscriptions 
    SET status = 'suspended'
    WHERE status = 'active' 
    AND current_period_end < NOW();
    $$
);
```

### Verificar Cron Jobs Ativos

```sql
SELECT * FROM cron.job;
```

### Remover um Cron Job

```sql
SELECT cron.unschedule('nome-do-job');
```

---

## ✅ Checklist Final

Antes de ir para produção, verifique:

- [ ] Migrations executadas sem erros
- [ ] Edge Functions deployadas e funcionando
- [ ] `HUB_JWT_SECRET` configurado no Supabase
- [ ] `.env` configurado no projeto local
- [ ] Admin Master cadastrado na tabela `admin_users`
- [ ] URLs de redirect configuradas
- [ ] Emails customizados (opcional)
- [ ] Webhooks configurados (se necessário)
- [ ] Cron jobs configurados (se necessário)

---

## 🔧 Troubleshooting

### Erro "RLS policy violation"
- Verifique se o usuário está autenticado
- Verifique se o usuário tem permissão na tabela

### Edge Function retorna 500
- Verifique os logs em **Edge Functions > Logs**
- Verifique se `HUB_JWT_SECRET` está configurado

### Magic Link não chega
- Verifique spam
- Verifique se o email está habilitado em Authentication > Providers
- Verifique os logs em **Logs > Auth**

---

## 📞 Suporte

Se tiver problemas, verifique:
1. Logs do Supabase (**Logs** no dashboard)
2. Console do navegador (F12)
3. Documentação: [supabase.com/docs](https://supabase.com/docs)
