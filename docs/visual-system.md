# Sistema Visual Unificado - Sincla Hub

> Documento tecnico do sistema de animacao 3D que permeia toda a experiencia
> Status: Especificacao aprovada para implementacao
> Versao: 1.0 - Janeiro 2026

---

## 1. Visao Geral

### 1.1 O Que E

O Sincla Hub possui um **sistema visual unificado** — uma camada de animacao 3D continua que permeia toda a experiencia do site, do Hero ao Footer. Nao sao efeitos isolados por secao, mas um **ambiente unico e coeso** que reage ao contexto.

### 1.2 O Que Comunica

| Mensagem | Como o Sistema Transmite |
|----------|--------------------------|
| **Ecossistema integrado** | Nos conectados, camadas sobrepostas |
| **Dados fluindo** | Movimento sutil entre pontos |
| **Estabilidade enterprise** | Movimento lento, previsivel, confiavel |
| **Escala e profundidade** | Perspectiva 3D, parallax profundo |
| **Sofisticacao tecnica** | Execucao refinada, sem exageros |

### 1.3 O Que NAO E

- Nao e um background decorativo por secao
- Nao e particulas aleatorias
- Nao e efeito "IA futurista" generico
- Nao e showroom de WebGL
- Nao e distracacao do conteudo

---

## 2. Arquitetura do Sistema

### 2.1 Composicao Visual

```
VIEWPORT (100vw x 100vh fixo)
|
+-- LAYER 0: Gradient Base
|   - Gradiente radial sutil
|   - Reage ao scroll (posicao do centro)
|
+-- LAYER 1: Grid de Profundidade
|   - Linhas sutis formando grid 3D
|   - Perspectiva que acompanha scroll
|   - Opacidade variavel por secao
|
+-- LAYER 2: Nos do Ecossistema
|   - 5 nos representando os modulos
|   - Posicao varia conforme secao
|   - Conexoes sutis entre nos
|
+-- LAYER 3: Linhas de Conexao
|   - Conectam nos ativos
|   - Pulso sutil de "dados fluindo"
|   - Intensidade varia por contexto
|
+-- CONTEUDO (z-index superior)
    - Texto, cards, CTAs
    - Safe-area respeitada
```

### 2.2 Comportamento por Secao

| Secao | Densidade | Foco | Movimento |
|-------|-----------|------|-----------|
| **Hero** | Media | Central, todos os nos visiveis | Rotacao lenta, parallax no mouse |
| **Como Funciona** | Alta | Nos se conectam sequencialmente | Pulso nas conexoes |
| **Produtos** | Media | Nos se afastam, destacam individualmente | Hover revela conexoes |
| **Enterprise** | Baixa | Nos em orbita, mais distantes | Movimento minimo, estabilidade |
| **Precos** | Minima | Grid de fundo apenas | Quase estatico |
| **Footer** | Minima | Fade out gradual | Desaceleracao |

### 2.3 Transicoes Entre Secoes

**Regra fundamental:** O sistema NUNCA reinicia. Transicoes sao interpolacoes suaves.

```
Secao A ----[interpolacao 300ms]----> Secao B
              |
              +-- Posicao dos nos: lerp()
              +-- Opacidade: easeInOut
              +-- Escala: spring()
              +-- Conexoes: fade
```

---

## 3. Especificacao Tecnica

### 3.1 Stack

**Implementacao escolhida:** CSS 3D + JavaScript vanilla

**Justificativa:**
- Three.js: Overkill para este caso, bundle +150KB
- React Three Fiber: Mesma questao de bundle
- CSS 3D: Nativo, performatico, suficiente para a complexidade proposta

**Dependencias:**
- Nenhuma biblioteca externa
- Intersection Observer API (nativo)
- CSS Custom Properties para parametrizacao
- requestAnimationFrame para animacoes suaves

### 3.2 Estrutura de Arquivos

```
src/
|-- components/
|   |-- visual-system/
|       |-- index.tsx              # Componente principal
|       |-- VisualSystem.module.css # Estilos do sistema
|       |-- useScrollProgress.ts   # Hook de progresso do scroll
|       |-- useMousePosition.ts    # Hook de posicao do mouse
|       |-- constants.ts           # Configuracoes e thresholds
```

### 3.3 Parametros do Sistema

```css
:root {
  /* Perspectiva e profundidade */
  --vs-perspective: 1500px;
  --vs-depth-layers: 5;
  --vs-layer-gap: 100px;

  /* Movimento */
  --vs-rotation-speed: 120s;      /* Ciclo completo */
  --vs-rotation-range: 8deg;      /* Amplitude maxima */
  --vs-parallax-intensity: 0.02;  /* Fator de parallax no mouse */

  /* Nos */
  --vs-node-count: 5;
  --vs-node-size: 80px;
  --vs-node-size-mobile: 50px;
  --vs-node-opacity: 0.6;

  /* Conexoes */
  --vs-connection-width: 1px;
  --vs-connection-opacity: 0.15;
  --vs-pulse-duration: 4s;

  /* Grid */
  --vs-grid-size: 80px;
  --vs-grid-opacity: 0.03;

  /* Timing */
  --vs-transition-duration: 0.8s;
  --vs-easing: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 3.4 Calculo de Estado por Scroll

```typescript
interface VisualState {
  scrollProgress: number;      // 0-1 (posicao no documento)
  activeSection: string;       // ID da secao atual
  nodeDensity: number;         // 0-1 (quao "juntos" os nos estao)
  connectionIntensity: number; // 0-1 (visibilidade das conexoes)
  rotationOffset: number;      // Graus adicionais de rotacao
  depthScale: number;          // Fator de escala da profundidade
}

// Mapeamento por secao
const sectionStates: Record<string, Partial<VisualState>> = {
  'hero': {
    nodeDensity: 0.7,
    connectionIntensity: 0.5,
    depthScale: 1,
  },
  'como-funciona': {
    nodeDensity: 0.9,
    connectionIntensity: 0.8,
    depthScale: 1.2,
  },
  'produtos': {
    nodeDensity: 0.4,
    connectionIntensity: 0.3,
    depthScale: 0.8,
  },
  'enterprise': {
    nodeDensity: 0.3,
    connectionIntensity: 0.2,
    depthScale: 0.6,
  },
  'footer': {
    nodeDensity: 0.1,
    connectionIntensity: 0.05,
    depthScale: 0.3,
  },
};
```

---

## 4. Performance

### 4.1 Metricas Obrigatorias

| Metrica | Target | Limite Aceitavel |
|---------|--------|------------------|
| FPS (desktop) | 60fps | >= 55fps |
| FPS (mobile) | 60fps | >= 45fps |
| First Paint impact | 0ms | < 50ms |
| Layout Shift | 0 | 0 |
| Bundle size | 0KB* | < 5KB |

*Sistema implementado em CSS + JS vanilla, sem bibliotecas

### 4.2 Otimizacoes Implementadas

```css
/* GPU Acceleration */
.visual-system,
.visual-system * {
  will-change: transform, opacity;
  backface-visibility: hidden;
  transform: translateZ(0);
}

/* Composite-only properties */
/* Animamos APENAS: transform, opacity */
/* NUNCA: width, height, top, left, margin, padding */

/* Throttling */
/* Scroll: requestAnimationFrame */
/* Mouse: throttle 16ms (60fps) */
/* Resize: debounce 100ms */
```

### 4.3 Estrategia Mobile

**Nao desativamos o sistema.** Adaptamos:

| Desktop | Mobile |
|---------|--------|
| 5 nos | 3 nos |
| Grid completo | Grid simplificado |
| Parallax mouse | Parallax gyroscope (opcional) |
| 5 camadas | 3 camadas |
| Conexoes animadas | Conexoes estaticas |

```css
@media (max-width: 768px) {
  :root {
    --vs-node-count: 3;
    --vs-depth-layers: 3;
    --vs-grid-opacity: 0.02;
    --vs-parallax-intensity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .visual-system {
    --vs-rotation-speed: 0s;
    --vs-pulse-duration: 0s;
  }

  .visual-system * {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## 5. Acessibilidade

### 5.1 Requisitos

- [ ] Respeita `prefers-reduced-motion`
- [ ] Nao interfere em leitores de tela (`aria-hidden="true"`)
- [ ] Nao captura foco
- [ ] Contraste do conteudo nao e afetado
- [ ] Funciona sem JavaScript (graceful degradation)

### 5.2 Implementacao

```tsx
<div
  className={classes.visualSystem}
  aria-hidden="true"
  role="presentation"
>
  {/* Sistema visual - invisivel para assistive tech */}
</div>
```

---

## 6. Regras de Uso

### 6.1 O Sistema Visual DEVE

1. Ocupar 100% da viewport (position: fixed)
2. Ficar atras de todo conteudo (z-index: -1)
3. Reagir ao scroll de forma continua
4. Manter identidade consistente entre secoes
5. Ser imperceptivel conscientemente, perceptivel inconscientemente

### 6.2 O Sistema Visual NAO DEVE

1. Competir com o conteudo por atencao
2. Causar distracoes ou desconforto
3. Reiniciar entre secoes
4. Ter movimentos bruscos
5. Depender de bibliotecas externas

### 6.3 Criterio de Qualidade

Antes de considerar completo, validar:

> "Um desenvolvedor senior de Big Tech veria isso e pensaria:
> 'Isso foi feito por alguem que sabe o que esta fazendo.'"

Se a resposta for "talvez" → refatorar.
Se a resposta for "nao" → descartar e recomecar.

---

## 7. Checklist de Implementacao

### Fase 1: Estrutura
- [ ] Componente VisualSystem criado
- [ ] Posicionamento fixed funcionando
- [ ] z-index correto (atras do conteudo)

### Fase 2: Layers Base
- [ ] Gradient de fundo implementado
- [ ] Grid de profundidade visivel
- [ ] Perspectiva 3D configurada

### Fase 3: Nos e Conexoes
- [ ] 5 nos renderizando
- [ ] Posicionamento 3D correto
- [ ] Conexoes entre nos visiveis
- [ ] Animacao de pulso sutil

### Fase 4: Interatividade
- [ ] Parallax no mouse funcionando
- [ ] Reacao ao scroll implementada
- [ ] Transicoes entre secoes suaves

### Fase 5: Responsividade
- [ ] Mobile com 3 nos
- [ ] Reduced motion respeitado
- [ ] Performance validada em device real

### Fase 6: Polish
- [ ] Easing refinado
- [ ] Timing ajustado
- [ ] Testes cross-browser
- [ ] Code review de performance

---

## 8. Referencias Visuais

### Inspiracoes (tom correto)
- **Linear.app** — Profundidade sutil, grid elegante
- **Stripe.com** — Gradientes vivos, movimento organico
- **Vercel.com** — Minimalismo com depth
- **Raycast.com** — Nos e conexoes, ecossistema

### Anti-referencias (evitar)
- Landing pages de crypto — Excesso, particulas
- Templates Framer — Efeitos sem proposito
- Sites "futuristas" — Glow, neon, ruido

---

## 9. Manutencao

### Alteracoes Permitidas
- Ajuste de parametros CSS (cores, opacidades, velocidades)
- Adicao de novas secoes com seus estados
- Otimizacoes de performance

### Alteracoes que Requerem Revisao
- Mudanca na arquitetura de layers
- Adicao de novos tipos de elementos visuais
- Mudanca de stack tecnica

### Alteracoes Proibidas
- Adicao de bibliotecas 3D sem justificativa tecnica
- Particulas, ondas, ou efeitos "IA generica"
- Qualquer coisa que cause distracacao consciente

---

*Documento criado em Janeiro 2026*
*Autor: Equipe de Engenharia Sincla*
*Proxima revisao: Apos implementacao completa*
