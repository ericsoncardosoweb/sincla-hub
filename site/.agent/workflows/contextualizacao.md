---
description: Contextualização completa do Site Institucional Sincla para o agente IA
---

# /contextualizacao — Site Institucional Sincla

> Leia este arquivo **sempre ao iniciar uma tarefa** no projeto `site/`.
> Este é o site de marketing/institucional em `sincla.com.br`.

---

## 🏷️ Identidade do Projeto

| Campo | Valor |
|-------|-------|
| **Nome** | Sincla — Site Institucional |
| **Diretório** | `c:\www\sincla\site\` |
| **URL Produção** | `sincla.com.br` |
| **Supabase** | Não utiliza banco próprio (consome Hub via Edge Functions se necessário) |
| **Git** | Monorepo raiz (`c:\www\sincla\.git`) |

---

## 🛠️ Stack Tecnológica

```
Frontend:     React 19.2.0, TypeScript 5.9.3
UI Library:   Mantine 8.3.11 (⚠️ manter versão)
Build:        Vite 7.2.4
CSS:          CSS Modules (*.module.css por componente)
Icons:        Tabler Icons
Design:       Dark mode, glassmorphism, gradients animados
```

---

## 🗂️ Estrutura de Pastas

```
site/src/
├── App.tsx                     ← Router e providers
├── index.css                   ← Reset global
├── shared/                     ← Itens compartilhados (theme, lib)
└── site/
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx          ← Nav principal (muita lógica de scroll/mobile)
    │   │   ├── Header.module.css
    │   │   ├── Footer.tsx          ← Footer com links institucionais
    │   │   └── Footer.module.css
    │   ├── sections/               ← Blocos da landing page
    │   │   ├── Hero.tsx            ← Hero principal
    │   │   ├── Platforms.tsx       ← Vitrine de ferramentas
    │   │   ├── ProductShowcase.tsx ← Showcase detalhado dos produtos
    │   │   ├── Enterprise.tsx      ← Seção Enterprise/B2B
    │   │   ├── HowItWorks.tsx      ← Como funciona
    │   │   ├── TeamSolutions.tsx   ← Soluções por equipe
    │   │   ├── Stats.tsx           ← Números e estatísticas
    │   │   ├── Testimonials.tsx    ← Depoimentos
    │   │   ├── Partners.tsx        ← Parceiros
    │   │   ├── Support.tsx         ← Suporte/FAQ
    │   │   └── CtaBanner.tsx       ← Banner de conversão
    │   ├── common/                 ← Componentes atômicos
    │   ├── modals/                 ← Modals (contato, demo, etc.)
    │   ├── page-template/          ← Templates de página
    │   ├── signature-visual/       ← Assinatura visual da marca
    │   └── visual-system/          ← Sistema visual (tokens, animações)
    └── pages/
        ├── Landing.tsx             ← Composição da home
        ├── LegalPage.tsx           ← Páginas legais (política, termos)
        ├── company/                ← Sobre, time, valores
        ├── learn-more/             ← Páginas "saiba mais" por produto
        └── resources/              ← Blog, cases, recursos
```

---

## 🎨 Design System

### Paleta de Cores
```css
/* Dark mode premium */
--bg-base:        #0a0a0f;
--bg-elevated:    #12121a;
--bg-card:        #1a1a24;
--color-primary:  #0087ff;
--text-primary:   #ffffff;
--text-secondary: rgba(255,255,255,0.7);
--text-muted:     rgba(255,255,255,0.5);
```

### Princípios de Design
1. **Dark mode primeiro** — cores escuras como base
2. **Glassmorphism** — `backdrop-filter: blur()` em cards
3. **Gradientes animados** — uso estratégico em headings e CTAs
4. **Micro-animações** — hover suave, fade-in ao scroll
5. **Enterprise-ready** — percepção de solidez e confiança

### CSS Modules
- Cada componente tem seu `*.module.css`
- Evitar estilos inline ou classes globais
- Usar variáveis CSS do `:root` para tokens

### Convenções de Componente
- Named exports: `export function Hero() {}`
- Barrel exports: `index.ts` nas pastas
- Props tipadas com `interface`
- `useInView` para animações ao scroll

---

## 📄 Conteúdo das Seções

| Seção | Propósito | Arquivo |
|-------|-----------|---------|
| Hero | Proposta de valor principal | `Hero.tsx` |
| Platforms | Vitrine das ferramentas Sincla | `Platforms.tsx` |
| ProductShowcase | Demo visual dos produtos | `ProductShowcase.tsx` |
| Enterprise | Proposta B2B/enterprise | `Enterprise.tsx` |
| HowItWorks | Explicação do modelo | `HowItWorks.tsx` |
| TeamSolutions | Soluções por área/time | `TeamSolutions.tsx` |
| Stats | Números de impacto | `Stats.tsx` |
| Testimonials | Depoimentos de clientes | `Testimonials.tsx` |
| Partners | Ecossistema de parceiros | `Partners.tsx` |
| Support | FAQ e suporte | `Support.tsx` |
| CtaBanner | CTA de conversão | `CtaBanner.tsx` |

---

## 📱 Responsividade

- Mobile first na implementação de CSS
- Breakpoints Mantine: `xs`, `sm`, `md`, `lg`, `xl`
- Header com menu hamburguer em mobile
- **Sempre revisar mobile** antes de finalizar qualquer ajuste

---

## 🚀 Deploy

Verifica pipeline no monorepo raiz (`c:\www\sincla`).

---

## 🚫 Regras de Ouro do Site

1. Manter consistência visual com a paleta dark premium
2. Nunca quebrar a estrutura de seções da landing sem justificar
3. SEO: `meta description`, `og:image`, headings hierárquicos (`h1` → `h2` → `h3`)
4. Animações: `opacity + translateY` simples — nunca JavaScript pesado
5. **Nunca fazer deploy** sem aprovação explícita
