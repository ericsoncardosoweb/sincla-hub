import { Container, Title, Text, Box, Stack, UnstyledButton, Tooltip } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useState } from 'react';
import { platforms } from '../../../shared/data/platforms';
import classes from './Platforms.module.css';

export function Platforms() {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    return (
        <section className={classes.section} id="produtos">
            <Container size="xl">
                <Stack align="center" gap="md" mb={48}>
                    <Box className={classes.badge}>
                        <Text size="xs" fw={600} tt="uppercase" lts={0.5}>
                            Nosso Ecossistema
                        </Text>
                    </Box>
                    <Title order={2} ta="center" className={classes.title}>
                        Um ecossistema{' '}
                        <span className={classes.gradient}>completo</span>
                    </Title>
                    <Text className={classes.subtitle} ta="center" maw={550}>
                        Todas as ferramentas que você precisa, integradas e trabalhando juntas.
                    </Text>
                </Stack>

                {/* Logos Grid */}
                <Box className={classes.logosContainer}>
                    <Box className={classes.logosGrid}>
                        {platforms.map((platform) => (
                            <Tooltip
                                key={platform.id}
                                label={platform.tagline}
                                position="bottom"
                                withArrow
                                transitionProps={{ transition: 'fade-up', duration: 200 }}
                            >
                                <UnstyledButton
                                    className={`${classes.logoCard} ${hoveredId === platform.id ? classes.logoCardActive : ''} ${platform.isComingSoon ? classes.logoCardDisabled : ''}`}
                                    onMouseEnter={() => setHoveredId(platform.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    style={{ '--platform-color': platform.color } as React.CSSProperties}
                                >
                                    <Box className={classes.logoWrapper}>
                                        <Box
                                            className={classes.logoIcon}
                                            style={{ background: `linear-gradient(135deg, ${platform.color}, ${platform.color}cc)` }}
                                        >
                                            {platform.logo && (
                                                <img
                                                    src={platform.logo}
                                                    alt={platform.name}
                                                    className={classes.logoImage}
                                                />
                                            )}
                                        </Box>
                                        <Box className={classes.logoInfo}>
                                            <Text className={classes.logoName}>
                                                {platform.name}
                                            </Text>
                                            {platform.isComingSoon && (
                                                <Text className={classes.comingSoon}>Em breve</Text>
                                            )}
                                        </Box>
                                    </Box>
                                    {!platform.isComingSoon && (
                                        <IconArrowRight
                                            size={16}
                                            className={classes.arrowIcon}
                                        />
                                    )}
                                </UnstyledButton>
                            </Tooltip>
                        ))}
                    </Box>
                </Box>

                {/* Connection Visual */}
                <Box className={classes.connectionVisual}>
                    <svg viewBox="0 0 400 60" className={classes.connectionSvg}>
                        <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#0087ff" stopOpacity="0.3" />
                                <stop offset="50%" stopColor="#00c6ff" stopOpacity="0.6" />
                                <stop offset="100%" stopColor="#0087ff" stopOpacity="0.3" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M 0 30 Q 100 10 200 30 Q 300 50 400 30"
                            fill="none"
                            stroke="url(#lineGradient)"
                            strokeWidth="2"
                            strokeDasharray="6,4"
                            className={classes.connectionPath}
                        />
                        <circle cx="50" cy="25" r="3" fill="#0087ff" className={classes.connectionDot} />
                        <circle cx="150" cy="20" r="3" fill="#00c6ff" className={classes.connectionDot} />
                        <circle cx="250" cy="40" r="3" fill="#8b5cf6" className={classes.connectionDot} />
                        <circle cx="350" cy="25" r="3" fill="#0087ff" className={classes.connectionDot} />
                    </svg>
                    <Text className={classes.connectionText}>
                        Todos os sistemas sincronizados automaticamente
                    </Text>
                </Box>
            </Container>
        </section>
    );
}
