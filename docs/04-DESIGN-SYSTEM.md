# Design System - Sincla Hub

> Cores, tipografia, espacamentos, grids e componentes visuais

---

## 1. Fundamentos

### Filosofia de Design

O design do Sincla Hub segue tres principios:

1. **Clareza** - Cada elemento comunica algo
2. **Confianca** - Estetica enterprise, nada experimental
3. **Consistencia** - Padroes repetidos criam familiaridade

### Referencias Visuais

| Referencia | O que extrair |
|------------|---------------|
| Atlassian | Hub de produtos, navegacao lateral |
| Stripe | Gradientes sutis, animacoes suaves |
| Linear | Minimalismo, dark mode elegante |
| Vercel | Tipografia forte, espacamento generoso |

---

## 2. Paleta de Cores

### Cores Primarias

```
SINCLA BLUE
Primary action, links, destaque

Base:       #0087ff
Dark:       #006fcc
Light:      #e6f3ff
Gradient:   linear-gradient(135deg, #0087ff 0%, #00c6ff 100%)

Shades (Mantine):
[0] #e6f3ff   [5] #0087ff (base)
[1] #cce7ff   [6] #006fcc
[2] #99cfff   [7] #005799
[3] #66b7ff   [8] #003f66
[4] #339fff   [9] #002733
```

```
SINCLA ORANGE
Secondary action, enterprise, destaque quente

Base:       #ff8c00
Dark:       #cc7000
Light:      #fff4e6
Gradient:   linear-gradient(135deg, #ff8c00 0%, #ff6600 100%)

Shades (Mantine):
[0] #fff4e6   [5] #ff8c00 (base)
[1] #ffe8cc   [6] #cc7000
[2] #ffd199   [7] #995400
[3] #ffba66   [8] #663800
[4] #ffa333   [9] #331c00
```

### Cores de Plataforma

Cada produto Sincla tem sua cor de marca:

| Plataforma | Cor | Hex | Uso |
|------------|-----|-----|-----|
| Sincla RH | Azul Corporativo | `#0066CC` | Cards, icones |
| Sincla EAD | Laranja Energia | `#FF6600` | Cards, icones |
| Sincla Bolso | Roxo Financas | `#8B5CF6` | Cards, icones |
| Sincla Leads | Vermelho Conversao | `#DC2626` | Cards, icones |
| Sincla Agenda | Violeta Produtividade | `#7C3AED` | Cards, icones |
| Sincla Intranet | Azul Claro Comunicacao | `#0EA5E9` | Cards, icones |

### Cores de Background (Dark Theme)

```
Base:        #0a0a0f   (fundo principal)
Elevated:    #12121a   (secoes alternadas)
Card:        #1a1a24   (cards, modais)
Surface:     rgba(255, 255, 255, 0.03)  (hover states)
Border:      rgba(255, 255, 255, 0.05)  (bordas sutis)
```

### Cores de Texto

```
Primary:     #ffffff                    (titulos, texto principal)
Secondary:   rgba(255, 255, 255, 0.7)   (subtitulos)
Muted:       rgba(255, 255, 255, 0.5)   (labels, hints)
Disabled:    rgba(255, 255, 255, 0.3)   (texto desabilitado)
```

### Semantica

```
Success:     #10B981   (verde)
Warning:     #F59E0B   (amarelo)
Error:       #EF4444   (vermelho)
Info:        #3B82F6   (azul)
```

---

## 3. Tipografia

### Fonte Principal

**Inter** - Sans-serif moderna, otimizada para telas

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Escala Tipografica

| Nome | Tamanho | Peso | Line Height | Uso |
|------|---------|------|-------------|-----|
| **Display** | clamp(3rem, 6vw, 4.5rem) | 800 | 1.1 | Hero principal |
| **H1** | clamp(2.5rem, 5vw, 4rem) | 700 | 1.2 | Titulos de secao |
| **H2** | clamp(2rem, 4vw, 3rem) | 700 | 1.2 | Subtitulos |
| **H3** | clamp(1.5rem, 3vw, 2rem) | 700 | 1.3 | Cards, destaque |
| **H4** | 1.25rem | 600 | 1.4 | Subcategorias |
| **Body Large** | 1.125rem (18px) | 400 | 1.6 | Texto de destaque |
| **Body** | 1rem (16px) | 400 | 1.6 | Texto padrao |
| **Body Small** | 0.875rem (14px) | 400 | 1.5 | Labels, captions |
| **Caption** | 0.75rem (12px) | 500 | 1.4 | Badges, hints |

### Pesos

```
Regular:    400   (corpo de texto)
Medium:     500   (enfase leve)
Semibold:   600   (botoes, labels)
Bold:       700   (titulos)
Extrabold:  800   (hero display)
```

### Letter Spacing

```
Titulos:    -0.02em (mais apertado)
Corpo:      0 (padrao)
Caps:       0.05em (mais aberto)
```

---

## 4. Espacamentos

### Escala Base (8px)

```
--space-xs:   4px    (0.5x)
--space-sm:   8px    (1x)
--space-md:   16px   (2x)
--space-lg:   24px   (3x)
--space-xl:   32px   (4x)
--space-2xl:  48px   (6x)
--space-3xl:  64px   (8x)
--space-4xl:  80px   (10x)
--space-5xl:  100px  (12.5x)
```

### Aplicacao

| Contexto | Espacamento |
|----------|-------------|
| Entre icone e texto | `--space-sm` (8px) |
| Padding interno de botao | `16px 24px` |
| Padding interno de card | `--space-lg` (24px) |
| Gap entre cards | `--space-lg` (24px) |
| Padding de secao vertical | `--space-5xl` (100px) |
| Container horizontal | `--space-lg` (24px) |
| Entre titulo e subtitulo | `--space-md` (16px) |
| Entre secoes | `--space-5xl` (100px) |

---

## 5. Grid e Layout

### Container

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Breakpoints */
@media (max-width: 768px) {
  .container { padding: 0 16px; }
}
```

### Breakpoints

```
xs:   576px   (mobile landscape)
sm:   768px   (tablet)
md:   992px   (desktop small)
lg:   1200px  (desktop)
xl:   1400px  (desktop large)
```

### Grid de Cards

```css
/* 3 colunas em desktop, 2 em tablet, 1 em mobile */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

/* Mantine equivalent */
<SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
```

---

## 6. Componentes Visuais

### Botoes

#### Primary (Gradient)
```css
.btn-primary {
  background: linear-gradient(90deg, #0087ff, #00c6ff);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 135, 255, 0.4);
}
```

#### Secondary (Outline)
```css
.btn-secondary {
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 12px 24px;
  border-radius: 8px;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}
```

#### Enterprise (Orange Gradient)
```css
.btn-enterprise {
  background: linear-gradient(90deg, #ff8c00, #ff6600);
  color: white;
}
```

### Cards

#### Card Padrao
```css
.card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}
```

#### Card com Borda de Cor
```css
.card-colored::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--platform-color);
  opacity: 0;
  transition: opacity 0.3s;
}

.card-colored:hover::before {
  opacity: 1;
}
```

### Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 135, 255, 0.1);
  border: 1px solid rgba(0, 135, 255, 0.2);
  border-radius: 100px;
  color: #0087ff;
  font-size: 14px;
  font-weight: 500;
}
```

### Glass Effect

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}
```

### Glow Effect

```css
.glow-blue {
  box-shadow: 0 0 30px rgba(0, 135, 255, 0.3);
}

.glow-orange {
  box-shadow: 0 0 30px rgba(255, 140, 0, 0.3);
}
```

### Gradient Text

```css
.gradient-text {
  background: linear-gradient(135deg, #0087ff 0%, #00c6ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## 7. Icones

### Biblioteca

**Tabler Icons** - 4200+ icones, stroke-based

```tsx
import { IconUsers, IconArrowRight } from '@tabler/icons-react';

// Uso
<IconUsers size={24} stroke={1.5} />
```

### Tamanhos Padrao

| Contexto | Tamanho | Stroke |
|----------|---------|--------|
| Inline com texto | 16px | 2 |
| Botao | 18px | 1.5 |
| Card icon | 24px | 1.5 |
| Feature highlight | 32px | 1.5 |
| Hero/Display | 48px | 1 |

### Icones por Plataforma

```tsx
const platformIcons = {
  rh: 'IconUsers',
  ead: 'IconBook',
  bolso: 'IconWallet',
  leads: 'IconChartBar',
  agenda: 'IconCalendar',
  intranet: 'IconBuilding',
};
```

---

## 8. Sombras

### Escala

```css
--shadow-xs:  0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm:  0 2px 8px rgba(0, 0, 0, 0.1);
--shadow-md:  0 8px 24px rgba(0, 0, 0, 0.2);
--shadow-lg:  0 16px 48px rgba(0, 0, 0, 0.3);
--shadow-xl:  0 24px 64px rgba(0, 0, 0, 0.4);
```

### Sombras de Cor (Glow)

```css
--shadow-glow-blue:    0 0 30px rgba(0, 135, 255, 0.3);
--shadow-glow-orange:  0 0 30px rgba(255, 140, 0, 0.3);
--shadow-glow-purple:  0 0 30px rgba(139, 92, 246, 0.3);
```

---

## 9. Border Radius

```css
--radius-sm:   4px    (inputs, badges pequenos)
--radius-md:   8px    (botoes, chips)
--radius-lg:   12px   (cards pequenos)
--radius-xl:   16px   (cards grandes)
--radius-2xl:  20px   (secoes, modais)
--radius-full: 9999px (pills, avatares)
```

---

## 10. Z-Index Scale

```css
--z-base:     0     (elementos padrao)
--z-dropdown: 100   (menus dropdown)
--z-sticky:   200   (header sticky)
--z-modal:    300   (modais)
--z-toast:    400   (notificacoes)
--z-tooltip:  500   (tooltips)
```

---

## 11. Checklist de Consistencia

Antes de estilizar um componente:

- [ ] Usa cores do sistema? (nao hardcoded)
- [ ] Usa espacamentos da escala? (multiplos de 8)
- [ ] Usa sombras da escala?
- [ ] Usa radius da escala?
- [ ] Tipografia segue hierarquia?
- [ ] Transicoes usam `--ease-default`?
- [ ] Funciona em dark mode?
- [ ] Contraste acessivel? (4.5:1 minimo)

---

*Design System v1.0 - Janeiro 2026*
*Baseado em Mantine UI 8.3*
