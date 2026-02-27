# 🛰️ Sincla Hub - Guia de Integração para Satélites

Este documento descreve como integrar seus produtos (RH, EAD, Leads, Agenda, Intranet) com o Sincla Hub para autenticação centralizada, verificação de assinaturas e sincronização de dados.

---

## 📋 Índice

1. [Arquitetura](#1-arquitetura)
2. [Endpoints da API](#2-endpoints-da-api)
3. [Fluxo de Autenticação SSO](#3-fluxo-de-autenticação-sso)
4. [Verificação de Assinatura](#4-verificação-de-assinatura)
5. [Obter Dados da Empresa](#5-obter-dados-da-empresa)
6. [Verificação de Permissões](#6-verificação-de-permissões)
7. [Webhooks](#7-webhooks)
8. [Cache e Performance](#8-cache-e-performance)
9. [SDK de Integração](#9-sdk-de-integração)
10. [Exemplos por Linguagem](#10-exemplos-por-linguagem)

---

## 1. Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        SINCLA HUB                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Auth API   │  │ Subscription │  │    Company API       │  │
│  │ (SSO Tokens) │  │     API      │  │ (Branding/Members)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                     │               │
│         ▼                 ▼                     ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Supabase Edge Functions                     │   │
│  │   (Validação, Cache Redis opcional, Rate Limiting)       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
   ┌──────────┐        ┌──────────┐         ┌──────────┐
   │ Sincla   │        │ Sincla   │         │ Sincla   │
   │   RH     │        │   EAD    │         │  Leads   │
   └──────────┘        └──────────┘         └──────────┘
```

---

## 2. Endpoints da API

### Base URL
```
Produção: https://PROJETO.supabase.co/functions/v1
Local:    http://localhost:54321/functions/v1
```

### Endpoints Disponíveis

| Método | Endpoint | Descrição | Cache |
|--------|----------|-----------|-------|
| `POST` | `/validate-cross-token` | Validar token SSO | Não |
| `GET/POST` | `/get-company-branding` | Obter branding da empresa | 5 min |
| `POST` | `/sync-contacts` | Sincronizar contatos | Não |
| `POST` | `/check-subscription` | Verificar assinatura ativa | 1 min |
| `POST` | `/check-permission` | Verificar permissão do usuário | 1 min |
| `POST` | `/billing-webhook` | Receber eventos de billing | Não |

---

## 3. Fluxo de Autenticação SSO

### 3.1 Diagrama do Fluxo

```
┌──────────┐     ┌───────────┐     ┌───────────┐
│  Usuário │     │ Sincla    │     │  Produto  │
│          │     │   Hub     │     │ (Satélite)│
└────┬─────┘     └─────┬─────┘     └─────┬─────┘
     │                 │                 │
     │ 1. Clica no     │                 │
     │    produto      │                 │
     │────────────────>│                 │
     │                 │                 │
     │                 │ 2. Gera token   │
     │                 │    JWT (5 min)  │
     │                 │                 │
     │ 3. Redirect com token            │
     │<─────────────────────────────────>│
     │                 │                 │
     │                 │  4. Valida token│
     │                 │<────────────────│
     │                 │                 │
     │                 │  5. Retorna     │
     │                 │     payload     │
     │                 │────────────────>│
     │                 │                 │
     │ 6. Sessão criada no produto      │
     │<──────────────────────────────────│
```

### 3.2 Implementação no Satélite

```typescript
// Receber token via query string
// URL: https://rh.sincla.com.br/sso?token=eyJhbGc...

async function handleSSO(token: string) {
  // 1. Validar token com o Hub
  const response = await fetch('https://hub.supabase.co/functions/v1/validate-cross-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });

  if (!response.ok) {
    throw new Error('Token inválido ou expirado');
  }

  const { valid, payload } = await response.json();

  if (!valid) {
    throw new Error('Token inválido');
  }

  // 2. payload contém:
  // {
  //   user_id: "uuid",
  //   email: "user@email.com",
  //   name: "Nome do Usuário",
  //   company_id: "uuid",
  //   company_name: "Empresa Ltda",
  //   role: "admin" | "manager" | "member",
  //   product_id: "sincla-rh",
  //   branding: { logo, primary_color, secondary_color },
  //   permissions: ["module_a", "module_b"],
  //   exp: 1234567890
  // }

  // 3. Criar sessão local
  await createLocalSession(payload);

  // 4. Redirecionar para dashboard
  redirect('/dashboard');
}
```

### 3.3 Estrutura do Token JWT

```typescript
interface CrossTokenPayload {
  // Identificação
  user_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;

  // Empresa
  company_id: string;
  company_name: string;
  company_slug: string;

  // Permissões
  role: 'owner' | 'admin' | 'manager' | 'member';
  permissions: string[];

  // Produto
  product_id: string;
  subscription_status: 'active' | 'trial' | 'past_due' | 'suspended';
  plan_id: string | null;

  // Branding
  branding: {
    logo: string | null;
    primary_color: string;
    secondary_color: string;
  };

  // Metadata
  iat: number;  // Issued at
  exp: number;  // Expires (5 minutos)
  iss: string;  // Issuer (sincla-hub)
}
```

---

## 4. Verificação de Assinatura

### Endpoint: `/check-subscription`

Verifica se uma empresa tem assinatura ativa para um produto específico.

```typescript
// Request
POST /functions/v1/check-subscription
Content-Type: application/json

{
  "company_id": "uuid-da-empresa",
  "product_id": "sincla-rh"
}

// Response (200 OK)
{
  "has_subscription": true,
  "subscription": {
    "id": "uuid",
    "status": "active",
    "plan": {
      "id": "uuid",
      "name": "Profissional",
      "slug": "professional"
    },
    "billing_cycle": "monthly",
    "current_period_end": "2025-03-15T00:00:00Z",
    "limits": {
      "users": 50,
      "storage_gb": 10
    },
    "features": [
      "pdi",
      "metas",
      "avaliacao_360",
      "feedbacks"
    ]
  }
}

// Response (200 OK - sem assinatura)
{
  "has_subscription": false,
  "trial_available": true,
  "trial_days": 14
}
```

### Implementação no Satélite

```typescript
class SubscriptionService {
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private CACHE_TTL = 60 * 1000; // 1 minuto

  async checkSubscription(companyId: string, productId: string) {
    const cacheKey = `${companyId}:${productId}`;
    
    // Verificar cache local
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    // Buscar do Hub
    const response = await fetch(`${HUB_URL}/check-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify({ company_id: companyId, product_id: productId })
    });

    const data = await response.json();

    // Atualizar cache
    this.cache.set(cacheKey, {
      data,
      expires: Date.now() + this.CACHE_TTL
    });

    return data;
  }

  // Middleware para verificar assinatura
  requireSubscription(requiredFeature?: string) {
    return async (req, res, next) => {
      const { company_id } = req.session;
      const subscription = await this.checkSubscription(company_id, PRODUCT_ID);

      if (!subscription.has_subscription) {
        return res.status(403).json({ 
          error: 'Assinatura necessária',
          upgrade_url: `https://hub.sincla.com.br/assinar/${PRODUCT_ID}`
        });
      }

      if (subscription.subscription.status !== 'active') {
        return res.status(403).json({ 
          error: 'Assinatura suspensa',
          reason: subscription.subscription.status
        });
      }

      if (requiredFeature && !subscription.subscription.features.includes(requiredFeature)) {
        return res.status(403).json({ 
          error: 'Feature não disponível no seu plano',
          required_feature: requiredFeature,
          current_plan: subscription.subscription.plan.name
        });
      }

      req.subscription = subscription.subscription;
      next();
    };
  }
}
```

---

## 5. Obter Dados da Empresa

### Endpoint: `/get-company-branding`

Retorna informações da empresa para aplicar branding e dados de contato.

```typescript
// Request (GET ou POST)
GET /functions/v1/get-company-branding?company_id=uuid
// ou
POST /functions/v1/get-company-branding
{ "company_id": "uuid" }

// Response (200 OK) - Com Cache-Control: 5 min
{
  "company_id": "uuid",
  "company_name": "Empresa Ltda",
  "branding": {
    "logo": "https://storage.supabase.co/.../logo.png",
    "logo_dark": null,
    "favicon": null,
    "primary_color": "#228be6",
    "secondary_color": "#1971c2",
    "accent_color": "#12b886"
  },
  "contact": {
    "email": "contato@empresa.com",
    "phone": "(11) 99999-9999",
    "website": "https://www.empresa.com"
  }
}
```

### Aplicando Branding Dinamicamente

```typescript
// React/TypeScript
function useBranding(companyId: string) {
  const [branding, setBranding] = useState<Branding | null>(null);

  useEffect(() => {
    async function load() {
      const cached = localStorage.getItem(`branding:${companyId}`);
      const cachedTime = localStorage.getItem(`branding:${companyId}:time`);
      
      // Usar cache se válido (5 min)
      if (cached && cachedTime && Date.now() - parseInt(cachedTime) < 300000) {
        setBranding(JSON.parse(cached));
        return;
      }

      const response = await fetch(
        `${HUB_URL}/get-company-branding?company_id=${companyId}`
      );
      const data = await response.json();
      
      // Salvar no cache
      localStorage.setItem(`branding:${companyId}`, JSON.stringify(data));
      localStorage.setItem(`branding:${companyId}:time`, Date.now().toString());
      
      setBranding(data);
    }
    load();
  }, [companyId]);

  // Aplicar CSS variables
  useEffect(() => {
    if (branding) {
      document.documentElement.style.setProperty('--primary-color', branding.branding.primary_color);
      document.documentElement.style.setProperty('--secondary-color', branding.branding.secondary_color);
    }
  }, [branding]);

  return branding;
}
```

---

## 6. Verificação de Permissões

### Endpoint: `/check-permission`

Verifica se um usuário tem permissão específica dentro de uma empresa.

```typescript
// Request
POST /functions/v1/check-permission
{
  "user_id": "uuid",
  "company_id": "uuid",
  "product_id": "sincla-rh",
  "permission": "pdi.edit"
}

// Response
{
  "allowed": true,
  "role": "admin",
  "granted_by": "role", // "role" | "direct" | "plan"
  "all_permissions": ["pdi.view", "pdi.edit", "metas.view", "metas.edit"]
}
```

### Hierarquia de Permissões

```
owner     → Acesso total
admin     → Todas as permissões exceto billing
manager   → Permissões do módulo atribuído
member    → Apenas visualização
```

### Middleware de Permissão

```typescript
// Express middleware
function requirePermission(permission: string) {
  return async (req, res, next) => {
    const { user_id, company_id } = req.session;

    const response = await fetch(`${HUB_URL}/check-permission`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify({
        user_id,
        company_id,
        product_id: PRODUCT_ID,
        permission
      })
    });

    const { allowed } = await response.json();

    if (!allowed) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    next();
  };
}

// Uso
app.post('/api/pdi', 
  requirePermission('pdi.edit'), 
  createPDIHandler
);
```

---

## 7. Webhooks

### Eventos Recebidos pelo Satélite

Configure o webhook URL do seu produto no Hub para receber notificações.

| Evento | Descrição | Ação Recomendada |
|--------|-----------|------------------|
| `subscription.created` | Nova assinatura | Provisionar recursos |
| `subscription.updated` | Plano alterado | Ajustar limites |
| `subscription.canceled` | Assinatura cancelada | Agendar exclusão |
| `billing_event` | Pagamento/falha | Atualizar status |
| `company.updated` | Dados alterados | Atualizar cache |
| `member.added` | Novo membro | Criar usuário local |
| `member.removed` | Membro removido | Desativar acesso |
| `contacts_sync` | Contatos sincronizados | Importar contatos |

### Implementação do Webhook Handler

```typescript
// POST /webhook/sincla-hub
app.post('/webhook/sincla-hub', async (req, res) => {
  // Verificar assinatura
  const signature = req.headers['x-hub-signature'];
  const expectedSig = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSig) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { type, company_id, ...data } = req.body;

  switch (type) {
    case 'subscription.created':
      await provisionCompany(company_id, data.subscription);
      break;

    case 'subscription.canceled':
      await scheduleDataDeletion(company_id);
      break;

    case 'member.added':
      await createLocalUser(company_id, data.user);
      break;

    case 'company.updated':
      await invalidateBrandingCache(company_id);
      break;

    case 'contacts_sync':
      await importContacts(company_id, data.contacts);
      break;
  }

  res.json({ received: true });
});
```

---

## 8. Cache e Performance

### Estratégia de Cache Recomendada

| Dado | TTL | Invalidação |
|------|-----|-------------|
| Branding | 5 min | Webhook `company.updated` |
| Assinatura | 1 min | Webhook `subscription.*` |
| Permissões | 1 min | Webhook `member.*` |
| Token SSO | 0 (não cachear) | - |

### Cache com Redis (Recomendado para Produção)

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

class HubCache {
  private prefix = 'sincla:hub:';

  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(this.prefix + key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    await redis.setex(this.prefix + key, ttlSeconds, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(this.prefix + pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  // Invalidar por empresa (usar em webhooks)
  async invalidateCompany(companyId: string): Promise<void> {
    await this.invalidate(`*:${companyId}:*`);
  }
}

// Uso
const cache = new HubCache();

async function getSubscription(companyId: string) {
  const cacheKey = `subscription:${companyId}:${PRODUCT_ID}`;
  
  // Tentar cache
  let data = await cache.get(cacheKey);
  if (data) return data;

  // Buscar do Hub
  const response = await fetch(`${HUB_URL}/check-subscription`, {
    method: 'POST',
    body: JSON.stringify({ company_id: companyId, product_id: PRODUCT_ID })
  });
  data = await response.json();

  // Cachear por 60 segundos
  await cache.set(cacheKey, data, 60);
  
  return data;
}

// Invalidar no webhook
app.post('/webhook/sincla-hub', async (req, res) => {
  const { type, company_id } = req.body;
  
  if (type.startsWith('subscription.') || type.startsWith('member.')) {
    await cache.invalidateCompany(company_id);
  }
  
  // ... resto do handler
});
```

### Headers de Cache nas Respostas

As Edge Functions do Hub já incluem headers de cache:

```http
Cache-Control: public, max-age=300  # 5 min para branding
Cache-Control: public, max-age=60   # 1 min para subscription
```

---

## 9. SDK de Integração

### Instalação

```bash
# npm
npm install @sincla/hub-sdk

# yarn
yarn add @sincla/hub-sdk

# pnpm
pnpm add @sincla/hub-sdk
```

### Configuração

```typescript
import { SinclaHub } from '@sincla/hub-sdk';

const hub = new SinclaHub({
  hubUrl: 'https://PROJETO.supabase.co/functions/v1',
  productId: 'sincla-rh',
  apiToken: process.env.HUB_API_TOKEN,
  webhookSecret: process.env.HUB_WEBHOOK_SECRET,
  cache: {
    enabled: true,
    redis: process.env.REDIS_URL, // opcional
  }
});

export { hub };
```

### Métodos Disponíveis

```typescript
// Autenticação
const session = await hub.auth.validateToken(token);
const url = await hub.auth.getLoginUrl({ redirect: '/dashboard' });

// Assinatura
const sub = await hub.subscription.check(companyId);
const hasFeature = await hub.subscription.hasFeature(companyId, 'pdi');
const isActive = await hub.subscription.isActive(companyId);

// Empresa
const branding = await hub.company.getBranding(companyId);
const members = await hub.company.getMembers(companyId);

// Permissões
const allowed = await hub.permission.check(userId, companyId, 'pdi.edit');
const permissions = await hub.permission.list(userId, companyId);

// Contatos
await hub.contacts.sync(companyId, contactsList);
const contacts = await hub.contacts.list(companyId);

// Webhooks
hub.webhook.on('subscription.created', async (data) => { ... });
hub.webhook.on('member.added', async (data) => { ... });

// Middlewares (Express)
app.use(hub.middleware.requireAuth());
app.use(hub.middleware.requireSubscription());
app.post('/pdi', hub.middleware.requirePermission('pdi.edit'), handler);
```

---

## 10. Exemplos por Linguagem

### Node.js/Express

```typescript
import express from 'express';
import { SinclaHub } from '@sincla/hub-sdk';

const app = express();
const hub = new SinclaHub({ /* config */ });

// SSO Callback
app.get('/sso', async (req, res) => {
  const { token } = req.query;
  
  try {
    const session = await hub.auth.validateToken(token as string);
    req.session.user = session;
    res.redirect('/dashboard');
  } catch (error) {
    res.redirect('/login?error=invalid_token');
  }
});

// Rota protegida
app.get('/api/pdi',
  hub.middleware.requireAuth(),
  hub.middleware.requireSubscription(),
  hub.middleware.requirePermission('pdi.view'),
  async (req, res) => {
    // Usuário autenticado, assinatura ativa, permissão verificada
    const { company_id } = req.session.user;
    const pdis = await PDIService.list(company_id);
    res.json(pdis);
  }
);

// Webhook
app.post('/webhook/hub', hub.webhook.handler());
```

### Python/FastAPI

```python
from sincla_hub import SinclaHub, require_auth, require_subscription
from fastapi import FastAPI, Depends, HTTPException

app = FastAPI()
hub = SinclaHub(
    hub_url="https://projeto.supabase.co/functions/v1",
    product_id="sincla-rh",
    api_token=os.environ["HUB_API_TOKEN"]
)

@app.get("/sso")
async def sso_callback(token: str):
    try:
        session = await hub.auth.validate_token(token)
        # Criar sessão local
        return {"redirect": "/dashboard"}
    except:
        raise HTTPException(401, "Token inválido")

@app.get("/api/pdi")
async def list_pdi(
    user = Depends(require_auth(hub)),
    subscription = Depends(require_subscription(hub))
):
    return await PDIService.list(user.company_id)

@app.post("/webhook/hub")
async def webhook_handler(request: Request):
    return await hub.webhook.handle(request)
```

### PHP/Laravel

```php
// config/sincla.php
return [
    'hub_url' => env('SINCLA_HUB_URL'),
    'product_id' => env('SINCLA_PRODUCT_ID'),
    'api_token' => env('SINCLA_API_TOKEN'),
];

// app/Http/Middleware/SinclaAuth.php
class SinclaAuth
{
    public function handle($request, $next)
    {
        $token = $request->query('token');
        
        if ($token) {
            $session = SinclaHub::validateToken($token);
            if ($session) {
                session(['sincla_user' => $session]);
                return redirect('/dashboard');
            }
        }
        
        if (!session('sincla_user')) {
            return redirect(SinclaHub::getLoginUrl());
        }
        
        return $next($request);
    }
}

// routes/web.php
Route::middleware(['sincla.auth', 'sincla.subscription'])->group(function () {
    Route::get('/pdi', [PDIController::class, 'index'])
        ->middleware('sincla.permission:pdi.view');
});
```

---

## 🔑 Variáveis de Ambiente

```env
# Obrigatórias
SINCLA_HUB_URL=https://PROJETO.supabase.co/functions/v1
SINCLA_PRODUCT_ID=sincla-rh
SINCLA_API_TOKEN=seu-token-aqui
SINCLA_WEBHOOK_SECRET=seu-webhook-secret

# Opcionais
SINCLA_CACHE_TTL=60
REDIS_URL=redis://localhost:6379
```

---

## 📞 Suporte

- **Documentação**: https://docs.sincla.com.br/hub
- **Suporte**: suporte@sincla.com.br
- **Status**: https://status.sincla.com.br
