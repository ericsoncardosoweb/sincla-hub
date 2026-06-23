import { Container, Title, Text, Button, Group, Box, Stack } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import classes from './Hero.module.css';

interface HeroProps {
    signupUrl: string;
}

export function Hero({ signupUrl }: HeroProps) {
    return (
        <section id="hero" className={classes.hero}>
            <Container size="xl" className={classes.container}>
                {/* Main Content */}
                <Stack align="center" gap={0} className={classes.heroContent}>
                    {/* Badge */}
                    <Box className={classes.badge}>
                        <Text size="sm" fw={600}>
                            Ecossistema sem atrito para PMEs
                        </Text>
                    </Box>

                    {/* Main Headline */}
                    <Title order={1} ta="center" className={classes.mainTitle}>
                        A dor secreta de gerenciar pessoas...
                        <br />
                        <span className={classes.gradientText}>resolvida em um único clique.</span>
                    </Title>

                    {/* Subtitle */}
                    <Text className={classes.subtitle}>
                        Você realmente precisa de cinco sistemas diferentes e logins duplicados para cuidar da sua equipe? 
                        O Sincla conecta recrutamento comportamental por IA, treinamentos práticos e a gestão completa de RH em um único cadastro rápido. 
                        Menos burocracia, mais eficiência.
                    </Text>

                    {/* CTAs */}
                    <Group gap="md" mt={40} className={classes.ctaGroup}>
                        <Button
                            component="a"
                            href={signupUrl}
                            size="lg"
                            variant="filled"
                            color="blue"
                            radius="xl"
                            className={classes.primaryCta}
                        >
                            Começar gratuitamente
                        </Button>
                        <Button
                            size="lg"
                            variant="subtle"
                            color="gray"
                            radius="xl"
                            rightSection={<IconArrowRight size={18} />}
                            className={classes.secondaryCta}
                            component="a"
                            href="#como-funciona"
                        >
                            Ver demonstração
                        </Button>
                    </Group>

                    {/* Trust Indicators */}
                    <Group gap="xl" mt={48} className={classes.trustIndicators}>
                        <Box className={classes.trustItem}>
                            <Text className={classes.trustNumber}>5.000+</Text>
                            <Text className={classes.trustLabel}>Empresas ativas</Text>
                        </Box>
                        <Box className={classes.trustDivider} />
                        <Box className={classes.trustItem}>
                            <Text className={classes.trustNumber}>50.000+</Text>
                            <Text className={classes.trustLabel}>Usuários</Text>
                        </Box>
                        <Box className={classes.trustDivider} />
                        <Box className={classes.trustItem}>
                            <Text className={classes.trustNumber}>99.9%</Text>
                            <Text className={classes.trustLabel}>Uptime</Text>
                        </Box>
                    </Group>
                </Stack>
            </Container>

            {/* Scroll Indicator */}
            <Box className={classes.scrollIndicator}>
                <Box className={classes.scrollMouse}>
                    <Box className={classes.scrollWheel} />
                </Box>
                <Text size="xs" c="dimmed" mt={8}>Role para explorar</Text>
            </Box>
        </section>
    );
}
