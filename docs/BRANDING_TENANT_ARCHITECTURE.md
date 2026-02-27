# Arquitetura de Branding e Multi-Tenant (Sincla Hub -> Aplicações)

Este documento estabelece as diretrizes e boas práticas para o consumo, armazenamento e aplicação das identidades visuais descentralizadas (Logos, Favicons e Cores Base) dentro dos módulos do ecossistema Sincla (RH, EAD, etc).

## 1. Single Source of Truth (SSOT)
O **Sincla Hub** é a única fonte da verdade para as configurações de empresa. Todo formulário de configuração visual dentro dos submódulos (como RH) deve ser desabilitado ou instruir o usuário a retornar ao painel central do Hub para fazer a alteração.
Isso previne fragmentação corporativa e simplifica as atualizações em tempo real.

## 2. Transporte Desacoplado via JWT (SSO)
1. Quando o usuário clica em "Acessar Ferramenta" (ex: RH) através do Hub, a Edge Function `generate-cross-token` embrulha os dados essenciais da empresa (Nome, Slug, **CNPJ**, Logo e Cores) num token assinado seguro (JWT).
2. O receptor (Frontend do RH) acessa a URL através da interface `SmartAccess`. O script frontend lê a hash do payload na própria camada de navegador e **cacheia dados superficiais** (ex: `favicon_url`) em um `localStorage` chamado `sincla_tenant_favicon`.
3. O `SmartAccess` invoca a edge function local (`sso-login`) que captura esse mesmo token e executa um **Upsert de Shadow Tenant** na base do módulo, atualizando a cor Primária, Logo, Nome e CNPJ.

## 3. Aplicação Segura de `corPrimaria` nas Interfaces
O módulo `useAuthStore` sempre provisionará o objeto `empresa`. 
Para referenciar e tingir seus componentes (botões, cards, badged e tooltips) de forma harmônica a cada marca:

### Mantine Context (Recomendado)
A cor injetada já preenche globalmente a subcamada `company-primary` do Mantine caso a empresa permita personalização. Portanto, evite pintar botões "na força" (hardcode).
**Basta utilizar:**
```tsx
<Badge color={empresa?.corPrimaria ? 'company-primary' : 'blue'}>
    Ativo
</Badge>

<Button color={empresa?.corPrimaria ? 'company-primary' : 'blue'}>
    Salvar
</Button>
```

### Gradientes e Backgrounds Manuais (Tailwind/CSS-in-JS)
Se você precisar fazer um fundo completo puxando para a cor sólida ou um efeito degrade, não use `var(--mantine-color-blue-6)`. Puxe do objeto e use Color-Mixer nativo de JS/CSS para fabricar a tonalidade escura sem depender do Mantine:
```tsx
style={{
    background: empresa?.corPrimaria
                ? `linear-gradient(135deg, ${empresa.corPrimaria} 0%, color-mix(in srgb, ${empresa.corPrimaria} 70%, black) 100%)`
                : 'linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-indigo-7) 100%)',
}}
```

## 4. Renderizando Logos e Favicons
- **Cabecalhos (Header) e Menus Largos:** Utilize a propriedade global `empresa.logoUrl`. Sempre confira se possuí um height fixo (`ex: h={40}`) e maxWidth para não expandir as barras superiores e quebrar a tela.
- **Sidebars e Cards Quadrados:** Utilize `empresa.faviconUrl` (ou no `localStorage` `sincla_tenant_favicon` via `auth.ts`). A renderização do Favicon previne o achatamento e melhora a clareza a leitura em componentes onde só há espaço para um Ícone SVG ou Imagem (32x32px).
- **Sem favicon ou sem logo?** Sempre tenha um Fallback. Use o componente estético visual do Prédio `<IconBuilding />`.

## 5. Implementação de Evolução Futura (`@sincla/theme`)
Eventualmente, as lógicas de leitura do fallback ('company-primary' vs 'blue') serão generalizadas em uma única string através do pacote auxiliar `@sincla/theme` que será criado, e o desenvolvedor precisará apenas especificar `color="primary"` para que os componentes absorvam os tokens instantaneamente.
