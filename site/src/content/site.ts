export const SITE = {
  name: 'Sincla',
  tagline: 'RH, vagas e treinamento no mesmo lugar.',
  description:
    'Plataforma integrada de gestão de pessoas, atração de talentos com triagem inteligente e treinamento corporativo — um cadastro, três soluções.',
  signupUrl: 'https://app.sincla.com.br/cadastro',
  loginUrl: 'https://app.sincla.com.br/login',
  hubUrl: 'https://app.sincla.com.br',
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999',
  meetingWebhookUrl: import.meta.env.VITE_MEETING_WEBHOOK_URL || '',
  launchBadge: 'Plataforma em lançamento',
} as const;

export const TRUST_ITEMS = [
  'Um cadastro para RH, vagas e treinamento',
  'Teste grátis · sem cartão de crédito',
  'Integração nativa entre os módulos',
  'Suporte humano em português',
] as const;

export const HOW_IT_WORKS_STEPS = [
  {
    number: 1,
    title: 'Crie sua conta',
    description: 'Nome, e-mail e WhatsApp. Leva cerca de 2 minutos.',
  },
  {
    number: 2,
    title: 'Cadastre a empresa',
    description: 'Informe o CNPJ e os dados principais são preenchidos automaticamente.',
  },
  {
    number: 3,
    title: 'Ative o que precisa',
    description: 'RH, Recrutamento ou EAD — ative com um clique, sem repetir cadastro.',
  },
] as const;
