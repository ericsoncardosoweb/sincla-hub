# Sincla Hub — SDK Serviços Centralizados

Documentação para integração das ferramentas satélites (RH, EAD, Agenda, CRM) com os serviços centralizados do Hub.

---

## Configuração

Cada ferramenta precisa de 2 secrets configurados no Supabase:

```
HUB_SUPABASE_URL = https://xxxxxxxx.supabase.co
HUB_SERVICE_ROLE_KEY = eyJhbGci...
```

**Helper Deno (recomendado em cada Edge Function):**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function getHubClient() {
    return createClient(
        Deno.env.get('HUB_SUPABASE_URL')!,
        Deno.env.get('HUB_SERVICE_ROLE_KEY')!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}
```

---

## 1. AI Gateway

**Endpoint:** `{HUB_SUPABASE_URL}/functions/v1/ai-gateway`

### Request

```typescript
const response = await fetch(`${HUB_URL}/functions/v1/ai-gateway`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${HUB_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        company_id: 'uuid-empresa',      // OBRIGATÓRIO
        tool_id: 'rh',                    // OBRIGATÓRIO: 'rh' | 'ead' | 'agenda' | 'hub'
        action: 'json',                   // 'chat' | 'json'
        level: 'mini',                    // 'nano' (simples) | 'mini' (complexo)
        system: 'Analise o texto e retorne JSON...',
        messages: [
            { role: 'user', content: 'Texto para análise...' }
        ],
        temperature: 0.7,                 // Opcional (0-1)
        maxTokens: 2000,                  // Opcional
    }),
})
const data = await response.json()
```

### Response

```json
{
    "success": true,
    "content": "Texto gerado ou JSON...",
    "model": "gpt-5.4-mini",
    "usage": {
        "prompt_tokens": 150,
        "completion_tokens": 200,
        "total_tokens": 350
    },
    "remaining_credits": 4999650
}
```

### Erros

| error_code | HTTP | Descrição |
|---|---|---|
| `NO_CREDITS` | 402 | Créditos esgotados |
| `MISSING_COMPANY` | 400 | company_id ausente |
| `RATE_LIMITED` | 429 | Muitas requisições |

---

## 2. Upload de Arquivos (Storage)

**Endpoint:** `{HUB_SUPABASE_URL}/functions/v1/upload-asset`

### Upload (POST, FormData)

```typescript
const formData = new FormData()
formData.append('file', fileBlob, 'photo.jpg')
formData.append('path', `rh/${companyId}/colaboradores/${uuid}.jpg`)
formData.append('company_id', companyId)
formData.append('tool_id', 'rh')
formData.append('type', 'storage')  // 'storage' ou 'stream' (vídeos)

const response = await fetch(`${HUB_URL}/functions/v1/upload-asset`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${HUB_SERVICE_ROLE_KEY}`,
    },
    body: formData,
})
const data = await response.json()
// data.url = "https://sincla-storage.b-cdn.net/rh/.../photo.jpg"
```

### Delete (DELETE, JSON)

```typescript
const response = await fetch(`${HUB_URL}/functions/v1/upload-asset`, {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${HUB_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        path: 'rh/companyId/colaboradores/uuid.jpg',
        company_id: companyId,
        tool_id: 'rh',
        file_size: 1024000,  // bytes do arquivo deletado
    }),
})
```

### Estrutura de pastas recomendada

```
sincla-storage/
├── rh/
│   └── {company_id}/
│       ├── colaboradores/
│       ├── documentos/
│       └── logos/
├── ead/
│   └── {company_id}/
│       ├── cursos/
│       ├── thumbnails/
│       └── videos/      ← usar type='stream'
├── agenda/
│   └── {company_id}/
│       └── attachments/
└── hub/
    └── {company_id}/
        └── branding/
```

### Erros

| error_code | HTTP | Descrição |
|---|---|---|
| `STORAGE_LIMIT` | 402 | Quota de storage esgotada |

---

## 3. Notificações

**Endpoint:** `{HUB_SUPABASE_URL}/functions/v1/send-notification`

### Email

```typescript
const response = await fetch(`${HUB_URL}/functions/v1/send-notification`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${HUB_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        channel: 'email',
        to: 'usuario@empresa.com',
        subject: 'Aviso de Férias',
        message: 'Suas férias foram aprovadas...',
        template: 'system',          // 'welcome'|'system'|'billing'|'alert'|'security'|'custom'
        source_tool: 'rh',
        company_id: 'uuid-empresa',
        data: {
            action_url: 'https://app.sincla.com.br/rh/...',
            action_label: 'Ver Detalhes',
        },
    }),
})
```

### WhatsApp

```typescript
body: {
    channel: 'whatsapp',
    to: '11999999999',           // Telefone (com ou sem DDI)
    message: 'Suas férias foram aprovadas para o período...',
    source_tool: 'rh',
    company_id: 'uuid-empresa',
}
```

### In-App (Realtime, sem custo)

```typescript
body: {
    channel: 'in_app',
    to: 'user-uuid',             // UUID do auth.users
    subject: 'Nova avaliação disponível',
    message: 'Você tem uma nova avaliação de desempenho.',
    category: 'avaliacao',
    icon: 'clipboard-check',
    color: '#228be6',
    action_url: '/avaliacoes/responder/123',
    source_tool: 'rh',
    company_id: 'uuid-empresa',
}
```

### Multi-canal

```typescript
body: {
    channel: 'all',  // Envia email + whatsapp + in_app simultaneamente
    ...
}
```

---

## Tabelas de Referência (Hub)

| Tabela | Propósito |
|---|---|
| `service_usage_log` | Log imutável de cada consumo |
| `company_credits` | Saldo atual por empresa/serviço |
| `credit_purchases` | Histórico de compras |
| `storage_quotas` | Quota e uso de storage/stream |
| `service_pricing` | Preços e descontos por volume |
