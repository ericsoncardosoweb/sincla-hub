import { useState } from 'react';
import { Container, Title, Text, Box, Group, Button, UnstyledButton } from '@mantine/core';
import {
    IconArrowRight,
    IconCheckbox,
    IconChartBar,
    IconClock,
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
        headline: 'Simplifique a gestão da sua equipe',
        description:
            'Centralize informações de colaboradores, automatize processos de RH e acompanhe métricas importantes para tomada de decisão estratégica.',
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
            { icon: <IconFileText size={20} />, title: 'Onboarding de funcionários' },
            { icon: <IconChartBar size={20} />, title: 'Avaliação de desempenho' },
            { icon: <IconCheckbox size={20} />, title: 'Controle de ponto' },
        ],
    },
    {
        id: 'agenda',
        tab: 'Agendamentos',
        logo: '/logos/sincla-agenda.svg',
        color: '#f59e0b',
        bgColor: '#f59e0b',
        headline: 'Organize sua agenda com inteligência',
        description:
            'Gerencie agendamentos, evite conflitos de horários e ofereça uma experiência de marcação simples para seus clientes.',
        linkText: 'Saiba mais sobre Agenda',
        mockupTitle: 'Calendário Semanal',
        mockupContent: (
            <Box className={classes.mockupCalendar}>
                <Group gap={4} className={classes.calendarHeader}>
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map((day) => (
                        <Box key={day} className={classes.calendarDay}>{day}</Box>
                    ))}
                </Group>
                <Box className={classes.calendarGrid}>
                    <Box className={classes.calendarEvent} style={{ background: 'rgba(16, 185, 129, 0.2)', borderLeft: '3px solid #10b981', gridColumn: '1', gridRow: '1' }}>
                        <Text size="xs" fw={500}>09:00 - Reunião</Text>
                    </Box>
                    <Box className={classes.calendarEvent} style={{ background: 'rgba(139, 92, 246, 0.2)', borderLeft: '3px solid #8b5cf6', gridColumn: '2', gridRow: '2' }}>
                        <Text size="xs" fw={500}>14:00 - Cliente</Text>
                    </Box>
                    <Box className={classes.calendarEvent} style={{ background: 'rgba(0, 135, 255, 0.2)', borderLeft: '3px solid #0087ff', gridColumn: '4', gridRow: '1' }}>
                        <Text size="xs" fw={500}>10:00 - Consulta</Text>
                    </Box>
                    <Box className={classes.calendarEvent} style={{ background: 'rgba(245, 158, 11, 0.2)', borderLeft: '3px solid #f59e0b', gridColumn: '5', gridRow: '3' }}>
                        <Text size="xs" fw={500}>16:00 - Entrega</Text>
                    </Box>
                </Box>
            </Box>
        ),
        templates: [
            { icon: <IconClock size={20} />, title: 'Agenda de consultas' },
            { icon: <IconCheckbox size={20} />, title: 'Reserva de salas' },
            { icon: <IconFileText size={20} />, title: 'Agendamento online' },
        ],
    },
    {
        id: 'ead',
        tab: 'Treinamentos',
        logo: '/logos/sincla-ead.svg',
        color: '#FF6600',
        bgColor: '#FF6600',
        headline: 'Capacite sua equipe de forma escalável',
        description:
            'Crie cursos, acompanhe o progresso dos alunos e certifique colaboradores com uma plataforma completa de ensino a distância.',
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
    {
        id: 'bolso',
        tab: 'Finanças',
        logo: '/logos/sincla-bolso.svg',
        color: '#10b981',
        bgColor: '#10b981',
        headline: 'Controle financeiro descomplicado',
        description:
            'Gerencie receitas, despesas e fluxo de caixa com relatórios visuais que facilitam o entendimento da saúde financeira do negócio.',
        linkText: 'Saiba mais sobre Bolso',
        mockupTitle: 'Visão Financeira',
        mockupContent: (
            <Box className={classes.mockupFinance}>
                <Group gap="md" mb="md">
                    <Box className={classes.financeCard} style={{ borderTop: '3px solid #10b981' }}>
                        <Text size="xs" c="dimmed">Receitas</Text>
                        <Text size="lg" fw={700} style={{ color: '#10b981' }}>R$ 45.200</Text>
                    </Box>
                    <Box className={classes.financeCard} style={{ borderTop: '3px solid #ef4444' }}>
                        <Text size="xs" c="dimmed">Despesas</Text>
                        <Text size="lg" fw={700} style={{ color: '#ef4444' }}>R$ 28.100</Text>
                    </Box>
                </Group>
                <Box className={classes.financeChart}>
                    <Box className={classes.chartBar} style={{ height: '60%', background: '#10b981' }} />
                    <Box className={classes.chartBar} style={{ height: '80%', background: '#10b981' }} />
                    <Box className={classes.chartBar} style={{ height: '45%', background: '#10b981' }} />
                    <Box className={classes.chartBar} style={{ height: '90%', background: '#10b981' }} />
                    <Box className={classes.chartBar} style={{ height: '70%', background: '#10b981' }} />
                </Box>
            </Box>
        ),
        templates: [
            { icon: <IconChartBar size={20} />, title: 'Fluxo de caixa' },
            { icon: <IconFileText size={20} />, title: 'Contas a pagar/receber' },
            { icon: <IconCheckbox size={20} />, title: 'Conciliação bancária' },
        ],
    },
    {
        id: 'leads',
        tab: 'Vendas & CRM',
        logo: '/logos/sincla-leads.svg',
        color: '#DC2626',
        bgColor: '#DC2626',
        headline: 'Converta mais leads em clientes',
        description:
            'Acompanhe seu funil de vendas, gerencie relacionamentos com clientes e nunca perca uma oportunidade de negócio.',
        linkText: 'Saiba mais sobre Leads',
        mockupTitle: 'Funil de Vendas',
        mockupContent: (
            <Box className={classes.mockupFunnel}>
                <Box className={classes.funnelStage}>
                    <Box className={classes.funnelBar} style={{ width: '100%', background: 'rgba(0, 135, 255, 0.2)' }}>
                        <Text size="xs" fw={500}>Prospecção</Text>
                        <Text size="xs" fw={700}>45</Text>
                    </Box>
                </Box>
                <Box className={classes.funnelStage}>
                    <Box className={classes.funnelBar} style={{ width: '75%', background: 'rgba(139, 92, 246, 0.2)' }}>
                        <Text size="xs" fw={500}>Qualificação</Text>
                        <Text size="xs" fw={700}>32</Text>
                    </Box>
                </Box>
                <Box className={classes.funnelStage}>
                    <Box className={classes.funnelBar} style={{ width: '50%', background: 'rgba(245, 158, 11, 0.2)' }}>
                        <Text size="xs" fw={500}>Proposta</Text>
                        <Text size="xs" fw={700}>18</Text>
                    </Box>
                </Box>
                <Box className={classes.funnelStage}>
                    <Box className={classes.funnelBar} style={{ width: '30%', background: 'rgba(16, 185, 129, 0.2)' }}>
                        <Text size="xs" fw={500}>Fechamento</Text>
                        <Text size="xs" fw={700}>8</Text>
                    </Box>
                </Box>
            </Box>
        ),
        templates: [
            { icon: <IconBriefcase size={20} />, title: 'Pipeline de vendas' },
            { icon: <IconFileText size={20} />, title: 'Gestão de contatos' },
            { icon: <IconChartBar size={20} />, title: 'Relatório de conversão' },
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
