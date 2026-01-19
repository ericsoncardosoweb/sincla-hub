# Guia de Animacoes Premium - Sincla Hub

> Padroes, principios e implementacao de motion design nivel enterprise

---

## 1. Filosofia de Motion

### O Principio Fundamental

> **"Cada animacao deve responder: isso aumenta percepcao de valor ou confianca?"**

Se a resposta for "nao" ou "talvez", **nao adicione a animacao**.

### Propositos Validos para Animacao

| Proposito | Exemplo | Valido |
|-----------|---------|--------|
| **Guiar atencao** | Fade-in sequencial em cards | Sim |
| **Confirmar acao** | Botao muda de estado ao clicar | Sim |
| **Criar contexto espacial** | Scroll-triggered reveals | Sim |
| **Suavizar transicoes** | Page transitions | Sim |
| **Decorar** | Particulas flutuantes sem funcao | Nao |
| **Impressionar** | Efeitos 3D complexos sem proposito | Nao |

### Anti-Padroes (Evitar)

1. **Animacoes de "IA generica"** - Ondas, particulas, glows pulsantes sem contexto
2. **Excesso de movimento** - Mais de 2 elementos animando simultaneamente
3. **Animacoes bloqueantes** - Usuario nao pode interagir ate animacao acabar
4. **Loops infinitos invasivos** - Atraem atencao indesejada
5. **Delays longos** - Mais de 300ms para primeira interacao

---

## 2. Timing e Easing

### Curvas de Easing

```css
/* Padrao para a maioria das animacoes */
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);

/* Para entradas (elementos surgindo) */
--ease-out: cubic-bezier(0, 0, 0.2, 1);

/* Para saidas (elementos desaparecendo) */
--ease-in: cubic-bezier(0.4, 0, 1, 1);

/* Para bounce (USAR COM CAUTELA - apenas micro-interacoes) */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Duracoes

| Tipo | Duracao | Uso |
|------|---------|-----|
| **Micro** | 100-150ms | Hover states, ripples |
| **Fast** | 200-250ms | Botoes, toggles |
| **Normal** | 300-400ms | Cards, modais |
| **Slow** | 500-600ms | Page transitions, hero |
| **Muito Lento** | 800ms+ | EVITAR (exceto casos especiais) |

### Regra de Ouro

> Quanto menor o elemento, mais rapida a animacao.
> Quanto maior a distancia percorrida, mais lenta pode ser.

---

## 3. Animacoes de Entrada (Reveal)

### Fade In Up (Padrao para Secoes)

Quando o elemento entra na viewport, aparece subindo suavemente.

```css
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

.reveal {
  opacity: 0;
}

.reveal.visible {
  animation: fadeInUp 0.5s var(--ease-out) forwards;
}
```

**Implementacao com Intersection Observer:**

```tsx
// hooks/useInView.ts
export function useInView<T extends HTMLElement>(
  options?: { threshold?: number; triggerOnce?: boolean }
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (options?.triggerOnce !== false) observer.disconnect();
        }
      },
      { threshold: options?.threshold ?? 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}
```

**Uso em Componente:**

```tsx
function Section({ children }) {
  const { ref, inView } = useInView();

  return (
    <section
      ref={ref}
      className={`${classes.section} ${inView ? classes.visible : ''}`}
    >
      {children}
    </section>
  );
}
```

### Stagger (Sequencia de Elementos)

Elementos aparecem em sequencia, criando ritmo visual.

```css
.stagger-container.visible .stagger-item {
  animation: fadeInUp 0.5s var(--ease-out) forwards;
}

.stagger-item:nth-child(1) { animation-delay: 0ms; }
.stagger-item:nth-child(2) { animation-delay: 100ms; }
.stagger-item:nth-child(3) { animation-delay: 200ms; }
.stagger-item:nth-child(4) { animation-delay: 300ms; }
.stagger-item:nth-child(5) { animation-delay: 400ms; }
.stagger-item:nth-child(6) { animation-delay: 500ms; }
```

**Regra:** Maximo de 6 items em stagger. Apos isso, agrupe.

### Scale In (Para Modais/Popovers)

```css
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

.modal.open {
  animation: scaleIn 0.2s var(--ease-out) forwards;
}
```

---

## 4. Micro-Interacoes

### Botao Hover

```css
.button {
  transition: transform 0.2s var(--ease-default),
              box-shadow 0.2s var(--ease-default);
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 135, 255, 0.3);
}

.button:active {
  transform: translateY(0);
}
```

### Card Hover

```css
.card {
  transition: transform 0.3s var(--ease-default),
              box-shadow 0.3s var(--ease-default),
              border-color 0.3s var(--ease-default);
}

.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.12);
}
```

### Link Underline

```css
.link {
  position: relative;
}

.link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--color-primary);
  transition: width 0.3s var(--ease-out);
}

.link:hover::after {
  width: 100%;
}
```

### Icon Rotation (Accordion)

```css
.accordion-icon {
  transition: transform 0.3s var(--ease-default);
}

.accordion.open .accordion-icon {
  transform: rotate(180deg);
}
```

---

## 5. Animacoes Decorativas (Com Cautela)

### Float (Logos Flutuantes)

**Quando usar:** Hero section, para criar sensacao de leveza

```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.floating-logo {
  animation: float 3s ease-in-out infinite;
}

/* Delays para criar ritmo */
.floating-logo:nth-child(1) { animation-delay: 0s; }
.floating-logo:nth-child(2) { animation-delay: 0.5s; }
.floating-logo:nth-child(3) { animation-delay: 1s; }
```

**Limites:**
- Maximo 5-6 elementos flutuantes
- Amplitude maxima de 10-15px
- Duracao de 3-4s (lento, sutil)

### Pulse (Indicador de Status)

**Quando usar:** Para indicar algo "ativo" ou "ao vivo"

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.live-indicator {
  animation: pulse 2s ease-in-out infinite;
}
```

### Shimmer (Loading)

**Quando usar:** Skeleton loading states

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-card) 0%,
    var(--bg-elevated) 50%,
    var(--bg-card) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## 6. Transicoes de Pagina

### Cross-fade Basico

```css
.page-enter {
  opacity: 0;
}

.page-enter-active {
  opacity: 1;
  transition: opacity 0.3s var(--ease-default);
}

.page-exit {
  opacity: 1;
}

.page-exit-active {
  opacity: 0;
  transition: opacity 0.3s var(--ease-default);
}
```

### Slide Horizontal

```css
.page-enter {
  opacity: 0;
  transform: translateX(20px);
}

.page-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: all 0.3s var(--ease-out);
}
```

---

## 7. Acessibilidade

### Respeitar prefers-reduced-motion

**OBRIGATORIO** em todo projeto:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Alternativas para Movimento Reduzido

Quando reduced motion esta ativo:
- Substituir slide por fade
- Remover float/pulse infinitos
- Manter apenas transicoes de estado (hover)

```tsx
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

const animation = prefersReducedMotion ? 'fade' : 'slideUp';
```

---

## 8. Performance

### Propriedades Animaveis Seguras

**GPU-accelerated (preferir):**
- `transform` (translate, scale, rotate)
- `opacity`

**Evitar animar:**
- `width`, `height` (causa layout recalc)
- `top`, `left`, `right`, `bottom` (preferir transform)
- `margin`, `padding` (causa reflow)
- `box-shadow` complexo (usar com moderacao)

### will-change (Usar com Parcimonia)

```css
/* Apenas para elementos que CERTAMENTE serao animados */
.will-animate {
  will-change: transform, opacity;
}

/* NUNCA use will-change: all; */
```

### Desabilitar Animacoes em Scroll Rapido

```tsx
let ticking = false;

window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      // Logica de animacao aqui
      ticking = false;
    });
    ticking = true;
  }
});
```

---

## 9. Biblioteca de Animacoes Prontas

### CSS Classes Utilitarias

```css
/* Entradas */
.anim-fade-in      { animation: fadeIn 0.3s var(--ease-out) forwards; }
.anim-fade-in-up   { animation: fadeInUp 0.5s var(--ease-out) forwards; }
.anim-fade-in-down { animation: fadeInDown 0.5s var(--ease-out) forwards; }
.anim-scale-in     { animation: scaleIn 0.3s var(--ease-out) forwards; }

/* Loops (usar com cautela) */
.anim-float        { animation: float 3s ease-in-out infinite; }
.anim-pulse        { animation: pulse 2s ease-in-out infinite; }

/* Delays */
.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }
.delay-400 { animation-delay: 400ms; }
.delay-500 { animation-delay: 500ms; }

/* Estado inicial (para JS-controlled) */
.anim-hidden {
  opacity: 0;
  transform: translateY(20px);
}
```

---

## 10. Checklist de Animacao

Antes de adicionar qualquer animacao:

- [ ] **Proposito claro?** (guiar, confirmar, contextualizar)
- [ ] **Duracao apropriada?** (<500ms para maioria)
- [ ] **Easing correto?** (ease-out para entradas)
- [ ] **Propriedades GPU-friendly?** (transform, opacity)
- [ ] **Respeita reduced-motion?**
- [ ] **Nao bloqueia interacao?**
- [ ] **Testa bem em mobile?** (pode causar jank)
- [ ] **Contribui para percepcao de valor?**

---

## 11. Exemplos por Secao

### Hero
- [x] Fade-in do titulo (0.5s, ease-out)
- [x] Fade-in-up do subtitulo (0.5s, delay 200ms)
- [x] Float nos logos (3s, infinite, sutil)
- [x] Hover nos botoes CTA
- [ ] ~~Particulas de fundo~~ (desnecessario)

### Produtos
- [x] Stagger nos cards (6 cards, 100ms delay cada)
- [x] Hover lift nos cards (-8px, shadow)
- [x] Borda de cor no hover (opacity transition)
- [ ] ~~Icones girando~~ (distrai)

### Enterprise
- [x] Fade-in sequencial nos beneficios
- [x] Hover nos cards de beneficio
- [x] Preco com scale-in sutil

### Suporte
- [x] Accordion com rotate no icone
- [x] Form fields com focus transition
- [ ] ~~Shake no erro~~ (agressivo, usar borda vermelha)

---

## 12. Ferramentas Recomendadas

### Para CSS Puro (Atual)
- Intersection Observer API nativo
- CSS @keyframes
- CSS transitions

### Para Complexidade Futura (Se Necessario)
- **Framer Motion** - Animacoes declarativas React
- **GSAP** - Timelines complexas, scroll-driven
- **Lenis** - Smooth scroll premium

**Regra:** Nao adicionar biblioteca ate precisar. CSS nativo cobre 90% dos casos.

---

## 13. Animacoes 3D - Diretrizes Enterprise

> Adicionado: Janeiro 2026
> Status: Aprovado para implementacao

### 13.1 Principio Fundamental

> **"Animacao 3D so existe se responder: isso aumenta confianca ou clareza?"**

O 3D no Sincla Hub tem um unico objetivo: **reforcar a percepcao de produto enterprise solido**, transmitindo arquitetura, integracao e profundidade — nunca impressionar ou decorar.

### 13.2 Onde o 3D e Permitido

| Local | Elemento | Justificativa | Comportamento |
|-------|----------|---------------|---------------|
| **Hero** | Composicao abstrata de camadas/modulos | Representa visualmente o ecossistema integrado | Movimento lento, continuo, quase imperceptivel |
| **Transicoes de secao** | Parallax leve, depth sutil | Cria sensacao de profundidade entre secoes | Responde ao scroll com easing refinado |
| **Micro-interacoes** | Hover com perspectiva sutil | Feedback tatico em cards e elementos chave | Transform 3D minimo (rotate < 5deg) |

### 13.3 Onde o 3D e Proibido

| Local | Motivo |
|-------|--------|
| Listas e grids de conteudo | Distrai da informacao |
| Textos e tipografia | Prejudica legibilidade |
| Formularios e inputs | Atrapalha usabilidade |
| Icones e logos | Inconsistencia visual |
| Background (particulas, ondas) | Efeito generico de "IA" |

### 13.4 Especificacao do Elemento 3D no Hero

**Conceito:** Composicao abstrata de camadas representando os modulos do ecossistema.

```
Visualizacao Conceitual:

    +---------------------------+
    |     [Camada 5 - Agenda]   |  <- Mais ao fundo, menor, mais translucido
    +---------------------------+
        +------------------------+
        |   [Camada 4 - Leads]   |
        +------------------------+
            +--------------------+
            |  [Camada 3 - Bolso]|
            +--------------------+
                +----------------+
                | [Camada 2 - EAD]|
                +----------------+
                    +------------+
                    |[Camada 1-RH]| <- Mais a frente, maior, mais solido
                    +------------+
                         |
                      [Usuario]
```

**Comportamento:**
- Rotacao continua no eixo Y: 0.05deg/frame (quase imperceptivel)
- Parallax leve no mouse move: max 5deg de inclinacao
- Camadas com opacidade decrescente (frente → fundo)
- Responde a reduced-motion: desativa movimento, mantem composicao estatica

**Parametros Tecnicos:**
```css
/* Movimento base */
--3d-rotation-speed: 60s; /* Ciclo completo em 60 segundos */
--3d-rotation-amount: 15deg; /* Angulo maximo de rotacao */
--3d-hover-tilt: 5deg; /* Inclinacao maxima no hover */
--3d-perspective: 1200px; /* Profundidade da cena */

/* Easing */
--3d-ease: cubic-bezier(0.4, 0, 0.2, 1);

/* Camadas */
--3d-layer-gap: 30px; /* Distancia entre camadas no eixo Z */
--3d-layer-opacity-step: 0.15; /* Reducao de opacidade por camada */
```

### 13.5 Stack Tecnica Aprovada

**Prioridade 1 (preferir):**
- CSS Transforms 3D (`transform-style: preserve-3d`, `perspective`)
- CSS Custom Properties para parametrizacao
- Intersection Observer para ativacao

**Prioridade 2 (se necessario):**
- Framer Motion com `motion.div` e `useMotionValue`
- Spring animations para naturalidade

**Prioridade 3 (apenas se justificar):**
- Three.js / React Three Fiber
- Requer: prova de que CSS nao atende + bundle impact < 50KB

### 13.6 Performance e Acessibilidade

**Obrigatorio:**
```css
/* Desativa 3D para usuarios que preferem movimento reduzido */
@media (prefers-reduced-motion: reduce) {
  .hero-3d {
    animation: none;
    transform: none;
  }

  .hero-3d-layer {
    transform: translateZ(0); /* Mantem composicao flat */
  }
}

/* Otimizacao GPU */
.hero-3d {
  will-change: transform;
  backface-visibility: hidden;
  transform: translateZ(0); /* Force GPU layer */
}
```

**Metricas de Performance:**
- FPS minimo: 60fps em dispositivos mid-range
- First Paint: nao deve atrasar
- Bundle size adicional: < 20KB (se usar biblioteca)

### 13.7 Checklist de Validacao 3D

Antes de implementar qualquer elemento 3D:

- [ ] **Aumenta confianca?** (percepcao enterprise)
- [ ] **Aumenta clareza?** (comunica arquitetura/integracao)
- [ ] **E sutil?** (movimento quase imperceptivel)
- [ ] **Respeita reduced-motion?** (fallback estatico)
- [ ] **Performance OK?** (60fps garantido)
- [ ] **Nao compete com conteudo?** (informacao > decoracao)
- [ ] **Funciona sem JS?** (graceful degradation)

### 13.8 Anti-Padroes 3D (Proibido)

| Anti-Padrao | Por que evitar |
|-------------|----------------|
| Particulas flutuantes | Generico, "efeito IA" vazio |
| Brilho/glow pulsante | Distrai, parece amador |
| Rotacao rapida | Causa desconforto, nausea |
| Reflexos e espelhos | Pesado, desnecessario |
| Sombras dinamicas complexas | Performance, complexidade |
| Objetos 3D realistas | Fora do tom enterprise |
| Animacao de "dados fluindo" | Cliche de tech marketing |

### 13.9 Inspiracoes Visuais Aprovadas

**Estudar (tom correto):**
- Linear.app — Profundidade sutil, movimento quase estatico
- Stripe.com — Camadas com parallax elegante
- Vercel.com — Gradientes com depth, sem exagero
- Apple.com — 3D presente mas nunca dominante

**Evitar (tom errado):**
- Sites de blockchain/crypto — Excesso de efeitos
- Landing pages de SaaS genericas — Particulas, ondas
- Templates de "agency" — Show-off tecnico

---

*Guia de Animacoes v1.1 - Janeiro 2026*
*Atualizado com diretrizes de animacoes 3D enterprise*
*Inspirado em: Apple, Linear, Stripe, Vercel*
