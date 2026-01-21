import { Container, Title, Text, Button, Group, Box, Stack } from '@mantine/core';
import { IconArrowRight, IconPlayerPlay } from '@tabler/icons-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import classes from './Hero.module.css';

interface HeroProps {
    onOpenModal: () => void;
}

export function Hero({ onOpenModal }: HeroProps) {
    const heroRef = useScrollReveal(0.1);

    return (
        <section id="hero" className={classes.hero}>
            <Container size="xl" className={classes.container}>
                <Stack
                    align="center"
                    gap={0}
                    ref={heroRef as React.RefObject<HTMLDivElement>}
                    className="reveal"
                >
                    {/* Badge - Atlassian style chip */}
                    <Box className={classes.badge}>
                        <span className={classes.badgeDot} />
                        <Text size="sm" fw={600} tt="uppercase" lts={0.5}>
                            Ecossistema Unificado
                        </Text>
                    </Box>

                    {/* Main Heading - Strong, clear hierarchy */}
                    <Title order={1} ta="center" className={classes.title} mt={24}>
                        <span className={classes.titleLine}>Cadastre uma vez.</span>
                        <br />
                        <span className={classes.gradient}>Use em todo lugar.</span>
                    </Title>

                    {/* Subtitle - Clear value proposition */}
                    <Text ta="center" className={classes.subtitle} mt={24}>
                        Sua identidade pessoal e os dados da sua empresa, centralizados em um único hub.
                        <br className={classes.subtitleBreak} />
                        Acesse RH, EAD, Finanças, Leads e mais — sem formulários repetidos.
                    </Text>

                    {/* CTA Buttons - Primary action prominent */}
                    <Group gap="md" mt={40} className={classes.ctaGroup}>
                        <Button
                            size="lg"
                            variant="gradient"
                            gradient={{ from: '#0087ff', to: '#00c6ff', deg: 135 }}
                            rightSection={<IconArrowRight size={18} />}
                            className={classes.ctaPrimary}
                            onClick={onOpenModal}
                        >
                            Começar grátis
                        </Button>
                        <Button
                            size="lg"
                            variant="subtle"
                            color="gray"
                            leftSection={<IconPlayerPlay size={16} />}
                            className={classes.ctaSecondary}
                            component="a"
                            href="#como-funciona"
                        >
                            Ver demonstração
                        </Button>
                    </Group>

                    {/* Trust signal - Minimal, Atlassian style */}
                    <Text size="sm" className={classes.trustSignal} mt={16}>
                        Gratuito para começar • Sem cartão de crédito
                    </Text>

                    {/* Stats - Social proof with glassmorphism */}
                    <Box className={classes.statsContainer} mt={80}>
                        <Group gap={0} className={classes.stats}>
                            <Box className={classes.statItem}>
                                <Text className={classes.statNumber}>500+</Text>
                                <Text className={classes.statLabel}>Empresas ativas</Text>
                            </Box>
                            <Box className={classes.statDivider} />
                            <Box className={classes.statItem}>
                                <Text className={classes.statNumber}>15k+</Text>
                                <Text className={classes.statLabel}>Usuários</Text>
                            </Box>
                            <Box className={classes.statDivider} />
                            <Box className={classes.statItem}>
                                <Text className={classes.statNumber}>Zero</Text>
                                <Text className={classes.statLabel}>Retrabalho</Text>
                            </Box>
                        </Group>
                    </Box>
                </Stack>
            </Container>
        </section>
    );
}
