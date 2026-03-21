---
description: Componentes e Módulos - Regras de comportamento para desenvolvimento
---

# Regras de Comportamento — Componentes e Módulos

## 1. Formulários
- Usar componentes globais de formulários
- Usar RichText editor **invés de textarea**, a menos que especificado
- Sempre usar Mantine form com validação

## 2. UI/UX
- Manter padrão das páginas para facilitar usabilidade e navegação intuitiva
- Sempre revisar a experiência mobile antes de finalizar
- Usar Mantine components (Card, Group, Stack, etc.) de forma consistente

## 3. Estado e Segurança
- Sempre se preocupar com: carregamento, segurança, estado da aplicação
- Usar loading states, error handling, e empty states em todas as páginas
- Usar React Query para dados remotos
- Usar Zustand para estado local complexo

## 4. Conhecimento do Projeto
- Se não tiver compreensão real da tarefa e da estrutura do projeto:
  1. Consultar a documentação da pasta `/docs`
  2. Consultar as migrations para referências de campos
  3. Não criar coisas que já existem
  4. Não errar nas referências de campos
