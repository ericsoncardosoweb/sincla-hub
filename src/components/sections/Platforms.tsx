import { Container, Title, Text, SimpleGrid, Card, Badge, Group, Box, Stack, Button, List, ThemeIcon } from '@mantine/core';
import { IconCheck, IconArrowRight } from '@tabler/icons-react';
import { platforms } from '../../data/platforms';
import { iconMap } from '../common/Icons';
import classes from './Platforms.module.css';

export function Platforms() {
    return (
        <section className={classes.section} id="produtos">
            <Container size="xl">
                <Stack align="center" gap="lg" mb={60}>
                    <Badge size="lg" variant="light" color="blue">
                        Nosso Ecossistema
                    </Badge>
                    <Title order={2} ta="center" className={classes.title}>
                        Ferramentas que{' '}
                        <span className={classes.gradient}>transformam</span>
                        <br />seu negócio
                    </Title>
                    <Text size="lg" c="dimmed" ta="center" maw={600}>
                        Cada plataforma foi desenvolvida para resolver problemas reais,
                        com inteligência artificial integrada e experiência premium.
                    </Text>
                </Stack>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                    {platforms.map((platform) => {
                        const IconComponent = iconMap[platform.icon];

                        return (
                            <Card
                                key={platform.id}
                                className={classes.card}
                                style={{ '--platform-color': platform.color } as React.CSSProperties}
                            >
                                {platform.isComingSoon && (
                                    <Badge className={classes.comingSoonBadge}>
                                        Em Breve
                                    </Badge>
                                )}

                                <Group gap="md" mb="md">
                                    <Box
                                        className={classes.iconBox}
                                        style={{ background: `linear-gradient(135deg, ${platform.color}, ${platform.color}99)` }}
                                    >
                                        {platform.logo ? (
                                            <img
                                                src={platform.logo}
                                                alt={platform.name}
                                                style={{ width: 28, height: 28, objectFit: 'contain' }}
                                            />
                                        ) : (
                                            IconComponent && <IconComponent size={24} stroke={1.5} />
                                        )}
                                    </Box>
                                    <Box>
                                        <Text fw={700} size="lg">{platform.name}</Text>
                                        <Text size="sm" c="dimmed">{platform.tagline}</Text>
                                    </Box>
                                </Group>

                                <Text size="sm" c="dimmed" mb="md" className={classes.description}>
                                    {platform.description}
                                </Text>

                                <List
                                    spacing="xs"
                                    size="sm"
                                    mb="xl"
                                    icon={
                                        <ThemeIcon size={18} radius="xl" style={{ background: platform.color }}>
                                            <IconCheck size={12} stroke={3} />
                                        </ThemeIcon>
                                    }
                                >
                                    {platform.features.slice(0, 4).map((feature, idx) => (
                                        <List.Item key={idx} className={classes.featureItem}>
                                            {feature}
                                        </List.Item>
                                    ))}
                                </List>

                                <Button
                                    fullWidth
                                    variant={platform.isComingSoon ? 'light' : 'filled'}
                                    color={platform.isComingSoon ? 'gray' : undefined}
                                    disabled={platform.isComingSoon}
                                    rightSection={!platform.isComingSoon && <IconArrowRight size={16} />}
                                    style={!platform.isComingSoon ? { background: platform.color } : undefined}
                                    className={classes.cardButton}
                                >
                                    {platform.isComingSoon ? 'Em Breve' : 'Conhecer'}
                                </Button>
                            </Card>
                        );
                    })}
                </SimpleGrid>
            </Container>
        </section>
    );
}
