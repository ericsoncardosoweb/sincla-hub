# Seguranca e Performance - Sincla Hub

> Boas praticas, metricas e diretrizes para front-end enterprise-grade

---

## 1. Seguranca no Front-End

### 1.1 Principios Fundamentais

Mesmo sendo "apenas front-end", seguranca importa:

1. **Nunca confiar em input do usuario** - Validar tudo
2. **Nunca expor dados sensiveis** - Tokens, chaves, PII
3. **Assumir que o cliente e hostil** - Validacao tambem no backend
4. **Minimo privilegio** - So pedir o necessario

### 1.2 Protecao Contra XSS

#### Nunca usar `dangerouslySetInnerHTML`

```tsx
// ERRADO - Vulneravel a XSS
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// CORRETO - React escapa automaticamente
<div>{userContent}</div>
```

#### Sanitizar se necessario

```tsx
// Se precisar renderizar HTML (markdown, rich text)
import DOMPurify from 'dompurify';

const cleanHTML = DOMPurify.sanitize(userContent);
<div dangerouslySetInnerHTML={{ __html: cleanHTML }} />
```

#### URLs e Links

```tsx
// ERRADO - javascript: pode executar codigo
<a href={userProvidedUrl}>Link</a>

// CORRETO - Validar protocolo
const isSafeUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

<a href={isSafeUrl(url) ? url : '#'}>Link</a>
```

### 1.3 Protecao de Dados Sensiveis

#### Variaveis de Ambiente

```tsx
// .env
VITE_SUPABASE_URL=https://...       // OK - Prefixo VITE_ expoe ao client
VITE_SUPABASE_ANON_KEY=eyJh...      // OK - Chave publica
DATABASE_PASSWORD=secret123          // NUNCA - Sem VITE_, nao expoe

// Uso
const url = import.meta.env.VITE_SUPABASE_URL;  // OK
```

**Regra:** Chaves `VITE_*` sao publicas. Nunca colocar secrets.

#### Nao armazenar tokens em localStorage

```tsx
// ERRADO - Vulneravel a XSS
localStorage.setItem('token', jwt);

// MELHOR - HttpOnly cookie (configurar no backend)
// Cookie nao acessivel via JavaScript
```

#### Limpar dados em logout

```tsx
function logout() {
  // Limpar storage
  localStorage.clear();
  sessionStorage.clear();

  // Limpar state
  queryClient.clear();

  // Redirecionar
  window.location.href = '/login';
}
```

### 1.4 Validacao de Formularios

#### Dupla Validacao (Client + Server)

```tsx
// schema.ts - Usar Zod para validacao
import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100),
  email: z.string().email('Email invalido'),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Telefone invalido').optional(),
  message: z.string().min(10, 'Mensagem muito curta').max(1000),
});

type ContactForm = z.infer<typeof contactSchema>;
```

```tsx
// Validar antes de enviar
async function handleSubmit(data: ContactForm) {
  const result = contactSchema.safeParse(data);

  if (!result.success) {
    // Mostrar erros
    return;
  }

  // Enviar para API (que TAMBEM valida)
  await api.post('/contact', result.data);
}
```

#### Protecao contra CSRF

Se usar cookies para auth, implementar token CSRF:

```tsx
// Backend envia token em meta tag
<meta name="csrf-token" content="abc123" />

// Frontend inclui em requests
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

fetch('/api/action', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
  },
});
```

### 1.5 Headers de Seguranca

Configurar no servidor/CDN:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 1.6 Dependencias Seguras

```bash
# Verificar vulnerabilidades
npm audit

# Corrigir automaticamente
npm audit fix

# Manter dependencias atualizadas
npm outdated
npm update
```

**Rotina:** Rodar `npm audit` semanalmente.

---

## 2. Performance

### 2.1 Core Web Vitals (Metas)

| Metrica | Meta | O que mede |
|---------|------|------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Tempo ate maior elemento visivel |
| **INP** (Interaction to Next Paint) | < 200ms | Responsividade a interacoes |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Estabilidade visual |

### 2.2 Otimizacao de Bundle

#### Code Splitting por Rota

```tsx
// App.tsx - Lazy loading de paginas
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
}
```

#### Tree Shaking

```tsx
// ERRADO - Importa toda a biblioteca
import * as Icons from '@tabler/icons-react';
<Icons.IconUser />

// CORRETO - Importa apenas o necessario
import { IconUser } from '@tabler/icons-react';
<IconUser />
```

#### Analisar Bundle

```bash
# Adicionar ao package.json
"scripts": {
  "analyze": "vite build && npx vite-bundle-visualizer"
}

# Rodar
npm run analyze
```

### 2.3 Otimizacao de Imagens

#### Formatos Modernos

```tsx
// Usar WebP/AVIF com fallback
<picture>
  <source srcSet="/image.avif" type="image/avif" />
  <source srcSet="/image.webp" type="image/webp" />
  <img src="/image.png" alt="..." loading="lazy" />
</picture>
```

#### Lazy Loading

```tsx
// Imagens abaixo do fold
<img src="/logo.svg" alt="Logo" loading="lazy" />

// Imagens criticas (hero)
<img src="/hero.webp" alt="Hero" loading="eager" fetchPriority="high" />
```

#### Dimensoes Explicitas (Evita CLS)

```tsx
// ERRADO - Causa layout shift
<img src="/logo.svg" alt="Logo" />

// CORRETO - Reserva espaco
<img src="/logo.svg" alt="Logo" width={200} height={50} />
```

### 2.4 Otimizacao de Fontes

#### Preload de Fonte Critica

```html
<!-- index.html -->
<link
  rel="preload"
  href="/fonts/Inter-Regular.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

#### font-display: swap

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-display: swap; /* Mostra texto com fallback enquanto carrega */
}
```

### 2.5 Otimizacao de CSS

#### Critical CSS (Inline)

Para CSS acima do fold, considerar inline:

```html
<head>
  <style>
    /* CSS critico para primeiro render */
    body { background: #0a0a0f; color: #fff; }
    .header { position: fixed; top: 0; }
  </style>
  <link rel="stylesheet" href="/styles.css" media="print" onload="this.media='all'" />
</head>
```

#### Remover CSS Nao Usado

```bash
# Com PurgeCSS (se necessario)
npm install -D @fullhuman/postcss-purgecss
```

### 2.6 Otimizacao de JavaScript

#### Defer Scripts Nao Criticos

```html
<!-- Analytics, chat widgets -->
<script src="/analytics.js" defer></script>
```

#### Evitar Blocking no Main Thread

```tsx
// ERRADO - Bloqueia render
const result = heavyComputation(data);

// CORRETO - Web Worker para tarefas pesadas
const worker = new Worker('/heavy-worker.js');
worker.postMessage(data);
worker.onmessage = (e) => setResult(e.data);
```

### 2.7 Caching

#### Service Worker (PWA)

```tsx
// vite.config.ts - Com plugin PWA
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
});
```

#### Cache Headers (CDN/Server)

```
# Assets estaticos (imutaveis com hash)
Cache-Control: public, max-age=31536000, immutable

# HTML (sempre verificar)
Cache-Control: no-cache

# API responses
Cache-Control: private, max-age=60
```

### 2.8 React Query para Data Fetching

```tsx
// Caching automatico, deduplicacao, background refresh
import { useQuery } from '@tanstack/react-query';

function Platforms() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => api.get('/platforms'),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
```

---

## 3. Metricas e Monitoramento

### 3.1 Ferramentas Recomendadas

| Ferramenta | Proposito |
|------------|-----------|
| **Lighthouse** | Auditoria local |
| **PageSpeed Insights** | Metricas reais de campo |
| **Web Vitals** | Medicao em producao |
| **Sentry** | Error tracking |
| **Posthog/Mixpanel** | Analytics de produto |

### 3.2 Implementar Web Vitals

```tsx
// main.tsx
import { onCLS, onINP, onLCP } from 'web-vitals';

function sendToAnalytics(metric) {
  // Enviar para seu sistema de analytics
  console.log(metric);
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
```

### 3.3 Error Boundary

```tsx
// components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enviar para Sentry ou similar
    console.error('Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Algo deu errado.</div>;
    }
    return this.props.children;
  }
}
```

**Uso:**
```tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

---

## 4. Checklist de Lancamento

### Seguranca

- [ ] Sem chaves/secrets no codigo
- [ ] Variaveis de ambiente configuradas
- [ ] Validacao de formularios (client + server)
- [ ] Headers de seguranca configurados
- [ ] `npm audit` sem vulnerabilidades criticas
- [ ] HTTPS forcado

### Performance

- [ ] Lighthouse score > 90 (Performance)
- [ ] LCP < 2.5s
- [ ] INP < 200ms
- [ ] CLS < 0.1
- [ ] Bundle size < 500KB (gzipped)
- [ ] Imagens otimizadas (WebP/AVIF)
- [ ] Lazy loading implementado
- [ ] Code splitting por rota

### Monitoramento

- [ ] Error tracking configurado (Sentry)
- [ ] Web Vitals sendo coletados
- [ ] Analytics configurado
- [ ] Logs de erros acessiveis

---

## 5. Rotina de Manutencao

### Semanal
- [ ] Verificar `npm audit`
- [ ] Revisar erros no Sentry
- [ ] Checar metricas de Web Vitals

### Mensal
- [ ] Atualizar dependencias (`npm outdated`)
- [ ] Rodar Lighthouse completo
- [ ] Revisar bundle size

### Trimestral
- [ ] Audit de seguranca completo
- [ ] Revisar headers de seguranca
- [ ] Performance profiling detalhado

---

*Documento de Seguranca e Performance v1.0 - Janeiro 2026*
