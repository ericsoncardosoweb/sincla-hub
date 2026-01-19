# Roadmap de Evolucao - Sincla Hub

> Plano estruturado de evolucao visual, tecnica e funcional

---

## Visao Geral

Este roadmap organiza a evolucao do Sincla Hub em **4 fases**, priorizadas por impacto e dependencias tecnicas. Cada fase tem entregas concretas e criterios de sucesso.

---

## Fase 1: Fundacao Funcional

**Objetivo:** Tornar o site funcional e conectado ao backend

### 1.1 Formularios Funcionais

**Problema:** Formulario de contato nao envia dados

**Solucao:**
```
1. Instalar React Hook Form + Zod
2. Criar schema de validacao
3. Implementar mutation com Supabase
4. Adicionar feedback visual (toast)
5. Criar tabela 'contacts' no Supabase
```

**Arquivos envolvidos:**
- `src/components/sections/Support.tsx`
- `src/services/contact.ts` (novo)
- `src/lib/supabase.ts`

**Criterio de sucesso:** Formulario envia e dados aparecem no Supabase

---

### 1.2 CTAs com Destino

**Problema:** Botoes "Comecar Gratis" e "Entrar" nao levam a lugar algum

**Solucao:**
```
Opcao A (Rapida):
- "Comecar Gratis" -> Link para primeira plataforma (rh.sincla.com.br)
- "Entrar" -> Link para login unificado (quando existir)

Opcao B (Completa):
- Criar pagina /signup com formulario
- Criar pagina /login com SSO
- Integrar com sistema de auth existente
```

**Decisao necessaria:** Qual fluxo de autenticacao usar?

---

### 1.3 Error Boundary

**Problema:** Erro em componente quebra toda a aplicacao

**Solucao:**
```tsx
// Criar ErrorBoundary.tsx
// Envolver App com ErrorBoundary
// Criar pagina de fallback amigavel
```

**Arquivos envolvidos:**
- `src/components/common/ErrorBoundary.tsx` (novo)
- `src/App.tsx`

---

### 1.4 Hooks Customizados

**Problema:** Logica de scroll/visibility duplicada e acoplada

**Solucao:**
```
Criar hooks reutilizaveis:
- useScrollDetection(threshold)
- useInView(options)
- useMediaQuery(query)
```

**Arquivos envolvidos:**
- `src/hooks/useScrollDetection.ts` (novo)
- `src/hooks/useInView.ts` (novo)
- `src/components/layout/Header.tsx` (refatorar)

---

## Fase 2: Refinamento Visual

**Objetivo:** Elevar a percepcao de qualidade visual

### 2.1 Animacoes de Entrada

**Problema:** Elementos aparecem estaticos, sem vida

**Solucao:**
```
1. Implementar useInView hook
2. Adicionar classe .reveal em secoes
3. Animar com fade-in-up ao entrar viewport
4. Stagger em grids de cards
```

**Secoes afetadas:**
- Hero (badge, titulo, subtitulo, CTAs)
- Platforms (cards com stagger)
- Enterprise (beneficios com stagger)
- Partners (niveis com stagger)
- Support (FAQ items)

**CSS necessario:**
```css
.reveal {
  opacity: 0;
  transform: translateY(20px);
}

.reveal.visible {
  animation: fadeInUp 0.5s ease-out forwards;
}
```

---

### 2.2 Centralizar Estilos Duplicados

**Problema:** Classes `.gradient` duplicadas em multiplos arquivos

**Solucao:**
```
1. Mover para global.css ou criar tokens.css
2. Remover duplicacoes dos .module.css
3. Usar classe global .gradient-text
```

**Arquivos afetados:**
- `src/styles/global.css`
- `src/components/sections/Hero.module.css`
- `src/components/sections/Platforms.module.css`
- `src/components/sections/Enterprise.module.css`

---

### 2.3 Micro-interacoes Refinadas

**Problema:** Hover states funcionais mas basicos

**Melhorias:**
```
- Botoes: Adicionar ripple effect sutil
- Cards: Glow na borda ao hover
- Links: Underline animado
- Icones: Rotate sutil em accordion
```

---

### 2.4 Loading States

**Problema:** Nao ha feedback durante carregamentos

**Solucao:**
```
1. Criar Skeleton components
2. Usar shimmer animation
3. Aplicar em areas que terao fetch de dados
```

---

## Fase 3: Conteudo e Conversao

**Objetivo:** Aumentar confianca e taxa de conversao

### 3.1 Social Proof

**Problema:** Falta evidencia de clientes/usuarios

**Solucao:**
```
Adicionar secao de:
- Logos de clientes (se permitido)
- Numeros mais detalhados
- Testimonials de usuarios
```

**Componente novo:** `src/components/sections/Testimonials.tsx`

**Conteudo necessario:**
- 3-5 testimonials reais
- Fotos/avatares (com permissao)
- Cargos e empresas

---

### 3.2 Paginas de Produto

**Problema:** Cards de produto levam para URLs externas sem contexto

**Solucao:**
```
Criar paginas /produtos/:slug com:
- Hero especifico do produto
- Lista de features detalhada
- Pricing
- FAQ do produto
- CTA para a plataforma
```

**Estrutura:**
```
src/pages/
  Product/
    index.tsx
    ProductHero.tsx
    ProductFeatures.tsx
    ProductPricing.tsx
```

---

### 3.3 Analytics e Tracking

**Problema:** Nao ha medicao de conversao

**Solucao:**
```
1. Instalar Posthog ou similar
2. Trackar eventos:
   - page_view
   - cta_click (qual botao)
   - form_submit
   - scroll_depth (25%, 50%, 75%, 100%)
3. Criar dashboard de metricas
```

---

### 3.4 SEO Avancado

**Problema:** SEO basico, pode melhorar

**Melhorias:**
```
- Schema markup (Organization, Product)
- Sitemap.xml
- robots.txt
- Open Graph images por pagina
- Meta descriptions por pagina
```

---

## Fase 4: Escala e Maturidade

**Objetivo:** Preparar para crescimento e time maior

### 4.1 Testes Automatizados

**Problema:** Zero cobertura de testes

**Solucao:**
```
1. Configurar Vitest + Testing Library
2. Testes de componentes criticos:
   - Header (navegacao)
   - Forms (validacao)
   - Cards (renderizacao condicional)
3. Testes de hooks
4. Configurar CI para rodar testes
```

**Meta:** 70% de cobertura em componentes criticos

---

### 4.2 Storybook

**Problema:** Dificil visualizar componentes isolados

**Solucao:**
```
1. Instalar Storybook
2. Criar stories para:
   - Botoes (variantes)
   - Cards (estados)
   - Inputs (validacao)
   - Badges
3. Documentar props e uso
```

---

### 4.3 CI/CD Pipeline

**Problema:** Deploy manual

**Solucao:**
```
GitHub Actions:
1. Lint + Type check
2. Testes
3. Build
4. Deploy para preview (PR)
5. Deploy para producao (main)
```

---

### 4.4 Monorepo (Se Necessario)

**Problema:** Codigo compartilhado com outras plataformas Sincla

**Solucao:**
```
Migrar para Turborepo:
packages/
  ui/           -> Componentes compartilhados
  config/       -> ESLint, TypeScript configs
  tsconfig/     -> TSConfig compartilhado
apps/
  hub/          -> Sincla Hub
  rh/           -> Sincla RH (se aplicavel)
```

---

## Matriz de Prioridade

| Item | Impacto | Esforco | Prioridade |
|------|---------|---------|------------|
| Formulario funcional | Alto | Baixo | P0 |
| CTAs com destino | Alto | Baixo | P0 |
| Error Boundary | Medio | Baixo | P0 |
| Hooks customizados | Medio | Baixo | P1 |
| Animacoes de entrada | Alto | Medio | P1 |
| Centralizar estilos | Medio | Baixo | P1 |
| Social proof | Alto | Medio | P2 |
| Analytics | Alto | Baixo | P2 |
| Paginas de produto | Alto | Alto | P2 |
| Testes | Medio | Alto | P3 |
| Storybook | Baixo | Medio | P3 |
| CI/CD | Medio | Medio | P3 |

---

## Metricas de Sucesso

### Fase 1
- [ ] Taxa de envio de formulario > 0 (funciona)
- [ ] Zero erros nao tratados em producao

### Fase 2
- [ ] Lighthouse Performance > 90
- [ ] CLS < 0.1
- [ ] Feedback positivo em testes de usuario

### Fase 3
- [ ] CTR em CTAs > 5%
- [ ] Bounce rate < 50%
- [ ] Leads qualificados > 20/mes

### Fase 4
- [ ] Cobertura de testes > 70%
- [ ] Deploy automatizado funcionando
- [ ] Documentacao de componentes completa

---

## Dependencias Externas

| Fase | Dependencia | Responsavel |
|------|-------------|-------------|
| 1.1 | Tabela no Supabase | Backend |
| 1.2 | Sistema de auth | Backend |
| 3.1 | Testimonials de clientes | Marketing |
| 3.2 | Conteudo de produtos | Produto |

---

## Proximos Passos Imediatos

1. **Revisar este roadmap** com stakeholders
2. **Priorizar** items da Fase 1
3. **Criar issues** no repositorio
4. **Iniciar** pelo formulario funcional

---

*Roadmap v1.0 - Janeiro 2026*
*Proxima revisao: Apos conclusao da Fase 1*
