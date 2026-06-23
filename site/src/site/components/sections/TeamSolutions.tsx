import { useState } from 'react';
import { Container, Title, Text, Box, Group, Button, UnstyledButton } from '@mantine/core';
import {
    IconArrowRight,
    IconCheckbox,
    IconChartBar,
    IconFileText,
    IconSchool,
    IconBriefcase,
} from '@tabler/icons-react';
import classes from './TeamSolutions.module.css';

interface Template {
    icon: React.ReactNode;
    title: string;
}

interface Solution {
    id: string;
    tab: string;
    logo: string;
    color: string;
    bgColor: string;
    headline: string;
    description: string;
    linkText: string;
    mockupTitle: string;
    mockupContent: React.ReactNode;
    templates: Template[];
}

const solutions: Solution[] = [
    {
        id: 'rh',
        tab: 'Gestão de Pessoas',
        logo: '/logos/sincla-rh.svg',
        color: '#0066CC',
        bgColor: '#0066CC',
        headline: 'Gestão de pessoas simples, intuitiva e sem complicação',
        description:
            'Idealizado por um especialista que viveu na pele as dificuldades de implantações tradicionais engessadas, o Sincla RH foi criado para funcionar com poucos cliques, tornando as rotinas do RH parte natural do dia a dia da equipe.',
        linkText: 'Saiba mais sobre RH',
        mockupTitle: 'Painel de Colaboradores',
        mockupContent: (
            <Box className={classes.mockupTable}>
                <Box className={classes.mockupRow}>
                    <Box className={classes.mockupAvatar} style={{ background: '#10b981' }} />
                    <Box>
                        <Text size="sm" fw={500}>Maria Silva</Text>
                        <Text size="xs" c="dimmed">Desenvolvedora Senior</Text>
                    </Box>
                    <Box className={classes.mockupBadge} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Ativo</Box>
                </Box>
                <Box className={classes.mockupRow}>
                    <Box className={classes.mockupAvatar} style={{ background: '#8b5cf6' }} />
                    <Box>
                        <Text size="sm" fw={500}>João Santos</Text>
                        <Text size="xs" c="dimmed">Designer UX</Text>
                    </Box>
                    <Box className={classes.mockupBadge} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>Ativo</Box>
                </Box>
                <Box className={classes.mockupRow}>
                    <Box className={classes.mockupAvatar} style={{ background: '#f59e0b' }} />
                    <Box>
                        <Text size="sm" fw={500}>Ana Costa</Text>
                        <Text size="xs" c="dimmed">Product Manager</Text>
                    </Box>
                    <Box className={classes.mockupBadge} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>Férias</Box>
                </Box>
            </Box>
        ),
        templates: [
            { icon: <IconFileText size={20} />, title: 'Avaliações de Desempenho & Clima' },
            { icon: <IconChartBar size={20} />, title: 'Planos de Desenvolvimento (PDI)' },
            { icon: <IconCheckbox size={20} />, title: 'Feedbacks & Plano de Carreira' },
        ],
    },
    {
        id: 'recrutamento',
        tab: 'Recrutamento',
        logo: '/logos/sincla-recrutamento.svg',
        color: '#8B5CF6',
        bgColor: '#8B5CF6',
        headline: 'Tudo é customizável. Nada é engessado.',
        description:
            'Uma tecnologia de Recrutamento & Seleção turbinada com inteligência artificial para agilizar os seus processos e automatizar a triagem e comunicação de feedbacks de ponta a ponta.',
        linkText: 'Saiba mais sobre Recrutamento',
        mockupTitle: 'Vagas & Candidatos em Destaque',
        mockupContent: (
            <Box className={classes.mockupTable}>
                <Box className={classes.mockupRow}>
                    <Box className={classes.mockupAvatar} style={{ background: '#0087ff' }} />
                    <Box>
                        <Text size="sm" fw={500}>Bruno Souza</Text>
                        <Text size="xs" c="dimmed">Desenvolvedor React</Text>
                    </Box>
                    <Box className={classes.mockupBadge} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>95% Match</Box>
                </Box>
                <Box className={classes.mockupRow}>
                    <Box className={classes.mockupAvatar} style={{ background: '#f59e0b' }} />
                    <Box>
                        <Text size="sm" fw={500}>Carla Dias</Text>
                        <Text size="xs" c="dimmed">Designer UX</Text>
                    </Box>
                    <Box className={classes.mockupBadge} style={{ background: 'rgba(0, 135, 255, 0.1)', color: '#0087ff' }}>88% Match</Box>
                </Box>
                <Box className={classes.mockupRow}>
                    <Box className={classes.mockupAvatar} style={{ background: '#ec4899' }} />
                    <Box>
                        <Text size="sm" fw={500}>Diego Ramos</Text>
                        <Text size="xs" c="dimmed">Product Manager</Text>
                    </Box>
                    <Box className={classes.mockupBadge} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>72% Match</Box>
                </Box>
            </Box>
        ),
        templates: [
            { icon: <IconBriefcase size={20} />, title: 'Triagem inteligente com IA' },
            { icon: <IconChartBar size={20} />, title: 'Match comportamental (Profiler DISC)' },
            { icon: <IconCheckbox size={20} />, title: 'Funil Kanban 100% customizável' },
        ],
    },
    {
        id: 'ead',
        tab: 'Treinamentos',
        logo: '/logos/sincla-ead.svg',
        color: '#FF6600',
        bgColor: '#FF6600',
        headline: 'Capacite sua equipe de forma escalável e automática',
        description:
            'Crie cursos, monte trilhas de desenvolvimento e emita certificados integrados de forma direta ao prontuário do colaborador no RH, sem retrabalho.',
        linkText: 'Saiba mais sobre EAD',
        mockupTitle: 'Progresso dos Cursos',
        mockupContent: (
            <Box className={classes.mockupCourses}>
                <Box className={classes.courseItem}>
                    <Text size="sm" fw={500}>Onboarding Corporativo</Text>
                    <Box className={classes.progressBar}>
                        <Box className={classes.progressFill} style={{ width: '85%', background: '#10b981' }} />
                    </Box>
                    <Text size="xs" c="dimmed">85% concluído</Text>
                </Box>
                <Box className={classes.courseItem}>
                    <Text size="sm" fw={500}>Segurança da Informação</Text>
                    <Box className={classes.progressBar}>
                        <Box className={classes.progressFill} style={{ width: '60%', background: '#8b5cf6' }} />
                    </Box>
                    <Text size="xs" c="dimmed">60% concluído</Text>
                </Box>
                <Box className={classes.courseItem}>
                    <Text size="sm" fw={500}>Liderança e Gestão</Text>
                    <Box className={classes.progressBar}>
                        <Box className={classes.progressFill} style={{ width: '30%', background: '#0087ff' }} />
                    </Box>
                    <Text size="xs" c="dimmed">30% concluído</Text>
                </Box>
            </Box>
        ),
        templates: [
            { icon: <IconSchool size={20} />, title: 'Trilha de aprendizado' },
            { icon: <IconCheckbox size={20} />, title: 'Certificação interna' },
            { icon: <IconChartBar size={20} />, title: 'Relatório de progresso' },
        ],
    },
];

export function TeamSolutions() {
    const [activeTab, setActiveTab] = useState('rh');
    const activeSolution = solutions.find((s) => s.id === activeTab) || solutions[0];

    return (
        <section className={classes.teamSolutions}>
            <Container size="xl">
                {/* Section Title */}
                <Title order={2} ta="center" className={classes.sectionTitle}>
                    Capacitar todos, em todas as equipes
                </Title>

                {/* Tabs */}
                <Group justify="center" gap={8} className={classes.tabs} wrap="wrap">
                    {solutions.map((solution) => (
                        <UnstyledButton
                            key={solution.id}
                            className={`${classes.tab} ${activeTab === solution.id ? classes.tabActive : ''}`}
                            onClick={() => setActiveTab(solution.id)}
                            style={
                                activeTab === solution.id
                                    ? { borderColor: solution.color }
                                    : undefined
                            }
                        >
                            {solution.tab}
                        </UnstyledButton>
                    ))}
                </Group>

                {/* Content */}
                <Box className={classes.content}>
                    <Group align="flex-start" gap={60} wrap="wrap">
                        {/* Text Side */}
                        <Box className={classes.textSide}>
                            <Title order={3} className={classes.headline}>
                                {activeSolution.headline}
                            </Title>
                            <Text className={classes.description}>
                                {activeSolution.description}
                            </Text>
                            <Button
                                variant="subtle"
                                color="blue"
                                rightSection={<IconArrowRight size={16} />}
                                className={classes.link}
                                p={0}
                            >
                                {activeSolution.linkText}
                            </Button>
                        </Box>

                        {/* Mockup Side */}
                        <Box className={classes.mockupSide}>
                            <Box
                                className={classes.mockupWrapper}
                                style={{ '--accent-color': activeSolution.color } as React.CSSProperties}
                            >
                                {/* Decorative shapes */}
                                <Box
                                    className={classes.decorShape1}
                                    style={{ background: activeSolution.bgColor }}
                                />
                                <Box
                                    className={classes.decorShape2}
                                    style={{ background: activeSolution.bgColor }}
                                />

                                {/* Logo badge */}
                                <Box
                                    className={classes.iconBadge}
                                    style={{ background: activeSolution.color }}
                                >
                                    <img
                                        src={activeSolution.logo}
                                        alt=""
                                        style={{
                                            width: 24,
                                            height: 24,
                                            objectFit: 'contain',
                                            filter: 'brightness(0) invert(1)',
                                        }}
                                    />
                                </Box>

                                {/* Mockup card */}
                                <Box className={classes.mockupCard}>
                                    <Text fw={600} mb="md" className={classes.mockupCardTitle}>
                                        {activeSolution.mockupTitle}
                                    </Text>
                                    {activeSolution.mockupContent}
                                </Box>
                            </Box>
                        </Box>
                    </Group>
                </Box>

                {/* Templates */}
                <Box className={classes.templatesSection}>
                    <Text
                        size="sm"
                        fw={600}
                        tt="uppercase"
                        ta="center"
                        c="dimmed"
                        mb="xl"
                        className={classes.templatesLabel}
                    >
                        Comece com um modelo
                    </Text>
                    <Group justify="center" gap="md" wrap="wrap">
                        {activeSolution.templates.map((template, index) => (
                            <Box key={index} className={classes.templateCard}>
                                <Box
                                    className={classes.templateIcon}
                                    style={{ color: activeSolution.color }}
                                >
                                    {template.icon}
                                </Box>
                                <Text fw={600} size="sm" className={classes.templateTitle}>
                                    {template.title}
                                </Text>
                            </Box>
                        ))}
                    </Group>
                </Box>
            </Container>
        </section>
    );
}
