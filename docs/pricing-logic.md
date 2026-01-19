# Modelo de Pricing - Logica Estrutural

> Documento estrategico de estrutura de planos e monetizacao
> Status: Aprovado para execucao
> Atualizado: Modelo de identidade dual (pessoal + corporativa)
> Nota: Este documento NAO contem valores, apenas logica estrutural

---

## 1. Principios do Modelo

### 1.1 Premissas Fundamentais

1. **Identidade dual como base** — Usuario (dados pessoais) + Empresa (CNPJ, dados corporativos)
2. **Cadastro unico** — Dados preenchidos uma vez, disponiveis em todos os modulos
3. **Modularidade real** — Cada modulo e independente e pode ser ativado/desativado
4. **Escala previsivel** — Pricing deve fazer sentido de 5 a 500 colaboradores
5. **Sem surpresas** — Custos claros, sem taxas ocultas
6. **Upsell natural** — Estrutura incentiva expansao sem forcar

### 1.2 Modelo Conceitual

```
+------------------------------------------+
|         IDENTIDADE DO USUARIO            |
|   (nome, email, telefone)                |
|   -> Dados pessoais, viajam com voce     |
+------------------------------------------+
              +
+------------------------------------------+
|         IDENTIDADE DA EMPRESA            |
|   (CNPJ, nome fantasia, segmento)        |
|   -> Dados corporativos, ficam na empresa|
+------------------------------------------+
              |
              v
+------------------------------------------+
|              SINCLA HUB                  |
|   Painel central + Governanca + SSO      |
+------------------------------------------+
              |
    +---------+---------+---------+
    |         |         |         |
+---v---+ +---v---+ +---v---+ +---v---+
|  RH   | |  EAD  | | Bolso | | Leads |
+-------+ +-------+ +-------+ +-------+
    |         |         |         |
    Dados do usuario e empresa ja preenchidos
    Cada modulo tem seu proprio pricing
```

---

## 2. Estrutura de Planos

### 2.1 Camada Base: Identidade Sincla

**O que inclui:**
- Subdominio personalizado (empresa.sincla.com.br)
- 1 e-mail admin (@empresa.sincla.com.br)
- Acesso ao Hub (painel de controle)
- SSO entre todos os modulos ativados
- Governanca basica (quem acessa o que)

**Gratuito para sempre:**
- 1 administrador
- Subdominio
- Hub basico

**Pago:**
- Usuarios adicionais no Hub (e-mails extras)
- Recursos avancados de governanca

---

### 2.2 Camada de Modulos

Cada modulo tem estrutura de pricing independente:

```
MODULO
  |
  +-- Plano Free (limitado)
  |     - Usuarios: X
  |     - Features: basicas
  |
  +-- Plano Pro (individual ou time)
  |     - Usuarios: Y
  |     - Features: completas
  |
  +-- Plano Business (empresa)
        - Usuarios: ilimitados*
        - Features: completas + admin
```

*Ilimitados dentro do limite de usuarios do Hub

---

### 2.3 Tabela de Relacao Hub x Modulos

| Elemento | Gratuito | Pro | Business | Enterprise |
|----------|----------|-----|----------|------------|
| **Hub (Identidade)** |
| Usuarios Hub | 1 | 10 | 50 | Ilimitado |
| Subdominios | 1 | 1 | 3 | Custom |
| SSO | Basico | Basico | Avancado | SAML/OIDC |
| Governanca | - | Basica | Completa | Custom |
| **Modulos (cada)** |
| Usuarios modulo | Limitado | Ate 10 | Ate 50 | Ilimitado |
| Features | Basicas | Completas | Completas | Custom |
| Suporte | Email | Chat | Prioritario | Dedicado |

---

## 3. O Que E Gratuito

### 3.1 Plano Gratuito (Starter)

**Nome:** Sincla Starter

**Inclui:**
- 1 identidade Sincla (subdominio + 1 admin)
- 1 modulo ativo com features basicas
- Acesso ao Hub
- SSO entre Hub e modulo

**Limitacoes:**
- Apenas 1 usuario
- Apenas 1 modulo simultaneo
- Features basicas do modulo
- Suporte apenas por email/docs
- Branding "Powered by Sincla"

**Duracao:** Indefinida (nao e trial)

**Objetivo estrategico:**
- Product-led growth
- Usuario experimenta valor real
- Converte quando precisa de mais usuarios ou modulos

---

### 3.2 O Que Desbloqueia Conversao

Usuario converte para pago quando:

1. **Precisa de mais usuarios** — Time cresceu, precisa dar acesso a outros
2. **Precisa de mais modulos** — Quer RH E EAD ao mesmo tempo
3. **Precisa de features avancadas** — Relatorios, integracao, API
4. **Precisa de suporte melhor** — SLA, chat, onboarding

---

## 4. O Que E Pago

### 4.1 Eixos de Monetizacao

```
                    USUARIOS
                       |
                       |
       +---------------+---------------+
       |               |               |
   1 usuario      5-10 usuarios    50+ usuarios
   (Free)           (Pro)          (Business)
       |               |               |
       +-------+-------+-------+-------+
               |               |
            MODULOS          FEATURES
               |               |
         1 modulo (Free)    Avancadas (Pro+)
         2+ modulos (Pro)   Custom (Enterprise)
```

### 4.2 Precificacao por Usuario

**Modelo:** Preco por usuario ativo por modulo

**Logica:**
- Usuario no Hub = 1 custo base (se > 1)
- Usuario em Modulo X = custo adicional do modulo
- Mesmo usuario em multiplos modulos = somatorio

**Exemplo conceitual:**
```
Empresa com 10 colaboradores:
- Hub: 10 usuarios = [valor Hub]
- Sincla RH: 10 usuarios ativos = [valor RH x 10]
- Sincla EAD: 5 usuarios ativos = [valor EAD x 5]
- Total = Hub + RH + EAD
```

### 4.3 Descontos por Volume

| Usuarios | Desconto |
|----------|----------|
| 1-10 | 0% |
| 11-25 | 10% |
| 26-50 | 15% |
| 51-100 | 20% |
| 100+ | Negociavel |

### 4.4 Descontos por Bundle

| Modulos Ativos | Desconto |
|----------------|----------|
| 1 | 0% |
| 2 | 10% |
| 3 | 15% |
| 4+ | 20% |

**Mensagem:** "Quanto mais modulos, maior o desconto"

---

## 5. Como os Modulos se Relacionam com o E-mail

### 5.1 Fluxo de Acesso

```
1. Colaborador recebe e-mail @empresa.sincla.com.br
2. E-mail e credencial unica (SSO)
3. Acessa Hub com e-mail Sincla
4. Hub mostra modulos disponiveis para aquele usuario
5. Click em modulo → acesso direto (ja autenticado)
```

### 5.2 Governanca via E-mail

**Admin pode:**
- Criar/remover e-mails (usuarios)
- Definir quais modulos cada usuario acessa
- Ver logs de acesso unificados
- Revogar acesso instantaneamente (desativa e-mail)

**Colaborador:**
- Um e-mail = acesso a tudo que foi liberado
- Esqueceu senha = recupera uma vez, vale pra tudo
- Saiu da empresa = e-mail desativado, acesso encerrado

### 5.3 Beneficio de Seguranca

```
Ferramentas soltas:
- 5 senhas diferentes
- 5 processos de offboarding
- 5 riscos de vazamento

Sincla:
- 1 identidade
- 1 offboarding
- 1 ponto de controle
```

---

## 6. Escala para Empresas Maiores

### 6.1 Plano Enterprise

**Para quem:** Empresas com 100+ colaboradores ou necessidades especificas

**Diferenciais:**
- Usuarios ilimitados (negociado)
- Multiplos subdominios (filiais, marcas)
- SSO com provedor externo (SAML, OIDC, AD)
- API completa
- Suporte dedicado (CSM)
- SLA garantido
- Onboarding personalizado
- Customizacoes de interface

**Modelo de pricing:**
- Contrato anual
- Valor negociado (nao self-service)
- Faturamento consolidado

### 6.2 Transicao Business → Enterprise

**Gatilhos automaticos:**
- Usuario tenta adicionar 51+ colaboradores
- Usuario solicita SSO externo
- Usuario solicita multiplos subdominios

**Fluxo:**
1. Sistema detecta necessidade enterprise
2. Mostra mensagem: "Para mais de 50 usuarios, fale com nosso time"
3. Formulario de contato qualificado
4. Retorno comercial em 24h

---

## 7. Comunicacao de Pricing no Site

### 7.1 O Que Mostrar na Landing Page

**Sim:**
- Que existe plano gratuito
- Que e modular (pague pelo que usa)
- Que tem descontos por volume/bundle
- CTA para "Ver planos" (pagina dedicada)

**Nao:**
- Tabela completa de precos (muito complexo para hero)
- Calculadora (momento errado, usuario ainda nao entende o produto)

### 7.2 Pagina de Precos (/precos)

**Estrutura sugerida:**

```
1. Hero simples
   "Precos simples. Valor real."

2. Selector de contexto
   [Sou profissional] [Tenho uma empresa] [Sou enterprise]

3. Cards de plano (baseado no contexto)
   - Starter (gratis)
   - Pro
   - Business
   - Enterprise (fale conosco)

4. FAQ de pricing
   - "Posso mudar de plano?"
   - "Como funciona o faturamento?"
   - "Tem fidelidade?"

5. Calculadora (opcional, fase 2)
   - Simula custo baseado em usuarios e modulos
```

### 7.3 Mensagens-Chave

```
"Comece gratis, escale quando precisar"
"Pague apenas pelos modulos que usar"
"Sem contratos longos, cancele quando quiser"
"Descontos automaticos conforme voce cresce"
```

---

## 8. Comparativo com Mercado

### 8.1 Modelo Tradicional vs Sincla

| Aspecto | Tradicional | Sincla |
|---------|-------------|--------|
| Cobranca | Por ferramenta isolada | Por ecossistema integrado |
| Identidade | Conta em cada tool | E-mail unico |
| Desconto | Negociacao manual | Automatico por bundle |
| Governanca | Inexistente ou fragmentada | Centralizada no Hub |
| Escala | Recontratacao em cada tool | Adiciona usuarios/modulos |

### 8.2 Posicionamento de Preco

- **Mais barato que:** Suite Atlassian completa, Google Workspace + ferramentas
- **Similar a:** Notion + HiBob + LMS separados
- **Mais caro que:** Ferramentas individuais muito basicas

**Proposta de valor:** "O custo de integracao que voce economiza paga o investimento"

---

## 9. Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Usuario fica no free para sempre | Features basicas limitadas, sem suporte |
| Complexidade de pricing confunde | Comunicacao clara, calculadora |
| Churn quando modulo nao atende | Qualidade do produto > pricing |
| Comparacao com ferramentas isoladas | Enfatizar integracao e governanca |

---

## 10. Proximos Passos

### Para Definir (Decisao de Negocio)

1. Valores absolutos de cada plano
2. Limites especificos de cada modulo no free
3. Politica de trial de modulos adicionais
4. Ciclo de faturamento (mensal vs anual)
5. Politica de reembolso

### Para Implementar (Apos Decisao)

1. Pagina /precos
2. Billing system
3. Upgrade flow in-app
4. Comunicacao de limites no produto

---

*Documento aprovado para revisao de negocio*
*Valores a serem definidos pelo time de produto/financeiro*
*Proxima etapa: enterprise-trust.md*
