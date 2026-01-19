# Arquitetura de Projeto - Sincla Hub

> Estrutura de pastas, componentizacao, padroes e convencoes

---

## 1. Estrutura de Pastas (Atual)

```
sincla-hub/
|-- src/
|   |-- components/
|   |   |-- common/           # Utilitarios compartilhados
|   |   |   |-- Icons.tsx
|   |   |   |-- ScrollProgress.tsx
|   |   |-- layout/           # Estrutura de pagina
|   |   |   |-- Header.tsx
|   |   |   |-- Header.module.css
|   |   |   |-- Footer.tsx
|   |   |   |-- Footer.module.css
|   |   |-- sections/         # Blocos de conteudo
|   |       |-- Hero.tsx
|   |       |-- Platforms.tsx
|   |       |-- Enterprise.tsx
|   |       |-- Partners.tsx
|   |       |-- Support.tsx
|   |       |-- *.module.css
|   |-- pages/
|   |   |-- Landing.tsx       # Composicao da landing
|   |-- styles/
|   |   |-- global.css        # Tokens e estilos globais
|   |   |-- theme.ts          # Configuracao Mantine
|   |-- data/
|   |   |-- platforms.ts      # Dados estaticos
|   |-- types/
|   |   |-- index.ts          # Interfaces TypeScript
|   |-- lib/
|   |   |-- supabase.ts       # Cliente de banco
|   |-- assets/               # Assets importados via bundler
|   |-- App.tsx               # Router e providers
|   |-- main.tsx              # Entry point
|-- public/
|   |-- logos/                # Logos SVG
|   |-- favicon.svg
|-- docs/                     # Documentacao tecnica
|-- package.json
|-- tsconfig.json
|-- vite.config.ts
```

---

## 2. Estrutura de Pastas (Recomendada)

Evolucao para escala, mantendo compatibilidade:

```
sincla-hub/
|-- src/
|   |-- components/
|   |   |-- common/           # Componentes atomicos reutilizaveis
|   |   |   |-- Button/
|   |   |   |   |-- index.tsx
|   |   |   |   |-- Button.module.css
|   |   |   |-- Icons/
|   |   |   |-- ScrollProgress/
|   |   |   |-- GradientText/        # NOVO: Texto com gradiente
|   |   |   |-- AnimatedSection/     # NOVO: Wrapper de animacao
|   |   |-- layout/
|   |   |   |-- Header/
|   |   |   |-- Footer/
|   |   |   |-- PageWrapper/         # NOVO: Layout padrao de pagina
|   |   |-- sections/
|   |       |-- Hero/
|   |       |-- Platforms/
|   |       |-- Enterprise/
|   |       |-- Partners/
|   |       |-- Support/
|   |       |-- Testimonials/        # NOVO: Social proof
|   |-- pages/
|   |   |-- Landing/
|   |   |   |-- index.tsx
|   |   |-- Login/                   # FUTURO
|   |   |-- Dashboard/               # FUTURO
|   |-- hooks/                       # NOVO: Hooks customizados
|   |   |-- useScrollDetection.ts
|   |   |-- useInView.ts
|   |   |-- useMediaQuery.ts
|   |-- services/                    # NOVO: Camada de API
|   |   |-- api.ts                   # Abstrai fetch/axios
|   |   |-- auth.ts                  # Autenticacao
|   |   |-- contact.ts               # Formulario de contato
|   |-- styles/
|   |   |-- global.css
|   |   |-- theme.ts
|   |   |-- tokens.css               # NOVO: Variaveis CSS organizadas
|   |   |-- animations.css           # NOVO: Keyframes centralizados
|   |-- data/
|   |   |-- platforms.ts
|   |   |-- navigation.ts            # NOVO: Links de navegacao
|   |   |-- social.ts                # NOVO: Links de redes sociais
|   |-- types/
|   |   |-- index.ts
|   |   |-- api.ts                   # NOVO: Tipos de resposta API
|   |-- lib/
|   |   |-- supabase.ts
|   |   |-- analytics.ts             # NOVO: Tracking events
|   |-- utils/                       # NOVO: Funcoes utilitarias
|   |   |-- cn.ts                    # Classnames merger
|   |   |-- format.ts                # Formatadores
|   |-- config/                      # NOVO: Configuracoes
|   |   |-- env.ts                   # Variaveis de ambiente tipadas
|   |   |-- routes.ts                # Constantes de rotas
|   |-- App.tsx
|   |-- main.tsx
|-- public/
|-- docs/
|-- tests/                           # NOVO: Testes
|   |-- components/
|   |-- hooks/
|   |-- setup.ts
```

---

## 3. Padroes de Componentizacao

### 3.1 Estrutura de Componente

Cada componente deve seguir esta estrutura:

```
ComponentName/
|-- index.tsx           # Exporta o componente
|-- ComponentName.tsx   # Implementacao (opcional, para componentes complexos)
|-- ComponentName.module.css
|-- ComponentName.test.tsx    # Testes
|-- types.ts            # Tipos especificos (se necessario)
```

**Para componentes simples**, `index.tsx` contem tudo:

```tsx
// components/common/GradientText/index.tsx
import classes from './GradientText.module.css';

interface GradientTextProps {
  children: React.ReactNode;
  as?: 'span' | 'h1' | 'h2' | 'h3';
}

export function GradientText({ children, as: Tag = 'span' }: GradientTextProps) {
  return <Tag className={classes.gradient}>{children}</Tag>;
}
```

### 3.2 Convencoes de Nomenclatura

| Tipo | Convencao | Exemplo |
|------|-----------|---------|
| Componentes | PascalCase | `GradientText.tsx` |
| Hooks | camelCase com `use` | `useScrollDetection.ts` |
| Utilitarios | camelCase | `formatCurrency.ts` |
| Tipos | PascalCase | `Platform`, `HubUser` |
| CSS Modules | camelCase | `.gradientText` |
| CSS Variables | kebab-case | `--sincla-blue` |
| Arquivos de dados | camelCase | `platforms.ts` |

### 3.3 Exportacoes

**Preferir named exports:**
```tsx
// Correto
export function Hero() { ... }

// Evitar
export default function Hero() { ... }
```

**Usar barrel exports para pastas:**
```tsx
// components/common/index.ts
export { GradientText } from './GradientText';
export { AnimatedSection } from './AnimatedSection';
export { ScrollProgress } from './ScrollProgress';
```

### 3.4 Props e Tipagem

**Sempre tipar props explicitamente:**
```tsx
// Correto
interface HeroProps {
  title: string;
  subtitle?: string;
  onCtaClick: () => void;
}

export function Hero({ title, subtitle, onCtaClick }: HeroProps) {
  // ...
}
```

**Usar `interface` para props, `type` para unioes:**
```tsx
interface ButtonProps { ... }          // Para objetos
type ButtonVariant = 'primary' | 'secondary';  // Para unioes
```

---

## 4. Padroes de Dados

### 4.1 Dados Estaticos

Manter em `/data` quando:
- Nao muda frequentemente
- Nao depende de usuario
- Usado em multiplos lugares

```tsx
// data/platforms.ts
export const platforms: Platform[] = [
  { id: 'rh', name: 'Sincla RH', ... },
];

// data/navigation.ts
export const navLinks = [
  { label: 'Produtos', href: '#produtos' },
];
```

### 4.2 Configuracao de Ambiente

```tsx
// config/env.ts
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;
```

### 4.3 Constantes de Rota

```tsx
// config/routes.ts
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PRODUCT: (slug: string) => `/produtos/${slug}`,
} as const;
```

---

## 5. Padroes de Hooks

### 5.1 useScrollDetection

```tsx
// hooks/useScrollDetection.ts
import { useState, useEffect } from 'react';

export function useScrollDetection(threshold = 50) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return scrolled;
}
```

### 5.2 useInView (para animacoes)

```tsx
// hooks/useInView.ts
import { useState, useEffect, useRef, RefObject } from 'react';

interface UseInViewOptions {
  threshold?: number;
  triggerOnce?: boolean;
}

export function useInView<T extends HTMLElement>({
  threshold = 0.1,
  triggerOnce = true,
}: UseInViewOptions = {}): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) observer.disconnect();
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, triggerOnce]);

  return [ref, inView];
}
```

---

## 6. Padroes de Estilos

### 6.1 Hierarquia de CSS

```
1. global.css      -> Reset, tipografia base, variaveis
2. tokens.css      -> Apenas variaveis CSS (cores, espacamentos)
3. animations.css  -> Keyframes reutilizaveis
4. theme.ts        -> Configuracao Mantine
5. *.module.css    -> Estilos de componente
```

### 6.2 Tokens CSS

```css
/* styles/tokens.css */
:root {
  /* Cores */
  --color-primary: #0087ff;
  --color-primary-dark: #006fcc;
  --color-primary-light: #e6f3ff;
  --color-secondary: #ff8c00;

  /* Backgrounds */
  --bg-base: #0a0a0f;
  --bg-elevated: #12121a;
  --bg-card: #1a1a24;

  /* Texto */
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.5);

  /* Espacamentos */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.3);
  --shadow-glow: 0 0 30px rgba(0, 135, 255, 0.3);

  /* Timing */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
}
```

### 6.3 Animations CSS

```css
/* styles/animations.css */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Classes utilitarias */
.animate-fade-in { animation: fadeIn var(--duration-normal) var(--ease-default) forwards; }
.animate-fade-in-up { animation: fadeInUp var(--duration-normal) var(--ease-default) forwards; }
.animate-scale-in { animation: scaleIn var(--duration-fast) var(--ease-default) forwards; }
.animate-float { animation: float 3s ease-in-out infinite; }

/* Stagger delays */
.delay-1 { animation-delay: 100ms; }
.delay-2 { animation-delay: 200ms; }
.delay-3 { animation-delay: 300ms; }
.delay-4 { animation-delay: 400ms; }
.delay-5 { animation-delay: 500ms; }
```

---

## 7. Padroes de Servicos/API

### 7.1 Cliente Base

```tsx
// services/api.ts
import { env } from '../config/env';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${env.apiUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
};
```

### 7.2 Servico de Contato

```tsx
// services/contact.ts
import { supabase } from '../lib/supabase';

interface ContactForm {
  name: string;
  email: string;
  phone?: string;
  message: string;
  type: 'general' | 'enterprise' | 'support';
}

export async function submitContact(data: ContactForm) {
  const { error } = await supabase.from('contacts').insert([
    {
      ...data,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) throw error;
  return { success: true };
}
```

---

## 8. Checklist de Arquitetura

Antes de criar um novo componente:

- [ ] Ja existe algo similar que pode ser reutilizado?
- [ ] Esta na pasta correta? (common/layout/sections)
- [ ] Tem tipos definidos?
- [ ] Usa tokens CSS ao inves de valores hardcoded?
- [ ] Segue a convencao de nomenclatura?
- [ ] Exporta via barrel export?

Antes de criar um novo hook:

- [ ] E reutilizavel em mais de um lugar?
- [ ] Segue o padrao `use[Nome]`?
- [ ] Tem cleanup de effects?
- [ ] Esta tipado corretamente?

Antes de adicionar um novo arquivo de dados:

- [ ] E realmente estatico? (Senao, vai para API)
- [ ] Esta tipado?
- [ ] Tem constantes exportadas?

---

*Documento atualizado em Janeiro 2026*
