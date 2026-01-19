# Fluxo do CTA "Comecar Gratis"

> Documento tecnico de UX para implementacao do fluxo de conversao
> Status: Aprovado para execucao
> Atualizado: Modelo de identidade dual (pessoal + corporativa)

---

## 1. Visao Geral do Fluxo

```
[Usuario clica "Comecar gratis"]
           |
           v
    [Modal: Etapa 1]
    IDENTIDADE PESSOAL
    - Nome completo
    - E-mail pessoal
    - Telefone (opcional)
    - Senha
           |
           v
    [Modal: Etapa 2]
    IDENTIDADE DA EMPRESA
    - CNPJ (com busca automatica)
    - Nome fantasia
    - Segmento de atuacao
    - Numero de colaboradores
           |
           v
    [Modal: Etapa 3]
    PRIMEIRO MODULO
    - Cards dos 5 modulos ativos
    - Selecao unica
    - Preview do que esta incluido
           |
           v
    [Processando...]
    - Criando sua identidade...
    - Configurando empresa...
    - Ativando modulo...
           |
           v
    [Tela de Sucesso]
    - Resumo: Voce + Empresa + Modulo
    - "Seus dados ja estao em todos os lugares"
    - CTA: "Acessar [Modulo]"
           |
           v
    [Redirect para plataforma]
    - Usuario ja logado (SSO)
    - Dados pessoais ja preenchidos
    - Dados da empresa ja preenchidos
    - Onboarding do modulo especifico
```

---

## 2. Principio Central do Fluxo

### A Promessa
```
"Cadastre uma vez. Use em todo lugar."
```

### A Entrega
Ao final do onboarding, o usuario deve:
1. Ter seus dados pessoais salvos (nome, email, telefone)
2. Ter os dados da empresa salvos (CNPJ, nome, segmento, tamanho)
3. Acessar o modulo escolhido com TUDO ja preenchido
4. Nunca mais precisar preencher esses dados em outro modulo Sincla

### O Teste de Qualidade
```
Se o usuario ativar um segundo modulo depois,
ele deve ver seus dados ja la — sem digitar nada.
```

---

## 3. Detalhamento de Cada Etapa

### Etapa 1: Identidade Pessoal

**Objetivo:** Capturar os dados do usuario como individuo.

**Header do Modal:**
```
Etapa 1 de 3

Crie sua identidade pessoal
Esses dados serao usados em todas as plataformas Sincla.
```

**Campos:**

| Campo | Tipo | Validacao | Obrigatorio |
|-------|------|-----------|-------------|
| Nome completo | Text | 2-100 chars, min 2 palavras | Sim |
| E-mail | Email | Formato valido, unico no sistema | Sim |
| Telefone | Phone | Formato brasileiro, mascara automatica | Nao |
| Senha | Password | Min 8 chars, 1 maiuscula, 1 numero | Sim |
| Confirmar senha | Password | Igual ao campo anterior | Sim |

**Mensagem de contexto (abaixo dos campos):**
```
[Icon info] Seu e-mail sera seu login unico para todo o ecossistema Sincla.
```

**Indicador de forca de senha:**
```
[====      ] Fraca — Adicione numeros e maiusculas
[======    ] Media — Quase la!
[==========] Forte — Excelente!
```

**CTA:** "Continuar"

**Validacao em tempo real:**
- E-mail: Verifica se ja existe no sistema
- Senha: Mostra requisitos sendo cumpridos
- Nome: Verifica se tem pelo menos 2 palavras

---

### Etapa 2: Identidade da Empresa

**Objetivo:** Capturar os dados da empresa/organizacao.

**Header do Modal:**
```
Etapa 2 de 3

Cadastre sua empresa
Essas informacoes serao compartilhadas automaticamente
em todos os modulos que voce ativar.
```

**Campos:**

| Campo | Tipo | Validacao | Obrigatorio |
|-------|------|-----------|-------------|
| CNPJ | Text + Busca | Formato valido, busca na Receita | Sim |
| Nome fantasia | Text (auto-preenchido) | 2-100 chars | Sim |
| Razao social | Text (auto-preenchido) | - | Display only |
| Segmento | Select | Lista predefinida | Sim |
| Numero de colaboradores | Select | Faixas predefinidas | Sim |

**Busca automatica por CNPJ:**
```
Usuario digita: 12.345.678/0001-90
Sistema busca na Receita Federal
Auto-preenche:
- Nome fantasia: "TechCorp"
- Razao social: "TechCorp Tecnologia LTDA"
- Endereco (para uso futuro, nao exibido)
```

**Opcoes de Segmento:**
```
- Tecnologia e Software
- Comercio e Varejo
- Servicos Profissionais
- Industria e Manufatura
- Saude e Bem-estar
- Educacao
- Financeiro
- Construcao e Imobiliario
- Alimentacao e Bebidas
- Outro (especificar)
```

**Opcoes de Colaboradores:**
```
- Apenas eu (1)
- 2 a 10
- 11 a 50
- 51 a 200
- 201 a 500
- Mais de 500
```

**Mensagem de contexto:**
```
[Icon lock] Seus dados empresariais sao protegidos e usados apenas
para personalizar sua experiencia no ecossistema Sincla.
```

**CTA:** "Continuar"

**Caso especial — Sem CNPJ:**
```
Link discreto: "Ainda nao tenho CNPJ"
-> Abre campos manuais (nome da empresa, segmento)
-> Marca conta como "PF" internamente
-> Pode converter para PJ depois
```

---

### Etapa 3: Escolha do Primeiro Modulo

**Objetivo:** Selecionar qual modulo sera ativado.

**Header do Modal:**
```
Etapa 3 de 3

Escolha seu primeiro modulo
Voce pode ativar outros modulos a qualquer momento.
Seus dados ja estarao la.
```

**Layout:** Grid de cards (2x3 desktop, lista vertical mobile)

**Estrutura de cada card:**
```
+----------------------------------+
|  [Logo do Modulo]                |
|                                  |
|  Sincla RH                       |
|  Gestao de pessoas completa      |
|                                  |
|  Inclui no plano gratis:         |
|  - Ate 5 colaboradores           |
|  - Cadastro e documentos         |
|  - Organograma basico            |
|                                  |
|  [Selecionar]                    |
+----------------------------------+
```

**Modulos disponiveis:**

| Modulo | Tagline | Inclui no Gratis |
|--------|---------|------------------|
| Sincla RH | Gestao de pessoas completa | 5 colaboradores, cadastro, organograma |
| Sincla EAD | Cursos e treinamentos | 1 curso, 10 alunos, certificado |
| Sincla Bolso | Financas pessoais | Dashboards, categorias, metas |
| Sincla Leads | Paginas de conversao | 1 pagina, 100 leads/mes |
| Sincla Agenda | Produtividade pessoal | Calendario, tarefas, lembretes |
| Sincla Intranet | Comunicacao interna | [Em breve] |

**Estados do Card:**
- Default: Borda sutil, fundo transparente
- Hover: Borda primaria, elevacao sutil
- Selecionado: Borda primaria, checkmark, fundo com opacidade
- Indisponivel: Opacidade 50%, badge "Em breve", nao clicavel

**Mensagem de contexto:**
```
[Icon magic] Ao acessar o modulo, seus dados pessoais e da empresa
ja estarao preenchidos. Magia? Nao, cadastro unico.
```

**CTA:** "Ativar [Nome do Modulo]"

---

### Etapa 4: Processando

**Objetivo:** Feedback enquanto o sistema configura tudo.

**Duracao esperada:** 3-8 segundos

**UI:**
```
[Animacao de loading — circulos conectando-se]

Preparando tudo para voce...

[Barra de progresso]

Etapa atual: Configurando Sincla RH...
```

**Sequencia de mensagens:**
```
1. "Criando sua identidade pessoal..."
2. "Registrando dados da empresa..."
3. "Ativando Sincla [Modulo]..."
4. "Sincronizando seus dados..."
5. "Quase la..."
```

**Racional:**
- Mensagens especificas criam sensacao de "trabalho real"
- Usuario entende que algo valioso esta sendo criado
- Prepara expectativa de que dados estarao prontos

---

### Etapa 5: Tela de Sucesso

**Objetivo:** Confirmar criacao e mostrar o valor imediato.

**Layout:**
```
        [Animacao de checkmark]

    Tudo pronto, [Nome]!

    Sua identidade Sincla foi criada.

+--------------------------------------------------+
|                                                  |
|  VOCE                     SUA EMPRESA            |
|  [Avatar]                 [Icon empresa]         |
|  Maria Silva              TechCorp               |
|  maria@email.com          12.345.678/0001-90     |
|                           Tecnologia | 11-50     |
|                                                  |
+--------------------------------------------------+

            |
            v
    [Icon do Modulo Escolhido]

    Sincla RH ativado!
    Seus dados ja estao la.

    [ Acessar Sincla RH ]

    ou explorar o Hub primeiro
```

**Elementos importantes:**
1. **Resumo visual** — Usuario ve seus dados + empresa lado a lado
2. **Confirmacao do modulo** — Sabe exatamente o que foi ativado
3. **Promessa cumprida** — "Seus dados ja estao la"
4. **CTA claro** — Acao principal e acessar o modulo

**Envio de email:**
```
Assunto: Bem-vindo ao Sincla, [Nome]!

Sua identidade foi criada:
- Login: maria@email.com
- Empresa: TechCorp
- Modulo ativo: Sincla RH

[Acessar agora]
```

---

## 4. Experiencia no Modulo Ativado

### O Que o Usuario Encontra

Ao entrar no modulo pela primeira vez:

```
+--------------------------------------------------+
|  Sincla RH                                       |
|                                                  |
|  Bem-vinda, Maria!                               |
|                                                  |
|  Identificamos que voce e da TechCorp.           |
|  Ja configuramos algumas coisas pra voce:        |
|                                                  |
|  [x] Seu perfil de administrador                 |
|  [x] Dados da empresa no sistema                 |
|  [x] Configuracoes iniciais de RH                |
|                                                  |
|  Proximo passo: Cadastre seu primeiro            |
|  colaborador ou importe uma planilha.            |
|                                                  |
|  [ Cadastrar colaborador ]  [ Importar ]         |
+--------------------------------------------------+
```

**Dados ja preenchidos:**
- Perfil do usuario (nome, email, telefone)
- Dados da empresa (CNPJ, nome, segmento, tamanho)
- Usuario ja e admin da empresa
- Configuracoes basicas aplicadas

**Isso e o diferencial.** Nenhuma outra ferramenta faz isso.

---

## 5. Fluxo de Segundo Modulo

### Quando o usuario ativa outro modulo depois

```
Usuario esta no Hub
     |
     v
Clica em "Ativar" no card do Sincla EAD
     |
     v
[Modal simplificado]

"Ativar Sincla EAD para TechCorp?"

Seus dados ja serao transferidos:
- Maria Silva (admin)
- TechCorp (empresa)

[ Cancelar ]  [ Ativar agora ]
     |
     v
[Processando... 2 segundos]
     |
     v
[Redirect para Sincla EAD]
Dados ja la. Zero formularios.
```

**Diferencial critico:**
- Usuario NAO preenche nada de novo
- Apenas confirma a ativacao
- Dados fluem automaticamente

---

## 6. Tratamento de Casos Especiais

### 6.1 E-mail ja cadastrado

```
[Etapa 1 — Campo de e-mail]

Usuario digita: maria@email.com
Sistema detecta: E-mail ja existe

Mensagem inline:
"Este e-mail ja esta cadastrado no Sincla."

Opcoes:
[ Fazer login ] [ Recuperar senha ] [ Usar outro e-mail ]
```

### 6.2 CNPJ ja cadastrado

```
[Etapa 2 — Campo de CNPJ]

Usuario digita: 12.345.678/0001-90
Sistema detecta: Empresa ja existe

Mensagem inline:
"Esta empresa ja esta no Sincla."

Opcoes:
[ Solicitar acesso ] [ Usar outro CNPJ ]

-> "Solicitar acesso" envia pedido ao admin atual
```

### 6.3 CNPJ invalido ou nao encontrado

```
[Etapa 2 — Campo de CNPJ]

Usuario digita: 00.000.000/0000-00
Sistema: Nao encontrado na Receita

Mensagem inline:
"Nao encontramos esse CNPJ. Verifique ou preencha manualmente."

[ Preencher manualmente ]
-> Abre campos de nome fantasia e razao social
```

### 6.4 Usuario desiste no meio

```
[Qualquer etapa — Usuario clica X ou fora do modal]

Modal de confirmacao:
"Sair do cadastro?"
"Voce precisara comecar novamente."

[ Continuar cadastro ]  [ Sair ]
```

**Se tiver completado Etapa 1:**
- Salvar dados parciais
- Enviar email: "Voce nao terminou seu cadastro"
- Link para retomar de onde parou

### 6.5 Erro de conexao

```
[Qualquer etapa — Erro de rede]

Mensagem no modal:
"Ops, algo deu errado. Verifique sua conexao."

[ Tentar novamente ]

-> Retry automatico 1x antes de mostrar erro
-> Dados digitados sao preservados
```

---

## 7. Metricas e Tracking

### Eventos para Analytics

```javascript
// Inicio
analytics.track('signup_started', { source: 'hero_cta' });

// Etapa 1
analytics.track('signup_step1_completed', {
  has_phone: true/false,
  password_strength: 'strong'
});

// Etapa 2
analytics.track('signup_step2_completed', {
  cnpj_autofill: true/false,
  segment: 'tecnologia',
  company_size: '11-50'
});

// Etapa 3
analytics.track('signup_module_selected', {
  module: 'rh'
});

// Sucesso
analytics.track('signup_completed', {
  module: 'rh',
  time_to_complete_seconds: 45,
  cnpj_autofill: true
});

// Abandono
analytics.track('signup_abandoned', {
  step: 2,
  last_field: 'cnpj',
  time_spent_seconds: 30
});
```

### Funil Esperado

| Etapa | Conversao Esperada |
|-------|-------------------|
| Clique CTA → Etapa 1 | 100% (baseline) |
| Etapa 1 → Etapa 2 | > 75% |
| Etapa 2 → Etapa 3 | > 80% |
| Etapa 3 → Sucesso | > 90% |
| **Total** | **> 55%** |

### Alertas Automaticos

- Se conversao Etapa 1→2 < 60%: Revisar campos de senha
- Se conversao Etapa 2→3 < 70%: Revisar busca de CNPJ
- Se abandono concentrado em CNPJ: Melhorar opcao "sem CNPJ"

---

## 8. Requisitos Tecnicos

### Backend Necessario

1. **API de validacao de e-mail** — Verifica unicidade em tempo real
2. **API de busca de CNPJ** — Integra com Receita Federal ou serviço similar
3. **API de criacao de conta** — Cria usuario + empresa + vinculo
4. **Provisioning de modulo** — Ativa modulo selecionado
5. **SSO token** — Gera sessao para redirect
6. **Email transacional** — Envia confirmacao

### Frontend Necessario

1. **Componente Modal multi-step** — 3 etapas + loading + sucesso
2. **Validacao em tempo real** — Debounced, com feedback visual
3. **Mascara de inputs** — CNPJ, telefone
4. **Integracao com API** — Fetch + estados de loading/erro
5. **Persistencia local** — Salva progresso parcial
6. **Redirect inteligente** — Para modulo ou Hub

### Integrações Externas

1. **Receita Federal / CNPJ.ws** — Busca de dados por CNPJ
2. **Servico de email** — SendGrid, Resend, etc.
3. **Analytics** — Posthog, Mixpanel, ou Amplitude

---

## 9. Acessibilidade

### Navegacao por Teclado
- Tab navega entre campos
- Enter avanca etapa (se valido)
- Escape fecha modal (com confirmacao)
- Shift+Tab volta campo

### Screen Readers
- Aria-labels em todos os campos
- Anuncio de erros de validacao
- Anuncio de mudanca de etapa
- Progress indicator legivel

### Contraste e Visual
- Textos com contraste minimo 4.5:1
- Erros indicados por cor + icone + texto
- Estados de foco visiveis
- Botoes com area de toque minima 44x44px

---

## 10. Responsividade

### Desktop (> 1024px)
- Modal: 540px largura, centralizado
- Cards de modulo: Grid 2x3
- Campos lado a lado quando possivel

### Tablet (768px - 1024px)
- Modal: 90% largura, max 540px
- Cards de modulo: Grid 2x3 (menores)
- Campos empilhados

### Mobile (< 768px)
- Modal: Full screen (bottom sheet)
- Cards de modulo: Lista vertical
- Campos full width
- CTAs fixed na parte inferior

---

*Documento aprovado para implementacao*
*Atualizado com modelo de identidade dual*
*Dependencias: API de CNPJ, backend de signup, SSO*
