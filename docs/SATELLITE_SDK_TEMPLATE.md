# 🛰️ Template SDK — Integração Satélite ↔ Sincla Hub

Kit pronto para copiar nos projetos satélite (RH, EAD, etc.).

---

## 1. Rota de Callback SSO

Crie a rota `/auth/sincla/callback` no seu satélite:

```typescript
// pages/auth/SinclaCallback.tsx (React)
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const HUB_URL = import.meta.env.VITE_SINCLA_HUB_URL; // ex: https://xxx.supabase.co/functions/v1

export function SinclaCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = searchParams.get('token');
        const company = searchParams.get('company');

        if (!token) {
            setError('Token não encontrado');
            return;
        }

        handleSSO(token, company);
    }, []);

    async function handleSSO(token: string, companySlug: string | null) {
        try {
            // 1. Validar token com o Hub
            const response = await fetch(`${HUB_URL}/validate-cross-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            if (!response.ok) throw new Error('Token inválido');

            const { valid, payload } = await response.json();
            if (!valid) throw new Error('Token expirado');

            // 2. Criar/atualizar usuário local
            // Adapte para o banco do seu satélite
            await upsertLocalUser({
                hub_user_id: payload.user_id,
                email: payload.email,
                name: payload.name,
                company_id: payload.company_id,
                company_slug: payload.company_slug,
                role: payload.role,
                access_level: payload.access_level,
            });

            // 3. Salvar sessão
            sessionStorage.setItem('sincla_session', JSON.stringify(payload));
            sessionStorage.setItem('sincla_branding', JSON.stringify(payload.branding));

            // 4. Aplicar branding
            applyBranding(payload.branding);

            // 5. Redirecionar
            navigate('/dashboard');

        } catch (err: any) {
            setError(err.message);
        }
    }

    if (error) return <div>Erro: {error}. <a href="/login">Voltar ao login</a></div>;
    return <div>Autenticando...</div>;
}
```

---

## 2. Aplicar Branding

```typescript
// utils/branding.ts
interface Branding {
    logo_url: string | null;
    favicon_url: string | null;
    primary_color: string;
    secondary_color: string;
    description: string | null;
}

export function applyBranding(branding: Branding) {
    const root = document.documentElement;
    root.style.setProperty('--sincla-primary', branding.primary_color);
    root.style.setProperty('--sincla-secondary', branding.secondary_color);

    // Atualizar favicon dinâmico
    if (branding.favicon_url) {
        const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement
            || document.createElement('link');
        link.rel = 'icon';
        link.href = branding.favicon_url;
        document.head.appendChild(link);
    }
}

export function getSavedBranding(): Branding | null {
    const saved = sessionStorage.getItem('sincla_branding');
    return saved ? JSON.parse(saved) : null;
}
```

---

## 3. Sincronizar Contatos

```typescript
// services/contactSync.ts
const HUB_URL = import.meta.env.VITE_SINCLA_HUB_URL;

interface ContactInput {
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    cpf?: string;
    contact_type?: string; // 'Colaborador', 'Lead', 'Cliente', etc.
}

export async function syncContactsToHub(
    companyId: string,
    contacts: ContactInput[],
    source: string // ex: 'sincla-rh'
) {
    const session = sessionStorage.getItem('sincla_session');
    if (!session) throw new Error('Sessão Sincla não encontrada');

    const response = await fetch(`${HUB_URL}/sync-contacts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${JSON.parse(session).access_token}`,
        },
        body: JSON.stringify({
            company_id: companyId,
            contacts: contacts.map(c => ({ ...c, source })),
        }),
    });

    return response.json();
}

// Uso no RH:
// await syncContactsToHub(companyId, [
//   { name: 'João Silva', email: 'joao@email.com', contact_type: 'Colaborador' }
// ], 'sincla-rh');
```

---

## 4. Variáveis de Ambiente

Adicione ao `.env` do satélite:

```env
VITE_SINCLA_HUB_URL=https://SEU_PROJETO.supabase.co/functions/v1
```

---

## 5. Checklist de Integração

- [ ] Criar rota `/auth/sincla/callback`
- [ ] Adicionar campo `hub_user_id` na tabela de usuários local
- [ ] Implementar `upsertLocalUser()` adaptado ao seu schema
- [ ] Aplicar branding (cores + favicon) do payload
- [ ] Sincronizar contatos via `sync-contacts` endpoint
- [ ] (Opcional) Botão "Entrar com Sincla" na tela de login
- [ ] Configurar `VITE_SINCLA_HUB_URL` no `.env`
