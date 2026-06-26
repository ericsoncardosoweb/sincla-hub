---
description: Contextualização completa do Site Institucional Sincla para o agente IA
---

# /contextualizacao — Site Institucional Sincla

> Leia este arquivo **sempre ao iniciar uma tarefa** no projeto `site/`.
> Site de marketing/conversão em `sincla.com.br`.

---

## Identidade do Projeto

| Campo | Valor |
|-------|-------|
| **Nome** | Sincla — Site Institucional |
| **Diretório** | `C:\www\sincla\site\` |
| **URL Produção** | `sincla.com.br` |
| **Supabase** | Sem banco próprio (signup/login redirecionam ao Hub) |
| **Git** | Monorepo raiz — push via remote `site` → sincla-site |

---

## Stack Tecnológica

```
Frontend:     React 19, TypeScript
UI:           Mantine 8 (light default) + design system próprio (CSS Modules)
Build:        Vite 7
Fonts:        Fraunces (headings) + DM Sans (body)
Conversão:    MeetingWizard drawer + StickyMobileBar
Data:         TanStack Query (preparado)
```

---

## Estrutura de Pastas

```
site/src/
├── App.tsx                          ← Router, MantineProvider, ConversionProvider
├── design-system/
│   ├── tokens.css                   ← CSS variables (light-first)
│   ├── typography.css
│   └── components/                  ← Button, Card, Section, DualCta, Badge…
├── blocks/                          ← Blocos composáveis de landing
│   ├── HeroBlock/
│   ├── EcosystemFlowBlock/
│   ├── HowItWorksBlock/
│   ├── ProductGridBlock/
│   ├── ProductHeroBlock/            ← páginas de produto
│   ├── ProductFeaturesBlock/
│   ├── ProductIntegrationBlock/
│   ├── MeetingCtaBlock/
│   ├── FaqBlock/
│   └── FinalCtaBlock/
├── layouts/
│   ├── MarketingLayout/             ← Header + main + Footer + StickyMobileBar
│   └── ProductLayout/               ← layout de /rh, /ead, /produtos/:slug
├── conversion/
│   ├── ConversionProvider.tsx       ← openMeetingWizard()
│   ├── MeetingDrawer.tsx / MeetingWizard.tsx
│   ├── StickyMobileBar.tsx
│   └── meetingService.ts            ← webhook VITE_MEETING_WEBHOOK_URL
├── content/
│   ├── site.ts                      ← URLs Hub, copy global, trust items
│   ├── products.ts                  ← catálogo de produtos
│   ├── faq.ts
│   └── meeting.ts
├── site/
│   ├── components/layout/           ← Header, Footer
│   ├── components/common/           ← ScrollToTop, WhatsappFloat…
│   ├── components/sections/         ← legado (algumas seções antigas)
│   └── pages/
│       ├── Landing.tsx              ← composição da home
│       ├── ProductLanding.tsx       ← LP por produto
│       ├── LegalPage.tsx
│       └── SuporteLgpd.tsx
└── shared/
    ├── hooks/usePageMeta.ts
    └── styles/global.css, theme.ts
```

---

## Rotas (`App.tsx`)

| Rota | Página |
|------|--------|
| `/` | Landing (blocos da home) |
| `/rh`, `/recrutamento`, `/ead` | ProductLanding |
| `/produtos/:slug` | ProductLanding dinâmico |
| `/suporte-lgpd` | SuporteLgpd |
| `/politica-privacidade`, `/termos-de-uso`, etc. | LegalPage |

---

## Design System

- **Light-first** — tokens em `design-system/tokens.css` (`--surface-base`, `--brand-blue`, etc.)
- CSS Modules por componente (`*.module.css`)
- Componentes reutilizáveis em `design-system/components/`
- Mantine como base (Button, Notifications) com tema em `shared/styles/theme.ts`

Docs de copy/visual: `docs/visual-system.md`, `docs/hero-section.md`, `docs/cta-flow.md`

---

## Conversão

- CTAs principais apontam para `SITE.signupUrl` / `SITE.loginUrl` (Hub)
- Agendamento: `useConversion().openMeetingWizard({ intent, source })`
- Env vars: `VITE_WHATSAPP_NUMBER`, `VITE_MEETING_WEBHOOK_URL`

---

## Composição da Home (`Landing.tsx`)

```
HeroBlock → EcosystemFlowBlock → HowItWorksBlock → ProductGridBlock
→ MeetingCtaBlock → FaqBlock → FinalCtaBlock
```

Páginas de produto: `ProductHeroBlock → ProductFeaturesBlock → ProductIntegrationBlock → MeetingCtaBlock → FaqBlock → FinalCtaBlock`

---

## Responsividade

- Mobile first no CSS
- Header com menu mobile
- `StickyMobileBar` fixo no rodapé em mobile
- **Sempre revisar mobile** antes de finalizar

---

## SEO

- `usePageMeta()` nas páginas de produto
- Headings hierárquicos (h1 → h2 → h3)
- Meta description e OG quando aplicável

---

## Deploy

Push do monorepo para remote `site` → Easypanel `site-sincla`. **Nunca deploy sem aprovação explícita.**

Ver `.gemini/workflows/processos-de-deploy.md` e rule Cursor `02-no-auto-deploy`.

---

## Regras de Ouro

1. Preferir blocos em `blocks/` e design system — evitar duplicar em `sections/` legado
2. Conteúdo editável em `content/*.ts`, não hardcoded nos blocos
3. Manter consistência visual com tokens CSS
4. Animações leves (opacity + translate) — sem JS pesado para motion
5. Nunca fazer deploy sem aprovação explícita
