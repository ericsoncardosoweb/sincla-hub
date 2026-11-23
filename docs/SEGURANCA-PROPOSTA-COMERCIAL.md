# Camadas de Segurança — Sincla

> Documento único para anexar em propostas comerciais.  
> Explica, em linguagem simples, como o ecossistema Sincla protege dados, registra ações e garante continuidade.

---

## Visão geral

O Sincla não depende de uma única “trava” de segurança. A proteção é feita em **camadas**: se uma barreira falhar, as outras continuam atuando.

Do ponto de vista do cliente, isso significa que colaboradores, candidatos, alunos e documentos da empresa passam por controles de acesso, isolamento, criptografia, registro de eventos e políticas de retenção — **antes, durante e depois** do uso do sistema.

```
                    ┌─────────────────────────────────────┐
                    │  Usuário / Integrador externo       │
                    └──────────────────┬──────────────────┘
                                       │ HTTPS
                    ┌──────────────────▼──────────────────┐
  Camada 1          │  Perímetro (TLS + Gateway API)      │
                    └──────────────────┬──────────────────┘
                    ┌──────────────────▼──────────────────┐
  Camada 2          │  Autenticação (Hub / SSO)           │
                    └──────────────────┬──────────────────┘
                    ┌──────────────────▼──────────────────┐
  Camada 3          │  Autorização (papéis e permissões)  │
                    └──────────────────┬──────────────────┘
                    ┌──────────────────▼──────────────────┐
  Camada 4          │  Isolamento multiempresa            │
                    └──────────────────┬──────────────────┘
                    ┌──────────────────▼──────────────────┐
  Camada 5          │  Banco de dados (RLS)               │
                    └──────────────────┬──────────────────┘
                    ┌──────────────────▼──────────────────┐
  Camada 6          │  Aplicação e serviços internos      │
                    └──────────────────┬──────────────────┘
                    ┌──────────────────▼──────────────────┐
  Camada 7          │  Logs, auditoria e retenção         │
                    └──────────────────┬──────────────────┘
                    ┌──────────────────▼──────────────────┐
  Camada 8          │  Backup e continuidade              │
                    └─────────────────────────────────────┘
```

---

## Camada 1 — Perímetro e comunicação segura

**O que protege:** interceptação de dados na internet e exposição da infraestrutura interna.

| Controle | Como funciona na prática |
|----------|--------------------------|
| **HTTPS / TLS** | Toda comunicação entre navegador, aplicativo e servidores Sincla trafega criptografada. |
| **Gateway de API** (`api.sincla.com.br`) | Integrações externas (webhooks, portais, automações) entram por um ponto oficial. A URL interna do banco **não é exposta** ao cliente nem ao integrador. |
| **Domínios Sincla** | O usuário interage com `app.sincla.com.br`, `sincla.com.br` e subdomínios do produto — não com endereços técnicos de infraestrutura. |

**Para o cliente:** quem integra com o Sincla usa uma API profissional e controlada, sem precisar (nem poder) apontar sistemas direto para a base de dados.

---

## Camada 2 — Autenticação (quem é você)

**O que protege:** acesso indevido por pessoas não identificadas.

O **Sincla Hub** é a autoridade central de identidade. Todas as ferramentas (RH, EAD, Agenda, Recrutamento etc.) validam o usuário a partir do Hub.

| Controle | Como funciona na prática |
|----------|--------------------------|
| **Login único (SSO)** | Um cadastro, um acesso para todo o ecossistema contratado. |
| **Tokens com tempo limitado** | Links de acesso e navegação entre módulos usam tokens de curta duração (minutos), reduzindo risco se forem interceptados. |
| **Sessão controlada** | Access token e refresh token com validade definida; logout encerra o acesso. |
| **Assinatura criptográfica** | Tokens internos são assinados e validados no servidor — não são aceitos se alterados ou expirados. |

**Para o cliente:** menos senhas espalhadas, menos portas de entrada e um ponto central para revogar acesso quando alguém sai da empresa.

---

## Camada 3 — Autorização (o que você pode fazer)

**O que protege:** que cada pessoa veja e altere apenas o necessário.

| Controle | Como funciona na prática |
|----------|--------------------------|
| **Papéis na empresa** | Dono, admin, gestor e membro — cada um com limites diferentes. |
| **Permissão por ferramenta** | O mesmo colaborador pode ter acesso avançado no RH e básico no EAD, por exemplo. |
| **Verificação no servidor** | Antes de executar uma ação sensível, o sistema confirma assinatura ativa e permissão (`check-permission`, `check-subscription`). |
| **Parceiros / consultores** | Acesso controlado apenas às empresas que o cliente autorizou. |

**Para o cliente:** princípio do menor privilégio — quem precisa operar o dia a dia não necessariamente configura a empresa ou acessa dados sensíveis de outras áreas.

---

## Camada 4 — Isolamento entre empresas (multi-tenant)

**O que protege:** que os dados de uma empresa cliente não se misturem com os de outra.

| Controle | Como funciona na prática |
|----------|--------------------------|
| **Identificador por empresa** | Todo registro relevante pertence a uma `empresa_id` ou `tenant_id`. |
| **Separação lógica** | RH, EAD, Recrutamento e demais módulos operam no contexto da empresa logada — nunca no contexto global. |
| **Branding e configuração isolados** | Logo, cores, domínio e configurações são por empresa, sem vazamento entre tenants. |

**Para o cliente:** mesmo em infraestrutura compartilhada (modelo SaaS), sua operação funciona como um ambiente dedicado.

---

## Camada 5 — Proteção no banco de dados (RLS)

**O que protege:** acesso direto aos dados, mesmo que alguém tente burlar a interface.

O Sincla usa **Row Level Security (RLS)** no PostgreSQL: regras no próprio banco garantem que cada consulta só retorna registros da empresa e do perfil autorizado.

| Controle | Como funciona na prática |
|----------|--------------------------|
| **RLS ativo nas tabelas sensíveis** | Empresas, membros, assinaturas, contatos, tokens de API, logs de sincronização, consumo de serviços etc. |
| **Políticas por membro** | Ex.: admin da empresa vê logs de provisionamento da sua empresa; usuário comum não vê. |
| **Dados ultra-sensíveis sem policy pública** | Ex.: tokens de cartão e configurações internas ficam acessíveis somente por processos server-side (service role), nunca pelo app do usuário. |
| **Chaves de sistema só no servidor** | Credenciais administrativas de banco existem apenas em servidores (Edge Functions, gateway) — nunca no código que roda no navegador. |

**Para o cliente:** a segurança não depende só da tela bonita; o banco também bloqueia acesso indevido.

---

## Camada 6 — Aplicação, API externa e arquivos

**O que protege:** abuso de integrações, vazamento de segredos e arquivos fora de contexto.

### 6.1 Aplicação

| Controle | Como funciona na prática |
|----------|--------------------------|
| **Validação dupla** | Formulários e APIs validam dados no cliente e no servidor. |
| **Segredos fora do frontend** | Chaves de IA, webhooks, service secrets e tokens internos ficam em variáveis de ambiente do servidor. |
| **IA centralizada** | O navegador chama um proxy da ferramenta; o proxy valida usuário e empresa antes de acionar o motor de IA do Hub. Chaves de OpenAI/Groq **nunca** ficam no app do usuário. |
| **Pagamentos** | Cobrança via provedores especializados (Stripe / Asaas). Dados completos de cartão não circulam pelo fluxo normal do produto. |

### 6.2 API e webhooks para integradores

| Controle | Como funciona na prática |
|----------|--------------------------|
| **Token por empresa e ferramenta** | Cada integração recebe credencial própria, com escopo e validade. |
| **Escopo forçado** | Toda requisição na API pública é filtrada pela empresa do token — não há consulta “global”. |
| **Autenticação de webhooks** | Eventos externos validam segredo ou assinatura HMAC antes de serem processados. |
| **Limite de requisições** | Rate limit em endpoints sensíveis para reduzir abuso automatizado. |

### 6.3 Arquivos e mídia

| Controle | Como funciona na prática |
|----------|--------------------------|
| **Pastas por empresa** | Uploads (documentos, vídeos, áudios) organizados por identificador da empresa. |
| **Metadados protegidos** | Informações sobre arquivos seguem as mesmas regras de isolamento do banco. |
| **Streaming e storage** | Vídeos e arquivos grandes passam por serviços dedicados com controle de cota por empresa. |

**Para o cliente:** integrações profissionais, IA segura e arquivos guardados no contexto certo — sem expor a “parte técnica” do sistema.

---

## Camada 7 — Logs, auditoria e rastreabilidade

**O que protege:** falta de accountability — saber quem fez o quê, quando e com qual resultado.

O Sincla mantém diferentes tipos de registro, cada um com um propósito:

| Tipo de log | O que registra | Utilidade para o cliente |
|-------------|----------------|--------------------------|
| **`provision_logs`** | Concessão, revogação e sincronização de acesso de colaboradores nas ferramentas | Saber quando alguém ganhou ou perdeu acesso a um módulo |
| **`sync_logs`** | Sincronizações de dados entre Hub e ferramentas (quantidade, erros, direção) | Rastrear integrações e falhas de sincronização |
| **`service_usage_log`** | Consumo de serviços centralizados: IA, storage, notificações, banda etc. | Transparência de uso, cobrança e investigação de consumo anormal |
| **Logs de webhook** | Entrega e processamento de eventos para sistemas externos | Prova de que um evento foi enviado/recebido; suporte a integrações |
| **Logs jurídicos (RH)** | Assinatura digital de documentos: hash encadeado, IP, carimbo de tempo | Validade probatória e auditoria de documentos assinados |
| **Logs administrativos** | Ações sensíveis de admins (acessos, exclusões, alterações relevantes) | Apoio a auditorias internas e conformidade |

Características importantes:

- Logs de consumo (`service_usage_log`) são tratados como **registro imutável** — cada uso fica registrado com empresa, ferramenta, tipo de serviço e contexto.
- Logs de provisionamento ficam visíveis para **admins da própria empresa** — não para terceiros.
- Webhooks críticos gravam trilha para **debug e conformidade (LGPD)**.

**Para o cliente:** não é só “o sistema é seguro” — há **histórico** para investigar incidentes, comprovar ações e responder auditorias.

---

## Camada 8 — Backup, retenção e continuidade

**O que protege:** perda de dados e indisponibilidade prolongada.

| Controle | Como funciona na prática |
|----------|--------------------------|
| **Backups automatizados** | Banco de dados em nuvem com rotina de backup gerenciada pelo provedor de infraestrutura. |
| **Redundância** | Serviços em nuvem com réplicas e alta disponibilidade — não dependem de um único servidor físico. |
| **Criptografia em repouso** | Dados persistidos de forma criptografada na infraestrutura de armazenamento. |
| **Retenção configurável** | A empresa pode definir prazo de retenção de dados de colaboradores desligados; após o período, dados podem ser anonimizados ou descartados conforme política interna. |
| **Exportação** | Relatórios e exportação de dados para portabilidade (direito do titular / governança interna). |

**Para o cliente:** seus dados não ficam apenas “no sistema de hoje” — há rotina de proteção contra perda e políticas para ciclo de vida da informação.

---

## Camada 9 — LGPD e governança de privacidade

**O que protege:** risco jurídico e falta de clareza sobre quem responde por cada dado.

| Papel | Na prática |
|-------|------------|
| **Empresa cliente (Controladora)** | Nos módulos de gestão (ex.: RH), decide base legal, admite colaboradores e define exclusões. |
| **Sincla (Operadora)** | Processa os dados com segurança para executar as rotinas contratadas. |
| **Titular** | Em cadastros diretos (candidato, aluno), pode alterar ou excluir informações pelo Hub quando aplicável. |

Recursos disponíveis:

- Canal do Encarregado (DPO): **privacidade@sincla.com.br**
- Exclusão e anonimização de cadastros
- Exportação / portabilidade
- Apoio a RIPD (Relatório de Impacto à Proteção de Dados)
- Consentimento e termos versionados nos fluxos de cadastro

**Para o cliente:** segurança técnica aliada a governança de privacidade — o que o jurídico e o RH precisam para operar com tranquilidade.

---

## Resumo em uma tabela

| Camada | Protege contra | Exemplos no Sincla |
|--------|----------------|-------------------|
| 1. Perímetro | Interceptação, exposição de infraestrutura | HTTPS, gateway `api.sincla.com.br` |
| 2. Autenticação | Acesso anônimo ou não identificado | Hub SSO, tokens de curta duração |
| 3. Autorização | Excesso de privilégio | Papéis, permissão por ferramenta |
| 4. Multi-tenant | Vazamento entre empresas | `empresa_id` / `tenant_id` em tudo |
| 5. Banco (RLS) | Consulta direta indevida | Políticas PostgreSQL por empresa |
| 6. Aplicação/API | Abuso, segredos expostos, arquivos soltos | IA central, tokens API, HMAC, paths por empresa |
| 7. Logs | Falta de rastreio | `provision_logs`, `sync_logs`, `service_usage_log`, logs jurídicos |
| 8. Backup | Perda de dados, indisponibilidade | Backups automáticos, retenção, exportação |
| 9. LGPD | Risco jurídico e de privacidade | DPO, exclusão, portabilidade, RIPD |

---

## Texto curto para colar na proposta

> O Sincla protege dados em **9 camadas de segurança**: comunicação criptografada e API oficial, autenticação centralizada (SSO), controle de permissões por papel e ferramenta, isolamento total entre empresas, regras de acesso no banco de dados (RLS), proteção de integrações e arquivos, **registros de auditoria** (acessos, sincronizações, consumo de serviços e documentos assinados), **backups automatizados** com políticas de retenção, e governança alinhada à **LGPD** com canal de DPO.

---

## Contatos

| Assunto | Canal |
|---------|--------|
| Privacidade / LGPD / DPO | privacidade@sincla.com.br |
| Suporte comercial e técnico | contato@sincla.com.br |
| Página pública | sincla.com.br/suporte-lgpd |

---

*Sincla — Camadas de Segurança. Documento comercial. Não substitui contrato, SLA ou política de privacidade.*
