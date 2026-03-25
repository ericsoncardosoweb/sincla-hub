# Sincla Hub — Identidade Unificada (Identity Sync)

## Visão Geral

O sistema de Identidade Unificada centraliza a gestão de identidades de usuários no **Hub**, eliminando a necessidade de cadastrar colaboradores manualmente em cada ferramenta. A direção do fluxo é definida pela **flag `user_model`** de cada produto.

| Flag | Fluxo | Exemplo |
|---|---|---|
| `b2b` | **Hub → Ferramenta** (provisionamento automático) | RH, Agenda, Intranet |
| `b2c` | **Ferramenta → Hub** (sob demanda, via "Enviar pra Hub") | CRM, Leads, EAD* |

> **EAD** é híbrido: B2B (treinamento corporativo) ou B2C (venda de cursos). Definido por empresa.

---

## Arquitetura

```
┌────────────────────────────────────────────────────────────────────┐
│                         SINCLA HUB                                 │
│  auth.users  ←→  subscribers  ←→  companies  ←→  company_members  │
│                                                  ├─ user_type      │
│                                                  └─► member_product_access
│                                                       ├─ product_id│
│                                                       └─ access_level
│                                                                    │
│  [Trigger: member_product_access INSERT/UPDATE]                    │
│       ↓                                                            │
│  Edge Function: provision-tool-user                                │
│       ↓                                                            │
├──────────────────┬─────────────────┬──────────────────────────────┤
│  Sincla RH       │  Sincla Agenda  │  Sincla EAD (B2B mode)      │
│  (Supabase RH)   │  (Supabase AG)  │  (Supabase EAD)             │
│  shadow auth     │  shadow auth    │  shadow auth                 │
│  + empresas      │  + empresas     │  + empresas                  │
│  + usuarios      │  + users        │  + alunos                    │
└──────────────────┴─────────────────┴──────────────────────────────┘
```

---

## 1. Mudanças no Hub (Backend)

### 1.1. Migration: Novos campos

```sql
-- products: define se a ferramenta é B2B ou B2C
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS user_model TEXT DEFAULT 'b2b'
  CHECK (user_model IN ('b2b', 'b2c'));

-- company_members: tipo de acesso do membro
ALTER TABLE company_members 
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'collaborator'
  CHECK (user_type IN ('collaborator', 'manager', 'external', 'student', 'customer'));
```

### 1.2. Edge Function: `provision-tool-user`

**Responsabilidade**: Quando um membro recebe acesso a uma ferramenta B2B, provisiona automaticamente o shadow user na ferramenta alvo.

#### Trigger

```sql
-- Webhook no INSERT/UPDATE de member_product_access
-- Condição: produto.user_model = 'b2b'
-- Alvo: Edge Function provision-tool-user
```

#### Endpoint

```
POST /functions/v1/provision-tool-user
Authorization: Bearer {SERVICE_ROLE_KEY}
```

#### Payload

```json
{
  "action": "provision",           // provision | revoke
  "member_id": "uuid",            // company_members.id
  "subscriber_id": "uuid",        // subscribers.id (= auth.users.id)
  "email": "user@email.com",
  "name": "João Silva",
  "user_type": "collaborator",    // collaborator | manager | external | student | customer
  "company_id": "uuid",           // companies.id (= empresas.id no satellite)
  "company_name": "Acme Corp",
  "company_slug": "acme-corp",
  "cnpj": "12345678000100",
  "product_id": "uuid",           // products.id
  "product_slug": "rh",           // products.slug (identifica qual ferramenta)
  "access_level": "admin",        // admin | editor | viewer
  "plan_code": "professional",    // plano ativo
  "branding": {
    "logo_url": "...",
    "primary_color": "#0047CC",
    "secondary_color": "#00C2FF"
  }
}
```

#### Lógica Interna

1. Resolver `product_slug` → URL do Supabase da ferramenta alvo
2. Chamar endpoint da ferramenta: `POST /functions/v1/hub-provision-user`
3. Registrar resultado em `provision_logs` (sucesso/falha)

#### Configuração necessária (Secrets)

Cada ferramenta precisa de uma variável de ambiente no Hub com sua URL e service_role:

```
TOOL_RH_SUPABASE_URL=https://xxx.supabase.co
TOOL_RH_SERVICE_ROLE_KEY=eyJ...
TOOL_AGENDA_SUPABASE_URL=https://yyy.supabase.co
TOOL_AGENDA_SERVICE_ROLE_KEY=eyJ...
TOOL_EAD_SUPABASE_URL=https://zzz.supabase.co
TOOL_EAD_SERVICE_ROLE_KEY=eyJ...
```

### 1.3. Tabela: `provision_logs` (Auditoria)

```sql
CREATE TABLE IF NOT EXISTS provision_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_member_id UUID REFERENCES company_members(id),
    product_id UUID REFERENCES products(id),
    action TEXT NOT NULL,           -- 'provision' | 'revoke'
    status TEXT NOT NULL,           -- 'success' | 'error'
    error_message TEXT,
    response_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.4. UI: Gestão de Colaboradores

Página no Hub: `/{slug}/equipe` (ou dentro de Config > Equipe)

**Funcionalidades:**
- Lista de company_members com seus user_types
- Botão "Adicionar Membro" (email, nome, user_type)
- Checkboxes de "Ferramentas" disponíveis (com base nas subscriptions ativas)
- Select de access_level por ferramenta (admin, editor, viewer)
- Indicador de status do provisionamento (✅ sincronizado, ⏳ pendente, ❌ erro)

### 1.5. JWT Payload Atualizado (`generate-cross-token`)

Adicionar `user_type` ao payload existente:

```typescript
const payload = {
    // ... campos existentes ...
    user_type: member.user_type || 'collaborator',  // NOVO
}
```

---

## 2. Mudanças em Cada Ferramenta (Backend)

Cada ferramenta precisa de **UMA** nova Edge Function que recebe o provisionamento do Hub.

### 2.1. Edge Function: `hub-provision-user`

Cada ferramenta deve implementar esta Edge Function com as mesmas regras:

#### Endpoint

```
POST /functions/v1/hub-provision-user
Authorization: Bearer {FERRAMENTA_SERVICE_ROLE_KEY}
```

#### Payload Recebido (mesmo da seção 1.2)

```json
{
  "action": "provision",
  "subscriber_id": "uuid",
  "email": "user@email.com",
  "name": "João Silva",
  "user_type": "collaborator",
  "company_id": "uuid",
  "company_name": "Acme Corp",
  "company_slug": "acme-corp",
  "cnpj": "12345678000100",
  "access_level": "admin",
  "plan_code": "professional",
  "branding": { ... }
}
```

#### Resposta Esperada

```json
// Sucesso
{ "status": "ok", "user_id": "uuid", "created": true }

// Já existia
{ "status": "ok", "user_id": "uuid", "created": false }

// Erro
{ "status": "error", "message": "..." }
```

#### Lógica Interna (Padrão para TODAS as ferramentas)

```typescript
// 1. MIRROR EMPRESA (upsert com blind mirroring)
const empresaData = {
    id: payload.company_id,     // USA O MESMO UUID DO HUB
    nome: payload.company_name,
    slug: payload.company_slug,
    cnpj: formatCnpj(payload.cnpj),
    plano_codigo: planCodeMap[payload.plan_code] || 'PROFESSIONAL',
    cor_primaria: payload.branding?.primary_color,
    cor_secundaria: payload.branding?.secondary_color,
    logo_url: payload.branding?.logo_url,
    ativo: true,
};

// Blind mirroring (resolver conflitos de CNPJ/slug)
const { data: existing } = await supabaseAdmin
    .from('empresas')
    .select('id')
    .eq('id', payload.company_id)
    .maybeSingle();

if (existing) {
    await supabaseAdmin.from('empresas').update(empresaData).eq('id', payload.company_id);
} else {
    // Limpar conflitos legados
    if (empresaData.cnpj) {
        await supabaseAdmin.from('empresas').update({ cnpj: null }).eq('cnpj', empresaData.cnpj);
    }
    if (empresaData.slug) {
        await supabaseAdmin.from('empresas')
            .update({ slug: `${empresaData.slug}-legacy-${Date.now()}` })
            .eq('slug', empresaData.slug);
    }
    await supabaseAdmin.from('empresas').insert(empresaData);
}

// 2. MIRROR USER (shadow auth)
let userId = payload.subscriber_id;
const { data: existingAuth } = await supabaseAdmin.auth.admin.getUserById(userId);

if (!existingAuth?.user) {
    // Criar shadow auth user com random password
    const { data: newAuth, error } = await supabaseAdmin.auth.admin.createUser({
        id: userId,    // MANTER O MESMO UUID DO HUB
        email: payload.email,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { name: payload.name },
    });
    if (error) throw error;
}

// 3. LINK USER ↔ EMPRESA (tabela de vínculo varia por ferramenta)
// RH: tabela 'usuario_empresas' ou campo empresa_id em 'colaboradores'
// EAD: tabela 'alunos' ou 'professores'
// Agenda: tabela 'usuarios' com empresa_id
await upsertUserCompanyLink(supabaseAdmin, userId, payload);
```

#### Diferenças por Ferramenta

| Ferramenta | Tabela de vínculo | Campos específicos | planCodeMap |
|---|---|---|---|
| **RH** | `usuario_empresas` ou `colaboradores` | `cargo`, `departamento_id`, `limite_colaboradores` | `{ pro: 'PROFESSIONAL', enterprise: 'ENTERPRISE' }` |
| **Agenda** | `usuarios` (com `empresa_id`) | `tipo` ('profissional' \| 'admin') | `{ pro: 'PRO', enterprise: 'ENTERPRISE' }` |
| **EAD** | `alunos` ou `instructors` | `enrollment_status`, `max_courses` | `{ pro: 'PRO', enterprise: 'ENTERPRISE' }` |
| **CRM** | N/A (B2C - não recebe provisão automática) | — | — |
| **Leads** | N/A (B2C) | — | — |

### 2.2. Segurança

- A Edge Function `hub-provision-user` deve aceitar APENAS chamadas com o `service_role` key da própria ferramenta
- Validar que o `Authorization` header contém uma key válida
- Não expor esta função publicamente (flag `--no-verify-jwt` NÃO deve ser usado)

---

## 3. Fluxo B2C → Hub ("Enviar pra Hub")

### 3.1. Edge Function na Ferramenta: `push-to-hub`

Quando o gestor clica "Enviar pra Hub" em um usuário local:

```
POST /functions/v1/push-to-hub
Authorization: Bearer {USER_TOKEN}
```

```json
{
  "local_user_id": "uuid",
  "email": "aluno@email.com",
  "name": "Maria Souza",
  "user_type": "customer",  // ou 'student'
  "company_id": "uuid"      // empresa_id local (mesmo UUID do Hub)
}
```

### 3.2. Edge Function no Hub: `receive-tool-user`

```
POST /functions/v1/receive-tool-user
Authorization: Bearer {HUB_SERVICE_ROLE_KEY}
```

```json
{
  "email": "aluno@email.com",
  "name": "Maria Souza",
  "user_type": "customer",
  "company_id": "uuid",
  "source_product_slug": "ead"
}
```

**Lógica:**
1. Upsert em `subscribers` (por email)
2. Upsert em `company_members` (subscriber_id + company_id)
3. Upsert em `member_product_access` (product_id do EAD)
4. **NÃO envia email** (usuário já tem acesso pela ferramenta)

---

## 4. Login Inteligente (Fase 3 — Futuro)

### Rotas

| Rota | Comportamento |
|---|---|
| `/{slug}/login` | Hub resolve empresa. Se tem N ferramentas → mostra menu. Se tem 1 → redireciona direto |
| `/{tool}/{slug}/login` | Hub autentica e redireciona direto via SmartAccess |
| `/login` | Login padrão do Hub (assinantes/owners) |

### Regra

```
Se empresa.subscriptions.length === 1 && empresa.subscriptions[0].product.user_model === 'b2b':
    → Login direto na ferramenta (SmartAccess automático)
Se empresa.subscriptions.length > 1:
    → Hub Dashboard com menu de ferramentas
```

---

## 5. Checklist de Implantação

### Hub (fazer primeiro)
- [ ] Migration: `user_model` em `products`
- [ ] Migration: `user_type` em `company_members`  
- [ ] Migration: `provision_logs` table
- [ ] Edge Function: `provision-tool-user`
- [ ] Edge Function: `receive-tool-user` (para B2C → Hub)
- [ ] Secrets: URLs e service_role keys de cada ferramenta
- [ ] UI: Gestão de colaboradores (adicionar, remover, definir ferramentas)
- [ ] Atualizar `generate-cross-token` (incluir `user_type` no JWT)

### Cada Ferramenta (fazer pontualmente, uma por vez)
- [ ] Edge Function: `hub-provision-user` (receber provisionamento)
- [ ] Edge Function: `push-to-hub` (enviar para Hub — só B2C)
- [ ] Adaptar `sso-login` para preservar `user_type` do JWT
- [ ] Testar fluxo completo: Hub → Provision → Login → Acesso

### Ordem sugerida de implantação por ferramenta
1. **RH** (mais madura, B2B, mais colaboradores)
2. **Agenda** (B2B, schema simples)
3. **EAD** (híbrido, testar B2B + B2C)
4. **CRM/Leads** (só B2C → Hub, sem provisão automática)
