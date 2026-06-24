export type ProductId = 'rh' | 'recrutamento' | 'ead';

export interface ProductContent {
  id: ProductId;
  slug: ProductId;
  name: string;
  shortName: string;
  color: string;
  tagline: string;
  navDescription: string;
  headline: string;
  subheadline: string;
  description: string;
  signupUrl: string;
  path: string;
  logo: string;
  features: string[];
  templates: string[];
  benefits: { title: string; description: string }[];
  integrationTitle: string;
  integrationDesc: string;
  integrationPoints: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
  meetingIntent: ProductId | 'consultor' | 'unknown';
}

const signupBase = 'https://app.sincla.com.br/cadastro';

export const products: Record<ProductId, ProductContent> = {
  rh: {
    id: 'rh',
    slug: 'rh',
    name: 'Sincla RH',
    shortName: 'RH',
    color: '#0066CC',
    tagline: 'Gestão de pessoas em poucos cliques',
    navDescription: 'Colaboradores, avaliações e PDIs',
    headline: 'Chega de sistemas complexos',
    subheadline: 'e processos cheios de cliques',
    description:
      'Criado por quem viveu implantações engessadas no dia a dia do RH. O Sincla RH reúne colaboradores, avaliações, PDIs, metas e feedbacks em rotinas simples — poucos cliques, sem burocracia.',
    signupUrl: `${signupBase}?module=rh`,
    path: '/rh',
    logo: '/logos/sincla-rh.svg',
    features: [
      'Gestão de colaboradores',
      'Avaliações 360° e ciclos de desempenho',
      'Onboarding e offboarding',
      'Feedbacks e advertências',
      'Pesquisas de clima',
      'PDI e plano de carreira',
      'Metas por equipe',
    ],
    templates: ['Avaliações de desempenho', 'Planos de desenvolvimento (PDI)', 'Feedbacks contínuos'],
    benefits: [
      {
        title: 'Gestão, feedbacks e advertências',
        description:
          'Gerencie colaboradores, registre feedbacks e emita advertências sem sair da mesma tela.',
      },
      {
        title: 'Avaliações e PDIs simplificados',
        description:
          'Rode ciclos de avaliação e onboarding em minutos, com PDIs dinâmicos focados no crescimento.',
      },
      {
        title: 'Metas e plano de carreira',
        description: 'Organize metas por equipe e construa planos de carreira transparentes.',
      },
    ],
    integrationTitle: 'Integração com o ecossistema Sincla',
    integrationDesc: 'O Sincla RH conversa em tempo real com as outras ferramentas:',
    integrationPoints: [
      {
        title: 'Admissão automática com Recrutamento',
        description: 'Candidato aprovado vira colaborador no RH automaticamente. Zero redigitação.',
      },
      {
        title: 'Trilhas de onboarding com EAD',
        description: 'Nova admissão matricula o colaborador nas trilhas de integração do EAD.',
      },
    ],
    faqs: [
      {
        question: 'Quem idealizou o Sincla RH?',
        answer:
          'O sistema foi criado por um especialista em gestão de pessoas que, após implantar dezenas de sistemas pesados, percebeu que o RH precisava de simplicidade — cliques mínimos e rotinas práticas.',
      },
      {
        question: 'Quais módulos estão inclusos?',
        answer:
          'Gestão de Colaboradores, Avaliação de Desempenho, Onboarding/Offboarding, Feedback, Advertência, Pesquisa, PDI, Meta e Plano de Carreira — 9 módulos integrados.',
      },
      {
        question: 'Como funciona o suporte?',
        answer:
          'Evolução contínua do produto com suporte humanizado em português, do RH que está começando até estruturas mais robustas.',
      },
    ],
    meetingIntent: 'rh',
  },
  recrutamento: {
    id: 'recrutamento',
    slug: 'recrutamento',
    name: 'Sincla Recrutamento',
    shortName: 'Recrutamento',
    color: '#7C3AED',
    tagline: 'Vagas e seleção do seu jeito',
    navDescription: 'Triagem inteligente e funil customizável',
    headline: 'Tudo é customizável.',
    subheadline: 'Nada é engessado.',
    description:
      'Plataforma de recrutamento com triagem inteligente, mapeamento comportamental (Profiler DISC) e funil Kanban que se adapta ao processo da sua empresa — não o contrário.',
    signupUrl: `${signupBase}?module=recrutamento`,
    path: '/recrutamento',
    logo: '/logos/sincla-recrutamento.svg',
    features: [
      'Portal de vagas customizado',
      'Triagem inteligente de currículos',
      'Profiler DISC integrado',
      'Funil Kanban personalizável',
      'Feedback automático a candidatos',
      'Banco de talentos',
      'Integração com RH e EAD',
    ],
    templates: ['Triagem com IA', 'Match comportamental (DISC)', 'Funil Kanban customizável'],
    benefits: [
      {
        title: 'Processos mais ágeis',
        description: 'Triagem inicial automatizada e comunicação de feedbacks sem planilhas manuais.',
      },
      {
        title: 'Profiler DISC nativo',
        description: 'Mapeamento comportamental integrado ao fluxo de inscrição do candidato.',
      },
      {
        title: 'Funil 100% customizável',
        description: 'Defina etapas, avaliações e filtros conforme o método da sua empresa.',
      },
    ],
    integrationTitle: 'Como o Recrutamento fecha o ciclo',
    integrationDesc: 'O Sincla Recrutamento alimenta o restante do ecossistema:',
    integrationPoints: [
      {
        title: 'Contratados viram colaboradores no RH',
        description: 'Dados do profissional selecionado migram para o Sincla RH no fechamento da vaga.',
      },
      {
        title: 'Testes técnicos no EAD',
        description: 'Hospede avaliações e questionários na plataforma EAD durante a seleção.',
      },
    ],
    faqs: [
      {
        question: 'O processo seletivo é engessado?',
        answer:
          'Não. Você desenha as etapas do funil, questionários e pesos das avaliações conforme a cultura da sua empresa.',
      },
      {
        question: 'Como a triagem inteligente ajuda?',
        answer:
          'Agiliza a análise inicial de compatibilidade e automatiza comunicações do processo, reduzindo trabalho manual repetitivo.',
      },
      {
        question: 'O Profiler DISC está integrado?',
        answer:
          'Sim. O candidato preenche o mapeamento no fluxo e você recebe o relativo comportamental na ficha.',
      },
    ],
    meetingIntent: 'recrutamento',
  },
  ead: {
    id: 'ead',
    slug: 'ead',
    name: 'Sincla EAD',
    shortName: 'EAD',
    color: '#E85D04',
    tagline: 'Treinamento corporativo integrado',
    navDescription: 'Trilhas, certificados e universidade interna',
    headline: 'Capacite toda a equipe,',
    subheadline: 'sem repetir o mesmo treinamento',
    description:
      'Monte trilhas de aprendizado, emita certificados automáticos e conecte o treinamento ao histórico do colaborador no RH — sem integrações manuais.',
    signupUrl: `${signupBase}?module=ead`,
    path: '/ead',
    logo: '/logos/sincla-ead.svg',
    features: [
      'Cursos com vídeo, PDF e questionários',
      'Trilhas por cargo ou equipe',
      'Certificados automáticos',
      'Universidade corporativa',
      'Relatórios de progresso',
      'Integração com prontuário RH',
    ],
    templates: ['Trilha de integração', 'Certificação interna', 'Relatório de progresso'],
    benefits: [
      {
        title: 'Treinamento descomplicado',
        description: 'Vídeos, PDFs e avaliações de fixação em interface direta e objetiva.',
      },
      {
        title: 'Certificados automáticos',
        description: 'Certificado digital emitido quando o colaborador atinge a pontuação necessária.',
      },
      {
        title: 'Trilhas por cargo ou equipe',
        description: 'Jornadas específicas por área, com acesso controlado automaticamente.',
      },
    ],
    integrationTitle: 'Treinamento conectado ao RH',
    integrationDesc: 'O Sincla EAD faz parte do ciclo operacional:',
    integrationPoints: [
      {
        title: 'Matrícula automática na admissão',
        description: 'Nova admissão no RH matricula o colaborador na trilha de integração.',
      },
      {
        title: 'Histórico no prontuário',
        description: 'Conclusões e certificações aparecem no histórico profissional no RH.',
      },
    ],
    faqs: [
      {
        question: 'Como funciona a integração com o RH?',
        answer:
          'Admissão no RH dispara matrícula na trilha correspondente, sem intervenção manual.',
      },
      {
        question: 'Serve só para treinamento interno?',
        answer:
          'Suporta universidade corporativa interna e também venda de cursos, com controle de acesso.',
      },
      {
        question: 'Quais formatos de conteúdo?',
        answer: 'Vídeos, links Vimeo/YouTube, PDF, slides, links externos e questionários.',
      },
    ],
    meetingIntent: 'ead',
  },
};

export const productList = Object.values(products);

export function getProduct(id: string): ProductContent | undefined {
  return products[id as ProductId];
}
