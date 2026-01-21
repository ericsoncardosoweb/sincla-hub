import { Container, Title, Text, Stack, Card, Group, Box, Button, SimpleGrid, ThemeIcon, List } from '@mantine/core';
import { IconBuilding, IconUsers, IconDiscount, IconCheck, IconArrowRight } from '@tabler/icons-react';
import classes from './Enterprise.module.css';

const benefits = [
    {
        icon: IconUsers,
        title: 'Gestão Unificada',
        description: 'Gerencie todos os acessos em um único painel.',
    },
    {
        icon: IconDiscount,
        title: '50% de Desconto',
        description: 'Ferramentas pessoais com desconto para colaboradores.',
    },
    {
        icon: IconBuilding,
        title: 'Pacotes Combinados',
        description: 'RH + EAD + Intranet com descontos progressivos.',
    },
];

const enterpriseFeatures = [
    'Painel administrativo centralizado',
    'Gestão de licenças por colaborador',
    'Faturamento consolidado',
    'Suporte prioritário 24/7',
];

export function Enterprise() {
    return (
        <section className={classes.section} id="empresas">
            <Container size="xl">
                <Stack align="center" gap="md" mb={60}>
                    <Box className={classes.badge}>
                        <Text size="xs" fw={600} tt="uppercase" lts={0.5}>
                            Para Empresas
                        </Text>
                    </Box>
                    <Title order={2} ta="center" className={classes.title}>
                        Potencialize sua{' '}
                        <span className={classes.gradient}>empresa</span>
                    </Title>
                    <Text className={classes.subtitle} ta="center" maw={500}>
                        Ferramentas integradas para sua equipe, com descontos exclusivos.
                    </Text>
                </Stack>

                {/* Benefits Grid */}
                <SimpleGrid
                    cols={{ base: 1, md: 3 }}
                    spacing="lg"
                    mb={60}
                >
                    {benefits.map((benefit) => (
                        <Card
                            key={benefit.title}
                            className={classes.benefitCard}
                        >
                            <ThemeIcon
                                size={50}
                                radius="xl"
                                variant="gradient"
                                gradient={{ from: '#ff8c00', to: '#ff6600', deg: 135 }}
                                mb="md"
                                className={classes.benefitIcon}
                            >
                                <benefit.icon size={24} />
                            </ThemeIcon>
                            <Text fw={700} size="lg" mb="xs" className={classes.benefitTitle}>
                                {benefit.title}
                            </Text>
                            <Text size="sm" className={classes.benefitDescription}>
                                {benefit.description}
                            </Text>
                        </Card>
                    ))}
                </SimpleGrid>

                {/* Enterprise CTA Card */}
                <Card className={classes.ctaCard}>
                    <Group justify="space-between" align="flex-start" wrap="wrap" gap="xl">
                        <Box maw={480}>
                            <Box className={classes.enterpriseBadge} mb="md">
                                <Text size="xs" fw={600} tt="uppercase" lts={0.5}>
                                    Plano Enterprise
                                </Text>
                            </Box>
                            <Title order={3} mb="sm" className={classes.ctaTitle}>
                                Tudo que sua empresa precisa
                            </Title>
                            <Text className={classes.ctaDescription} mb="lg">
                                Acesse todas as plataformas Sincla com condições especiais e suporte dedicado.
                            </Text>
                            <List
                                spacing="xs"
                                icon={
                                    <ThemeIcon size={20} radius="xl" color="orange">
                                        <IconCheck size={12} stroke={3} />
                                    </ThemeIcon>
                                }
                            >
                                {enterpriseFeatures.map((feature, idx) => (
                                    <List.Item key={idx}>
                                        <Text size="sm" className={classes.featureText}>{feature}</Text>
                                    </List.Item>
                                ))}
                            </List>
                        </Box>

                        <Stack gap="md" align="flex-start">
                            <Box className={classes.priceBox}>
                                <Text size="sm" className={classes.priceLabel}>A partir de</Text>
                                <Group gap="xs" align="baseline">
                                    <Text className={classes.price}>R$</Text>
                                    <Text className={classes.priceValue}>997</Text>
                                    <Text size="sm" className={classes.pricePeriod}>/mês</Text>
                                </Group>
                                <Text size="xs" className={classes.priceNote}>Para até 50 colaboradores</Text>
                            </Box>
                            <Button
                                size="lg"
                                variant="gradient"
                                gradient={{ from: '#ff8c00', to: '#ff6600', deg: 135 }}
                                rightSection={<IconArrowRight size={18} />}
                                className={classes.ctaButton}
                            >
                                Falar com Consultor
                            </Button>
                            <Text size="xs" className={classes.ctaMicrocopy}>
                                Sem compromisso • Resposta em 24h
                            </Text>
                        </Stack>
                    </Group>
                </Card>
            </Container>
        </section>
    );
}
