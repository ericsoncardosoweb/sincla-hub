import { Container, Title, Text, Stack, Card, Group, Box, Button, Badge, SimpleGrid, ThemeIcon, List } from '@mantine/core';
import { IconBuilding, IconUsers, IconDiscount, IconCheck, IconArrowRight } from '@tabler/icons-react';
import classes from './Enterprise.module.css';

const benefits = [
    {
        icon: IconUsers,
        title: 'Gestão Unificada',
        description: 'Gerencie todos os acessos dos colaboradores em um único painel administrativo.',
    },
    {
        icon: IconDiscount,
        title: '50% de Desconto',
        description: 'Ferramentas pessoais (Bolso e Agenda) com 50% de desconto para colaboradores.',
    },
    {
        icon: IconBuilding,
        title: 'Pacotes Combinados',
        description: 'Combine RH + EAD + Intranet com descontos progressivos.',
    },
];

const enterpriseFeatures = [
    'Painel administrativo centralizado',
    'Gestão de licenças por colaborador',
    'Faturamento consolidado',
    'Suporte prioritário 24/7',
    'Onboarding personalizado',
    'Integrações com sistemas internos',
    'Relatórios de uso e engajamento',
    'SLA garantido de 99.9%',
];

export function Enterprise() {
    return (
        <section className={classes.section} id="empresas">
            <Container size="xl">
                <Stack align="center" gap="lg" mb={60}>
                    <Badge size="lg" variant="light" color="orange">
                        Para Empresas
                    </Badge>
                    <Title order={2} ta="center" className={classes.title}>
                        Potencialize sua{' '}
                        <span className={classes.gradient}>empresa</span>
                    </Title>
                    <Text size="lg" c="dimmed" ta="center" maw={600}>
                        Libere o potencial da sua equipe com nossas ferramentas integradas.
                        Descontos exclusivos para colaboradores em ferramentas pessoais.
                    </Text>
                </Stack>

                {/* Benefits Grid */}
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mb={60}>
                    {benefits.map((benefit) => (
                        <Card key={benefit.title} className={classes.benefitCard}>
                            <ThemeIcon
                                size={50}
                                radius="xl"
                                variant="gradient"
                                gradient={{ from: '#ff8c00', to: '#ff6600', deg: 135 }}
                                mb="md"
                            >
                                <benefit.icon size={24} />
                            </ThemeIcon>
                            <Text fw={700} size="lg" mb="xs">{benefit.title}</Text>
                            <Text size="sm" c="dimmed">{benefit.description}</Text>
                        </Card>
                    ))}
                </SimpleGrid>

                {/* Enterprise CTA Card */}
                <Card className={classes.ctaCard}>
                    <Group justify="space-between" align="flex-start" wrap="wrap" gap="xl">
                        <Box maw={500}>
                            <Badge color="orange" mb="md">Plano Enterprise</Badge>
                            <Title order={3} mb="sm">Tudo que sua empresa precisa</Title>
                            <Text c="dimmed" mb="lg">
                                Acesse todas as plataformas Sincla com condições especiais,
                                suporte dedicado e funcionalidades exclusivas.
                            </Text>
                            <List
                                spacing="xs"
                                icon={
                                    <ThemeIcon size={20} radius="xl" color="orange">
                                        <IconCheck size={12} stroke={3} />
                                    </ThemeIcon>
                                }
                            >
                                {enterpriseFeatures.slice(0, 4).map((feature, idx) => (
                                    <List.Item key={idx}>
                                        <Text size="sm" c="dimmed">{feature}</Text>
                                    </List.Item>
                                ))}
                            </List>
                        </Box>

                        <Stack gap="md" align="flex-start">
                            <Box className={classes.priceBox}>
                                <Text size="sm" c="dimmed">A partir de</Text>
                                <Group gap="xs" align="baseline">
                                    <Text className={classes.price}>R$</Text>
                                    <Text className={classes.priceValue}>997</Text>
                                    <Text size="sm" c="dimmed">/mês</Text>
                                </Group>
                                <Text size="xs" c="dimmed">Para até 50 colaboradores</Text>
                            </Box>
                            <Button
                                size="lg"
                                variant="gradient"
                                gradient={{ from: '#ff8c00', to: '#ff6600', deg: 90 }}
                                rightSection={<IconArrowRight size={18} />}
                                className={classes.ctaButton}
                            >
                                Falar com Consultor
                            </Button>
                            <Text size="xs" c="dimmed">
                                Sem compromisso, resposta em até 24h
                            </Text>
                        </Stack>
                    </Group>
                </Card>
            </Container>
        </section>
    );
}
