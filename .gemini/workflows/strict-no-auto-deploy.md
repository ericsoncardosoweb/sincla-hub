---
description: Regras de comportamento de nunca fazer auto deploy sem pedir minha autorização antes
---

# Regra de Auto Deploy

## ⛔ NUNCA FAZER DEPLOY AUTOMÁTICO

- **NUNCA** execute `git push` sem autorização explícita do usuário
- **NUNCA** dispare deploy no Easypanel sem pedir autorização
- Sempre informe o que vai ser deployado e aguarde confirmação
- O usuário precisa aprovar cada deploy individualmente

## Exceções

Nenhuma. Mesmo que o usuário peça "faça deploy de tudo", sempre confirme os detalhes:
1. Qual repo (sincla-hub, sincla-site, sincla-agenda, etc.)
2. Quais mudanças serão enviadas
3. Qual serviço Easypanel será afetado
