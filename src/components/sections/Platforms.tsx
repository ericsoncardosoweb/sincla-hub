import { Container, Title, Text, SimpleGrid, Card, Group, Box, Stack, Button, List, ThemeIcon } from '@mantine/core';
import { IconCheck, IconArrowRight } from '@tabler/icons-react';
import { platforms } from '../../data/platforms';
import { iconMap } from '../common/Icons';
import classes from './Platforms.module.css';

export function Platforms() {
    return (
        <section className={classes.section} id="produtos">
            <Container size="xl">
                <Stack align="center" gap="md" mb={60}>
                    <Box className={classes.badge}>
                        <Text size="xs" fw={600} tt="uppercase" lts={0.5}>
                            Nosso Ecossistema
                        </Text>
                    </Box>
                    <Title order={2} ta="center" className={classes.title}>
                        Ferramentas que{' '}
                        <span className={classes.gradient}>transformam</span>
                    </Title>
                    <Text className={classes.subtitle} ta="center" maw={550}>
                        Cada plataforma resolve problemas reais com IA integrada e experiência premium.
                    </Text>
                </Stack>

                <SimpleGrid
                    cols={{ base: 1, sm: 2, lg: 3 }}
                    spacing="lg"
                >
                    {platforms.map((platform) => {
                        const IconComponent = iconMap[platform.icon];

                        return (
                            <Card
                                key={platform.id}
                                className={classes.card}
                                style={{ '--platform-color': platform.color } as React.CSSProperties}
                            >
                                {platform.isComingSoon && (
                                    <Box className={classes.comingSoonBadge}>
                                        Em Breve
                                    </Box>
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
                                        <Text fw={700} size="lg" className={classes.cardTitle}>
                                            {platform.name}
                                        </Text>
                                        <Text size="sm" className={classes.cardTagline}>
                                            {platform.tagline}
                                        </Text>
                                    </Box>
                                </Group>

                                <Text className={classes.description} mb="md">
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
                                    {platform.features.slice(0, 3).map((feature, idx) => (
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
