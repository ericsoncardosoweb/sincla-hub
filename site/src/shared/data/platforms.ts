type PlatformType = 'rh' | 'ead' | 'talento';

interface Platform {
    id: PlatformType;
    name: string;
    tagline: string;
    description: string;
    color: string;
    icon: string;
    logo?: string;
    url: string;
    features: string[];
    isComingSoon?: boolean;
}


export const platforms: Platform[] = [
    {
        id: 'rh',
        name: 'Sincla RH',
        tagline: 'Gestão de RH moderna e prática',
        description: 'Plataforma completa de gestão de recursos humanos com funcionalidades inteligentes e integrada com I.A. Gerencie colaboradores, avaliações de desempenho, pesquisas de clima e muito mais.',
        color: '#0066CC',
        icon: 'users',
        logo: '/logos/sincla-rh.svg',
        url: 'https://rh.sincla.com.br',
        features: [
            'Gestão de colaboradores',
            'Avaliações 360°',
            'Pesquisas de clima',
            'Gestão de competências',
            'Feedbacks contínuos',
            'Intranet corporativa',
            'Onboarding digital',
        ],
    },
    {
        id: 'talento',
        name: 'Sincla Talento',
        tagline: 'Atração e seleção inteligente de talentos',
        description: 'Plataforma completa para atração, seleção e contratação de talentos integrada com inteligência artificial. Divulgue vagas, analise fit cultural (DISC) e gerencie candidatos em um funil Kanban.',
        color: '#8B5CF6',
        icon: 'briefcase',
        logo: '/logos/sincla-talento.svg',
        url: 'https://app.sincla.com.br/talento/',
        features: [
            'Portal de vagas customizado',
            'Match comportamental (DISC)',
            'Funil de candidatos (Kanban)',
            'Triagem por inteligência artificial',
            'Avaliação técnica integrada',
            'Gestão de banco de talentos',
            'Integração com principais portais',
        ],
    },
    {
        id: 'ead',
        name: 'Sincla EAD',
        tagline: 'Cursos e comunidade online',
        description: 'Plataforma de cursos e comunidade online com recursos de I.A. integrados. Perfeito para infoprodutores e empresas que precisam de uma área de treinamento para colaboradores.',
        color: '#FF6600',
        icon: 'book',
        logo: '/logos/sincla-ead.svg',
        url: 'https://ead.sincla.com.br',
        features: [
            'Criação de cursos',
            'Área de membros',
            'Comunidade online',
            'Certificados automáticos',
            'Analytics de engajamento',
            'Gestão de professores',
            'Gamificação',
        ],
    },
];

export const discountRules = {
    subscriber: 0.15, // 15% para assinantes Sincla
    enterprise: 0.50, // 50% para ferramentas pessoais em contas empresariais
};

export const partnerLevels = [
    {
        id: 'bronze',
        name: 'Bronze',
        commission: 10,
        requirements: 'Certificação básica',
        benefits: ['Materiais exclusivos', 'Suporte dedicado'],
    },
    {
        id: 'silver',
        name: 'Prata',
        commission: 15,
        requirements: '5+ clientes ativos',
        benefits: ['Materiais exclusivos', 'Suporte prioritário', 'Webinars VIP'],
    },
    {
        id: 'gold',
        name: 'Ouro',
        commission: 20,
        requirements: '15+ clientes ativos',
        benefits: ['Materiais exclusivos', 'Suporte dedicado', 'Webinars VIP', 'Leads qualificados'],
    },
];
