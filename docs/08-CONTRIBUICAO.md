# Guia de Contribuicao - Sincla Hub

> Diretrizes para manter o projeto limpo, escalavel e consistente

---

## 1. Principios Fundamentais

### 1.1 Clareza > Esperteza

Codigo deve ser legivel por qualquer desenvolvedor do time. Evite:
- Abstrações prematuras
- One-liners "inteligentes"
- Nomes abreviados sem contexto

```tsx
// RUIM
const p = platforms.filter(x => !x.isCS).map(y => ({ ...y, s: 'a' }));

// BOM
const activePlatforms = platforms
  .filter(platform => !platform.isComingSoon)
  .map(platform => ({
    ...platform,
    status: 'active',
  }));
```

### 1.2 Consistencia > Preferencia Pessoal

Siga os padroes existentes, mesmo que discorde. Se quiser mudar um padrao:
1. Discuta com o time
2. Documente a decisao
3. Aplique em todo o projeto (nao parcialmente)

### 1.3 Menos e Mais

- Menos dependencias, menos abstracoes, menos codigo
- Cada linha deve justificar sua existencia
- Deletar codigo nao usado (nao comentar)

---

## 2. Antes de Codar

### 2.1 Checklist Pre-Desenvolvimento

- [ ] Li a documentacao relevante em `/docs`
- [ ] Entendi o problema a resolver
- [ ] Verifiquei se ja existe solucao similar no projeto
- [ ] Sei onde o codigo deve ficar (pasta correta)
- [ ] Planejei os tipos/interfaces necessarios

### 2.2 Perguntas a Fazer

1. **Isso ja existe?** - Busque no codebase antes de criar
2. **Onde isso deve morar?** - Consulte [03-ARQUITETURA.md](./03-ARQUITETURA.md)
3. **Precisa de teste?** - Funcionalidade critica = sim
4. **Afeta outros componentes?** - Planeje o impacto

---

## 3. Padroes de Codigo

### 3.1 Nomenclatura

| Tipo | Convencao | Exemplo |
|------|-----------|---------|
| Componentes | PascalCase | `ProductCard.tsx` |
| Hooks | camelCase com `use` | `useScrollDetection.ts` |
| Utilitarios | camelCase | `formatCurrency.ts` |
| Tipos | PascalCase | `Platform`, `HubUser` |
| Constantes | SCREAMING_SNAKE | `MAX_ITEMS`, `API_URL` |
| CSS Classes | camelCase | `.cardContainer` |
| CSS Variables | kebab-case | `--sincla-blue` |
| Arquivos de dados | camelCase | `platforms.ts` |
| Testes | ComponentName.test.tsx | `Header.test.tsx` |

### 3.2 Estrutura de Componente

```tsx
// 1. Imports (externos primeiro, depois internos)
import { useState } from 'react';
import { Button } from '@mantine/core';
import { useInView } from '../../hooks/useInView';
import classes from './MyComponent.module.css';

// 2. Types/Interfaces
interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

// 3. Componente (named export)
export function MyComponent({ title, onAction }: MyComponentProps) {
  // 3.1 Hooks
  const [state, setState] = useState(false);
  const { ref, inView } = useInView();

  // 3.2 Handlers
  const handleClick = () => {
    setState(true);
    onAction?.();
  };

  // 3.3 Render
  return (
    <div ref={ref} className={classes.container}>
      <h2>{title}</h2>
      <Button onClick={handleClick}>Action</Button>
    </div>
  );
}
```

### 3.3 Imports

Ordem de imports:
1. React
2. Bibliotecas externas
3. Componentes internos
4. Hooks
5. Utils/Services
6. Types
7. Styles

```tsx
// React
import { useState, useEffect } from 'react';

// Bibliotecas externas
import { Button, Card } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';

// Componentes internos
import { GradientText } from '../common/GradientText';

// Hooks
import { useInView } from '../../hooks/useInView';

// Utils/Services
import { formatCurrency } from '../../utils/format';

// Types
import type { Platform } from '../../types';

// Styles
import classes from './Component.module.css';
```

### 3.4 Props

```tsx
// Preferir interface para props
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

// Usar destructuring com defaults
export function Button({
  variant,
  size = 'md',
  children,
  onClick,
}: ButtonProps) {
  // ...
}
```

### 3.5 Tipos

```tsx
// Preferir type para unions
type ButtonVariant = 'primary' | 'secondary' | 'ghost';

// Preferir interface para objetos
interface User {
  id: string;
  name: string;
  email: string;
}

// Exportar tipos quando usados em multiplos arquivos
export type { User };
export interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

---

## 4. Padroes de CSS

### 4.1 Usar Design Tokens

```css
/* RUIM - Valor hardcoded */
.card {
  padding: 24px;
  background: #1a1a24;
  border-radius: 16px;
}

/* BOM - Usando tokens */
.card {
  padding: var(--space-lg);
  background: var(--bg-card);
  border-radius: var(--radius-xl);
}
```

### 4.2 Transicoes Consistentes

```css
/* RUIM - Timing arbitrario */
.button {
  transition: all 0.3s ease;
}

/* BOM - Usando variaveis */
.button {
  transition: transform var(--duration-fast) var(--ease-default),
              box-shadow var(--duration-fast) var(--ease-default);
}
```

### 4.3 Evitar !important

```css
/* RUIM */
.title {
  color: white !important;
}

/* BOM - Aumentar especificidade se necessario */
.section .title {
  color: white;
}
```

### 4.4 Mobile First

```css
/* Base (mobile) */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

/* Tablet */
@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## 5. Commits e Git

### 5.1 Formato de Commit

```
<tipo>: <descricao curta>

[corpo opcional]

[footer opcional]
```

**Tipos:**
- `feat`: Nova funcionalidade
- `fix`: Correcao de bug
- `refactor`: Refatoracao sem mudar comportamento
- `style`: Formatacao, CSS, sem mudar logica
- `docs`: Documentacao
- `test`: Testes
- `chore`: Configs, dependencias, scripts

**Exemplos:**
```
feat: adicionar animacao de entrada nos cards

Implementa fade-in-up com stagger de 100ms entre cards.
Usa Intersection Observer para trigger.

Closes #123
```

```
fix: corrigir formulario de contato nao enviando

O handler onClick estava faltando no botao de submit.
```

### 5.2 Branches

```
main            -> Producao
develop         -> Desenvolvimento
feat/nome       -> Feature nova
fix/descricao   -> Correcao de bug
refactor/area   -> Refatoracao
```

### 5.3 Pull Requests

**Titulo:** Mesmo formato de commit
**Descricao:**
```markdown
## O que muda
- Descricao clara das alteracoes

## Por que
- Contexto e motivacao

## Como testar
1. Passo a passo para testar

## Screenshots (se visual)
[imagem]

## Checklist
- [ ] Codigo segue padroes do projeto
- [ ] Testei em mobile
- [ ] Atualizei documentacao (se necessario)
```

---

## 6. Revisao de Codigo

### 6.1 O que Verificar

**Funcionalidade:**
- [ ] Resolve o problema proposto?
- [ ] Nao quebra funcionalidades existentes?
- [ ] Edge cases tratados?

**Codigo:**
- [ ] Segue padroes do projeto?
- [ ] Tipos corretos?
- [ ] Sem codigo duplicado?
- [ ] Sem dependencias desnecessarias?

**Performance:**
- [ ] Sem re-renders desnecessarios?
- [ ] Lazy loading onde apropriado?
- [ ] Nao bloqueia main thread?

**Acessibilidade:**
- [ ] Navegavel por teclado?
- [ ] Contraste adequado?
- [ ] Alt text em imagens?

### 6.2 Como Dar Feedback

```markdown
# BOM - Especifico e construtivo
"Esse useEffect pode causar memory leak se o componente desmontar
antes do fetch terminar. Sugestao: adicionar cleanup ou usar React Query."

# RUIM - Vago ou rude
"Isso esta errado."
"Que codigo feio."
```

---

## 7. Debugando

### 7.1 React DevTools

- Inspecionar componentes e props
- Verificar re-renders com Profiler
- Checar Context values

### 7.2 Console Estrategico

```tsx
// Para debug temporario (remover antes de commit)
console.log('[ComponentName]', { variable, state });

// NUNCA commitar console.log em producao
```

### 7.3 Error Boundary

Erros em producao sao capturados pelo ErrorBoundary.
Verificar logs no Sentry (quando configurado).

---

## 8. Checklists

### 8.1 Antes de Criar PR

- [ ] Codigo compila sem erros (`npm run build`)
- [ ] Lint passa (`npm run lint`)
- [ ] Testei localmente
- [ ] Testei em mobile (responsive)
- [ ] Nenhum `console.log` esquecido
- [ ] Nenhum codigo comentado
- [ ] Nomes fazem sentido
- [ ] Documentacao atualizada (se necessario)

### 8.2 Antes de Mergear

- [ ] PR aprovada por pelo menos 1 pessoa
- [ ] CI passou
- [ ] Conflitos resolvidos
- [ ] Branch esta atualizada com main

### 8.3 Apos Deploy

- [ ] Verificar no ambiente de producao
- [ ] Checar erros no Sentry
- [ ] Validar metricas no analytics

---

## 9. Recursos Uteis

### Documentacao do Projeto
- [03-ARQUITETURA.md](./03-ARQUITETURA.md) - Estrutura de pastas
- [04-DESIGN-SYSTEM.md](./04-DESIGN-SYSTEM.md) - Cores, tipografia
- [05-ANIMACOES.md](./05-ANIMACOES.md) - Padroes de motion

### Documentacao Externa
- [Mantine Docs](https://mantine.dev)
- [Tabler Icons](https://tabler.io/icons)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

### Ferramentas
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance
- [axe DevTools](https://www.deque.com/axe/devtools/) - Acessibilidade

---

## 10. Perguntas Frequentes

**P: Posso adicionar uma nova dependencia?**
R: Discuta com o time antes. Verifique se realmente e necessario e o impacto no bundle.

**P: Posso mudar um padrao existente?**
R: Sim, mas com discussao e aplicacao consistente em todo o projeto.

**P: O que fazer se encontrar um bug nao relacionado a minha tarefa?**
R: Criar uma issue separada. So corrigir junto se for muito simples.

**P: Como lidar com codigo legado/feio?**
R: Nao refatorar "de passagem". Criar tarefa especifica para refatoracao.

---

*Guia de Contribuicao v1.0 - Janeiro 2026*
