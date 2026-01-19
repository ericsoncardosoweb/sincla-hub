# Signature Visual: Sincla Flux

## 1. Conceito Obrigatório
O **Sincla Flux** é a representação visual do ecossistema vivo da Sincla. Diferente de fundos estáticos ou abstratos genéricos, ele simula uma **rede neural 3D** de conexões que nunca para.

### Significado
- **Nós (Nodes):** Representam os pontos de dados (Identidade, Empresas, Módulos).
- **Conexões (Links):** Representam o fluxo de informações em tempo real entre estes pontos.
- **Movimento:** A rotação lenta e constante simboliza a operação ininterrupta do sistema ("Running silenty in the background").

## 2. Regras Visuais (Brand Guidelines)

### A. Estética
- **Natureza:** 3D Simulado (Perspectiva com Profundidade).
- **Cor:** Variações de `sincla-blue` (#0087ff) com opacidade extremamente baixa.
- **Profundidade:** Uso de escala e opacidade baseada em Z-index para criar sensação de "imersão". Os elementos ao fundo devem ser quase invisíveis.

### B. Comportamento
- **Fluxo Contínuo:** A animação não tem início nem fim.
- **Lentidão Elegante:** A velocidade angular deve ser mínima. Se o usuário perceber rápido demais, está errado.
- **Responsividade:** O sistema se expande ou contrai, mas nunca desaparece. No mobile, a densidade de nós é reduzida, mas a identidade 3D permanece.

### C. Restrições (Proibições)
1.  **NUNCA bloquear leitura:** Texto sempre tem contraste máximo. O fundo é coadjuvante.
2.  **ZERO Interrupções:** Não deve reiniciar ao scrollar.
3.  **Performance First:** Uso estrito de `Canvas API` ou `WebGL` com otimização de frames (`requestAnimationFrame`). Evitar manipulação direta de DOM para milhares de partículas.

## 3. Especificações Técnicas

- **Tecnologia:** HTML5 Canvas + TypeScript.
- **Camada:** `z-index: 0` (Fundo global, acima do background-color, atrás do conteúdo).
- **Opacidade Global:** Máximo de 0.15 para elementos mais próximos.
- **Mobile:** Redução de 50% na contagem de partículas.
