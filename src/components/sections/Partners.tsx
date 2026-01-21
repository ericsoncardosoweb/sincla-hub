import { Container, Title, Text, Stack, Card, Group, Box, Button, SimpleGrid, ThemeIcon } from '@mantine/core';
import { IconMedal, IconArrowRight, IconStar, IconUsers, IconChartLine } from '@tabler/icons-react';
import { partnerLevels } from '../../data/platforms';
import classes from './Partners.module.css';

const levelIcons: Record<string, typeof IconMedal> = {
    bronze: IconMedal,
    silver: IconStar,
    gold: IconChartLine,
};

const levelColors: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
};

export function Partners() {
    return (
        <section className={classes.section} id="parceiros">
            <Container size="xl">
                <Stack align="center" gap="md" mb={60}>
                    <Box className={classes.badge}>
                        <Text size="xs" fw={600} tt="uppercase" lts={0.5}>
                            Programa de Parceiros
                        </Text>
                    </Box>
                    <Title order={2} ta="center" className={classes.title}>
                        Seja um{' '}
                        <span className={classes.gradient}>Consultor Sincla</span>
                    </Title>
                    <Text className={classes.subtitle} ta="center" maw={550}>
                        Ajude empresas a transformarem seus negócios e ganhe comissões atrativas.
                    </Text>
                </Stack>

                {/* Partner Levels */}
                <SimpleGrid
                    cols={{ base: 1, md: 3 }}
                    spacing="lg"
                    mb={60}
                >
                    {partnerLevels.map((level) => {
                        const Icon = levelIcons[level.id] || IconMedal;
                        const color = levelColors[level.id];

                        return (
                            <Card
                                key={level.id}
                                className={classes.levelCard}
                                style={{ '--level-color': color } as React.CSSProperties}
                            >
                                <ThemeIcon
                                    size={60}
                                    radius="xl"
                                    className={classes.levelIcon}
                                    style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
                                >
                                    <Icon size={30} stroke={1.5} />
                                </ThemeIcon>

                                <Text fw={700} size="xl" mt="md" mb="xs" className={classes.levelName}>
                                    {level.name}
                                </Text>

                                <Text className={classes.commission}>
                                    {level.commission}%
                                </Text>
                                <Text size="sm" className={classes.commissionLabel}>de comissão</Text>

                                <Text size="sm" className={classes.requirement} mb="lg">
                                    <strong>Requisito:</strong> {level.requirements}
                                </Text>

                                <Stack gap="xs">
                                    {level.benefits.map((benefit, idx) => (
                                        <Group key={idx} gap="xs">
                                            <Box className={classes.checkIcon} style={{ background: color }}>✓</Box>
                                            <Text size="sm" className={classes.benefitText}>{benefit}</Text>
                                        </Group>
                                    ))}
                                </Stack>
                            </Card>
                        );
                    })}
                </SimpleGrid>

                {/* CTA */}
                <Card className={classes.ctaCard}>
                    <Group justify="space-between" align="center" wrap="wrap" gap="xl">
                        <Box>
                            <Group gap="sm" mb="xs">
                                <IconUsers size={24} color="#FFD700" />
                                <Text fw={700} size="lg" className={classes.ctaTitle}>Junte-se à nossa rede</Text>
                            </Group>
                            <Text className={classes.ctaDescription} maw={500}>
                                Mais de 100 consultores já fazem parte do programa.
                                Receba treinamento e materiais exclusivos.
                            </Text>
                        </Box>
                        <Button
                            size="lg"
                            variant="gradient"
                            gradient={{ from: '#FFD700', to: '#FFA500', deg: 135 }}
                            rightSection={<IconArrowRight size={18} />}
                            className={classes.ctaButton}
                        >
                            Quero ser Parceiro
                        </Button>
                    </Group>
                </Card>
            </Container>
        </section>
    );
}
