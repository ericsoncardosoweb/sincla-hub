import { useParams, Navigate } from 'react-router-dom';
import { Container, Title, Text, Button, Group, Box, SimpleGrid, Card, ThemeIcon, Accordion, Stack } from '@mantine/core';
import { 
    IconArrowRight, 
    IconUsers, 
    IconBriefcase, 
    IconClock,
    IconCalendar,
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
        badge: 'Gestão de Pessoas & Operação',
        headline: 'A paz de espírito de um RH',
        subheadline: 'que roda no piloto automático',
        description: 'Esqueça as cobranças manuais de ponto, o caos na planilha de férias e o estresse do fechamento da folha. O Sincla RH automatiza toda a jornada do colaborador em um painel inteligente e centralizado.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder de vídeo
        ctaText: 'Começar com Sincla RH',
        signupUrl: 'https://app.sincla.com.br/cadastro?module=rh',
        benefits: [
            {
                icon: IconClock,
                title: 'Controle de Ponto Eletrônico',
                description: 'Marcação fácil por aplicativo com reconhecimento facial, geolocalização e relatórios prontos para a folha.'
            },
            {
                icon: IconCalendar,
                title: 'Gestão de Férias e Ausências',
                description: 'Colaboradores solicitam folgas de forma digital e você aprova em segundos, sem trocas de e-mails confusas.'
            },
            {
                icon: IconUsers,
                title: 'Onboarding 100% Digital',
                description: 'Colete documentos, envie termos contratuais e integre o novo funcionário sem imprimir um único papel.'
            }
        ],
        integrationTitle: 'Integração Nativa com o Ecossistema',
        integrationDesc: 'O Sincla RH não vive isolado. Ele conversa em tempo real com as outras pontas da sua operação:',
        integrationPoints: [
            {
                icon: IconBriefcase,
                title: 'Admissão em 1 clique com Recrutamento',
                description: 'Assim que o candidato ideal é aprovado no Sincla Recrutamento, a ficha dele é migrada ao RH automaticamente. Zero digitação.'
            },
            {
                icon: IconSchool,
                title: 'Trilhas de Onboarding com EAD',
                description: 'A ativação do novo funcionário dispara a inscrição automática dele nas trilhas de treinamento obrigatórias no Sincla EAD.'
            }
        ],
        faqs: [
            {
                question: 'O ponto do Sincla RH está adequado à legislação?',
                answer: 'Sim, nossa plataforma atende integralmente à portaria 671 do Ministério do Trabalho e Emprego, com relatórios exportáveis e assinaturas digitais seguras.'
            },
            {
                question: 'Posso usar o sistema para empresas de qualquer tamanho?',
                answer: 'Perfeitamente. O Sincla RH atende desde PMEs com 5 funcionários até grandes equipes em crescimento acelerado.'
            },
            {
                question: 'Os colaboradores precisam baixar aplicativos pesados?',
                answer: 'Não. Nosso aplicativo web é extremamente leve, responsivo para qualquer smartphone e pode ser utilizado direto pelo navegador.'
            }
        ]
    },
    recrutamento: {
        id: 'recrutamento',
        title: 'Sincla Recrutamento',
        color: '#8B5CF6',
        bgColor: 'rgba(139, 92, 246, 0.08)',
        badge: 'Atração de Talentos & ATS',
        headline: 'Contrate a pessoa certa,',
        subheadline: 'sem palpites ou arrependimentos',
        description: 'Pare de desperdiçar horas analisando currículos frios que não se alinham à sua cultura. Publique suas vagas nos maiores portais e use IA combinada ao Profiler DISC para identificar talentos perfeitos.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ctaText: 'Começar com Recrutamento',
        signupUrl: 'https://app.sincla.com.br/cadastro?module=recrutamento',
        benefits: [
            {
                icon: IconBrain,
                title: 'Profiler Comportamental DISC',
                description: 'Mapeie o perfil de comportamento de cada candidato antes da entrevista para garantir sinergia absoluta com o time.'
            },
            {
                icon: IconChartBar,
                title: 'Funil Kanban Interativo',
                description: 'Gerencie o andamento de todos os candidatos de forma visual e intuitiva, mudando etapas em um clique.'
            },
            {
                icon: IconRocket,
                title: 'Triagem Automática por IA',
                description: 'Nossa inteligência artificial analisa e classifica os currículos de acordo com os requisitos exigidos pela sua vaga.'
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
                question: 'O que é o Profiler DISC?',
                answer: 'É uma metodologia cientificamente validada que mapeia quatro fatores de perfil comportamental: Dominância, Influência, Estabilidade e Conformidade. Isso reduz em até 80% o turnover (rotatividade de equipe).'
            },
            {
                question: 'Consigo divulgar minhas vagas em outros portais?',
                answer: 'Sim, o Sincla Recrutamento permite integração com os principais agregadores de vagas e redes de talentos do mercado nacional.'
            },
            {
                question: 'Como funciona a triagem por Inteligência Artificial?',
                answer: 'Nossa inteligência artificial analisa a coerência das experiências do candidato com os pré-requisitos definidos para a vaga, atribuindo uma nota de compatibilidade instantânea.'
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
        description: 'Chega de gastar horas de gestores integrando novos colaboradores de forma manual. Crie trilhas de aprendizado interativas, avalie o progresso e emita certificados automáticos.',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ctaText: 'Começar com Sincla EAD',
        signupUrl: 'https://app.sincla.com.br/cadastro?module=ead',
        benefits: [
            {
                icon: IconSchool,
                title: 'Universidade Corporativa ágil',
                description: 'Hospede vídeos, envie materiais complementares em PDF e estruture provas de fixação de forma extremamente fácil.'
            },
            {
                icon: IconAward,
                title: 'Certificados Automatizados',
                description: 'Ao finalizar a trilha de aulas e obter a nota necessária, o colaborador recebe o certificado digital instantâneo.'
            },
            {
                icon: IconShieldLock,
                title: 'Trilhas por Cargo ou Equipe',
                description: 'Configure jornadas de treinamento específicas para o time de Vendas, Suporte ou Técnico, organizando o conhecimento.'
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
                question: 'Quantos alunos posso ter na plataforma?',
                answer: 'Os pacotes se adaptam ao tamanho da sua equipe. Oferecemos opções desde pequenas equipes até universidades corporativas de larga escala.'
            },
            {
                question: 'Posso usar a plataforma para vender cursos online?',
                answer: 'Sim, o Sincla EAD também está preparado para infoprodutores que desejam monetizar seu conhecimento com área de membros e controle de acessos.'
            },
            {
                question: 'A plataforma aceita quais formatos de mídia?',
                answer: 'Você pode subir vídeos diretos, links do Vimeo/YouTube, documentos em PDF, arquivos de slides e montar provas com questionários de múltipla escolha.'
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

            <main style={{ flex: 1 }}>
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
