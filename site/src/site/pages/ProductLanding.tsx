import { useParams, Navigate } from 'react-router-dom';
import { Container, Title, Text, Button, Group, Box, SimpleGrid, Card, ThemeIcon, Accordion, Stack } from '@mantine/core';
import { 
    IconArrowRight, 
    IconUsers, 
    IconBriefcase, 
    IconBrain,
    IconChartBar,
    IconRocket,
    IconShieldLock,
    IconSchool,
    IconAward
} from '@tabler/icons-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { ProductVideoPlayer } from '../components/common/ProductVideoPlayer';
import classes from './ProductLanding.module.css';

// Dados dinâmicos de cada produto
const PRODUCTS_DATA = {
    rh: {
        id: 'rh',
        title: 'Sincla RH',
        color: '#0066CC',
        bgColor: 'rgba(0, 102, 204, 0.08)',
        badge: 'Gestão de Pessoas Focada em Poucos Cliques',
        headline: 'Chega de sistemas complexos',
        subheadline: 'e processos cheios de cliques',
        description: 'Idealizado por um especialista que viveu na pele a frustração de dezenas de implantações engessadas e parametrizadas, o Sincla RH foi projetado do zero para funcionar com cliques mínimos. Um sistema simples, fluido e prático que se integra de forma invisível no dia a dia da equipe.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder de vídeo
        ctaText: 'Começar com Sincla RH',
        signupUrl: 'https://app.sincla.com.br/cadastro?module=rh',
        benefits: [
            {
                icon: IconUsers,
                title: 'Gestão, Feedbacks e Advertências',
                description: 'Gerencie colaboradores de forma descomplicada, registre feedbacks contínuos e emita advertências rápidas sem sair da mesma tela.'
            },
            {
                icon: IconAward,
                title: 'Avaliações e PDIs Simplificados',
                description: 'Rode Ciclos de Avaliação de Desempenho 360°, Onboarding e Offboarding em minutos, desaguando em PDIs dinâmicos e focados no crescimento.'
            },
            {
                icon: IconRocket,
                title: 'Metas e Plano de Carreira',
                description: 'Organize as metas de cada equipe e construa planos de carreira flexíveis e transparentes que mantêm todo mundo engajado.'
            }
        ],
        integrationTitle: 'Integração Nativa com o Ecossistema',
        integrationDesc: 'O Sincla RH conversa em tempo real com as outras pontas da sua operação:',
        integrationPoints: [
            {
                icon: IconBriefcase,
                title: 'Admissão Automática com Recrutamento',
                description: 'Assim que o candidato ideal é aprovado no Sincla Recrutamento, a ficha dele é migrada ao RH automaticamente. Zero digitação.'
            },
            {
                icon: IconSchool,
                title: 'Trilhas de Onboarding com EAD',
                description: 'A admissão do novo funcionário realiza a matrícula automática dele nas trilhas de treinamento do Sincla EAD.'
            }
        ],
        faqs: [
            {
                question: 'Quem idealizou o Sincla RH?',
                answer: 'O sistema foi criado por um especialista em gestão de pessoas que, após implantar dezenas de sistemas pesados e parametrizados no mercado, percebeu que o RH precisava de simplicidade. Ele desenhou um sistema focado em cliques mínimos, onde cada ação é concluída rapidamente e sem burocracia.'
            },
            {
                question: 'Quais módulos estão inclusos no Sincla RH?',
                answer: 'A plataforma conta com exatamente 9 módulos integrados: Gestão de Colaboradores, Avaliação de Desempenho, Avaliação de Onboarding e Offboarding, Feedback, Advertência, Pesquisa, PDI (Plano de Desenvolvimento Individual), Meta e Plano de Carreira.'
            },
            {
                question: 'Como é o suporte ao usuário e evolução do sistema?',
                answer: 'A evolução e melhoria do sistema é constante, contando com suporte humanizado e próximo para atender desde um departamento de RH que está iniciando seus processos até estruturas corporativas robustas.'
            }
        ]
    },
    recrutamento: {
        id: 'recrutamento',
        title: 'Sincla Recrutamento',
        color: '#8B5CF6',
        bgColor: 'rgba(139, 92, 246, 0.08)',
        badge: 'Recrutamento & Seleção Inteligente com IA',
        headline: 'Tudo é customizável.',
        subheadline: 'Nada é engessado.',
        description: 'Um sistema de recrutamento e seleção turbinado com inteligência artificial para agilizar seus processos seletivos e automatizar ações de ponta a ponta. Moldado para se adaptar perfeitamente ao fluxo exclusivo do seu negócio.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ctaText: 'Começar com Recrutamento',
        signupUrl: 'https://app.sincla.com.br/cadastro?module=recrutamento',
        benefits: [
            {
                icon: IconRocket,
                title: 'Processos Turbinados com IA',
                description: 'Nossa Inteligência Artificial agiliza a triagem inicial e automatiza ações cruciais, como o envio de feedbacks personalizados aos candidatos.'
            },
            {
                icon: IconBrain,
                title: 'Mapeamento Profiler DISC',
                description: 'Mapeie o comportamento e as competências dos candidatos nativamente no fluxo de inscrição, garantindo precisão técnica e cultural.'
            },
            {
                icon: IconChartBar,
                title: 'Funil 100% Customizável',
                description: 'Defina suas próprias etapas, avaliações e filtros. O Sincla se molda ao seu método de contratação, sem impor regras rígidas.'
            }
        ],
        integrationTitle: 'Como o Recrutamento fecha o ciclo',
        integrationDesc: 'O Sincla Recrutamento abastece e nutre o restante do ecossistema Sincla:',
        integrationPoints: [
            {
                icon: IconUsers,
                title: 'Sincronização imediata de contratados',
                description: 'Os dados do profissional selecionado viram a ficha de colaborador no Sincla RH no mesmo instante em que você fecha a vaga.'
            },
            {
                icon: IconAward,
                title: 'Avaliação técnica integrada no EAD',
                description: 'Hospede testes técnicos ou questionários de avaliação em vídeo diretamente na plataforma EAD durante as fases de triagem.'
            }
        ],
        faqs: [
            {
                question: 'O processo seletivo é engessado?',
                answer: 'Não! No Sincla Recrutamento tudo é customizável e nada é engessado. Você tem liberdade total para desenhar as etapas do funil Kanban, os questionários e os pesos das avaliações de acordo com a sua cultura.'
            },
            {
                question: 'Como a Inteligência Artificial agiliza a seleção?',
                answer: 'A IA otimiza a triagem inicial mapeando a compatibilidade dos candidatos e automatiza a comunicação do processo (como e-mails de feedback e agendamentos), economizando centenas de horas de trabalho manual.'
            },
            {
                question: 'O mapeamento comportamental Profiler DISC está integrado?',
                answer: 'Sim! O Profiler DISC é um recurso nativo do sistema. O candidato preenche o mapeamento de forma fluida e você recebe o relatório de perfil comportamental instantâneo na ficha do candidato.'
            }
        ]
    },
    ead: {
        id: 'ead',
        title: 'Sincla EAD',
        color: '#FF6600',
        bgColor: 'rgba(255, 102, 0, 0.08)',
        badge: 'Treinamento & Universidade Corporativa',
        headline: 'Capacite toda a sua equipe,',
        subheadline: 'sem repetir o mesmo treinamento',
        description: 'Livre-se do retrabalho e da lentidão de treinar novos colaboradores de forma manual. Crie universidade corporativa ágil, monte trilhas de desenvolvimento e emita certificados automatizados.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ctaText: 'Começar com Sincla EAD',
        signupUrl: 'https://app.sincla.com.br/cadastro?module=ead',
        benefits: [
            {
                icon: IconSchool,
                title: 'Treinamento Descomplicado',
                description: 'Suba vídeos, insira materiais de apoio em PDF e crie avaliações de fixação de forma simples e direta.'
            },
            {
                icon: IconAward,
                title: 'Certificações que Rodam Sozinhas',
                description: 'Assim que o colaborador atinge a pontuação necessária, o certificado de conclusão digital é emitido automaticamente.'
            },
            {
                icon: IconShieldLock,
                title: 'Trilhas por Cargo ou Equipe',
                description: 'Organize jornadas de aprendizado específicas para cada área do seu negócio, controlando acessos de forma automática.'
            }
        ],
        integrationTitle: 'A força da unificação com EAD',
        integrationDesc: 'O treinamento corporativo no Sincla EAD conecta-se diretamente com o ciclo operacional:',
        integrationPoints: [
            {
                icon: IconUsers,
                title: 'Matrícula automática de admissão',
                description: 'A admissão de um funcionário no Sincla RH realiza a matrícula dele na trilha obrigatória de integração de forma automática.'
            },
            {
                icon: IconChartBar,
                title: 'Atualização do prontuário do colaborador',
                description: 'A conclusão de treinamentos e as certificações são anexadas ao histórico profissional do colaborador no Sincla RH.'
            }
        ],
        faqs: [
            {
                question: 'Como funciona a integração com o RH?',
                answer: 'A integração é total. Quando você admite um colaborador no Sincla RH, o sistema sincroniza os dados e realiza a matrícula dele na trilha correspondente de integração automaticamente, sem intervenção humana.'
            },
            {
                question: 'Posso usar a plataforma para comercializar cursos?',
                answer: 'Sim! O Sincla EAD possui suporte tanto para universidade corporativa interna (treinamento de equipes) quanto para venda de infoprodutos com controle de acesso e segurança de conteúdo.'
            },
            {
                question: 'Quais formatos de arquivos posso subir na plataforma?',
                answer: 'A plataforma suporta vídeos diretos ou via links do Vimeo/YouTube, documentos em PDF, arquivos de apresentação de slides, links externos e questionários dinâmicos de múltipla escolha.'
            }
        ]
    }
};

export function ProductLanding({ overrideSlug }: { overrideSlug?: string }) {
    const { slug: paramSlug } = useParams<{ slug: string }>();
    const slug = overrideSlug || paramSlug;

    // Redirecionar para home caso o slug não seja válido
    const productKey = slug?.toLowerCase();
    if (!productKey || !(productKey in PRODUCTS_DATA)) {
        return <Navigate to="/" replace />;
    }

    const data = PRODUCTS_DATA[productKey as keyof typeof PRODUCTS_DATA];

    return (
        <div style={{ background: 'var(--bg-dark, #0a0a0f)', color: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />

            <main style={{ flex: 1 }} className="animate-fade-in" key={productKey}>
                {/* Hero Section */}
                <section className={classes.heroSection}>
                    <Container size="xl" className={classes.heroContainer}>
                        <div className={classes.heroContent}>
                            <Box className={classes.badge} style={{ borderColor: `${data.color}40`, color: data.color }}>
                                <Text size="xs" fw={600} tt="uppercase" lts={0.5}>
                                    {data.badge}
                                </Text>
                            </Box>
                            <Title order={1} className={classes.title}>
                                {data.headline}
                                <br />
                                <span className={classes.highlight} style={{ '--highlight-color': data.color } as React.CSSProperties}>
                                    {data.subheadline}
                                </span>
                            </Title>
                            <Text className={classes.subtitle}>
                                {data.description}
                            </Text>
                            <Group gap="md" mt={40} className={classes.ctaGroup}>
                                <Button
                                    component="a"
                                    href={data.signupUrl}
                                    size="lg"
                                    radius="xl"
                                    style={{ background: data.color }}
                                    className={classes.primaryCta}
                                >
                                    {data.ctaText}
                                </Button>
                                <Button
                                    component="a"
                                    href="#recursos"
                                    size="lg"
                                    variant="subtle"
                                    color="gray"
                                    radius="xl"
                                    className={classes.secondaryCta}
                                >
                                    Ver Recursos
                                </Button>
                            </Group>
                        </div>

                        {/* Área do Player de Vídeo em Destaque */}
                        <div className={classes.videoWrapper}>
                            <ProductVideoPlayer 
                                videoUrl={data.videoUrl}
                                productColor={data.color}
                                productName={data.title}
                            />
                        </div>
                    </Container>
                </section>

                {/* Recursos / Benefícios */}
                <section className={classes.benefitsSection} id="recursos">
                    <Container size="xl">
                        <Stack align="center" gap="md" mb={60}>
                            <Title order={2} ta="center" className={classes.sectionTitle}>
                                Recursos para impulsionar{' '}
                                <span className={classes.gradient} style={{ '--gradient-color': data.color } as React.CSSProperties}>
                                    sua produtividade
                                </span>
                            </Title>
                            <Text className={classes.sectionSubtitle} ta="center">
                                Projetado para eliminar tarefas manuais e focar no que realmente importa.
                            </Text>
                        </Stack>

                        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                            {data.benefits.map((benefit, idx) => (
                                <Card key={idx} className={classes.benefitCard}>
                                    <ThemeIcon
                                        size={48}
                                        radius="md"
                                        style={{ background: `${data.color}15`, color: data.color }}
                                        mb="md"
                                    >
                                        <benefit.icon size={24} stroke={1.5} />
                                    </ThemeIcon>
                                    <Text fw={700} size="lg" mb="xs" className={classes.cardTitle}>
                                        {benefit.title}
                                    </Text>
                                    <Text size="sm" className={classes.cardDescription}>
                                        {benefit.description}
                                    </Text>
                                </Card>
                            ))}
                        </SimpleGrid>
                    </Container>
                </section>

                {/* Integração com Ecossistema */}
                <section className={classes.integrationSection}>
                    <Container size="md" className={classes.integrationContainer}>
                        <Card className={classes.integrationCard} style={{ '--border-color': `${data.color}25` } as React.CSSProperties}>
                            <Title order={3} ta="center" mb="sm" className={classes.integrationTitle}>
                                {data.integrationTitle}
                            </Title>
                            <Text size="sm" ta="center" className={classes.integrationSubtitle} mb={40}>
                                {data.integrationDesc}
                            </Text>

                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
                                {data.integrationPoints.map((point, idx) => (
                                    <Box key={idx} className={classes.integrationPoint}>
                                        <Group align="flex-start" gap="md">
                                            <ThemeIcon size={36} radius="xl" style={{ background: data.color, color: '#ffffff' }}>
                                                <point.icon size={18} />
                                            </ThemeIcon>
                                            <Box flex={1}>
                                                <Text fw={600} size="sm" mb={4} className={classes.pointTitle}>
                                                    {point.title}
                                                </Text>
                                                <Text size="xs" className={classes.pointDescription}>
                                                    {point.description}
                                                </Text>
                                            </Box>
                                        </Group>
                                    </Box>
                                ))}
                            </SimpleGrid>
                        </Card>
                    </Container>
                </section>

                {/* FAQ */}
                <section className={classes.faqSection}>
                    <Container size="md">
                        <Title order={2} ta="center" mb={40} className={classes.sectionTitle}>
                            Perguntas Frequentes
                        </Title>
                        <Accordion variant="separated" className={classes.accordion}>
                            {data.faqs.map((faq, idx) => (
                                <Accordion.Item key={idx} value={`faq-${idx}`} className={classes.accordionItem}>
                                    <Accordion.Control className={classes.accordionControl}>
                                        {faq.question}
                                    </Accordion.Control>
                                    <Accordion.Panel className={classes.accordionPanel}>
                                        <Text size="sm" className={classes.accordionAnswer}>
                                            {faq.answer}
                                        </Text>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    </Container>
                </section>

                {/* CTA Final */}
                <section className={classes.ctaBannerSection}>
                    <Container size="md" className={classes.ctaContainer}>
                        <Card className={classes.ctaCard}>
                            <Title order={2} className={classes.ctaTitle}>
                                Pronto para rodar seu módulo de {data.title}?
                            </Title>
                            <Text className={classes.ctaSubtitle} mb="xl">
                                Ative sua conta gratuita em menos de 2 minutos. Sem burocracia, sem compromissos.
                            </Text>
                            <Button
                                component="a"
                                href={data.signupUrl}
                                size="lg"
                                radius="xl"
                                style={{ background: data.color }}
                                rightSection={<IconArrowRight size={18} />}
                                className={classes.ctaButton}
                            >
                                Iniciar agora de graça
                            </Button>
                        </Card>
                    </Container>
                </section>
            </main>

            <Footer />
        </div>
    );
}
