import { Container, Title, Text, Button, Group, Box, Stack } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import classes from './Hero.module.css';

interface HeroProps {
    onOpenModal: () => void;
}

export function Hero({ onOpenModal }: HeroProps) {
    return (
        <section id="hero" className={classes.hero}>
            <Container size="xl" className={classes.container}>
                <Stack align="center" gap="xl">
                    {/* Badge */}
                    <Box className={classes.badge}>
                        <Text size="sm" fw={500}>Ecossistema de Gestão para PMEs</Text>
                    </Box>

                    {/* Main Heading */}
                    <Title order={1} ta="center" className={classes.title}>
                        Cadastre uma vez.{' '}
                        <br />
                        <span className={classes.gradient}>Use em todo lugar.</span>
                    </Title>

                    {/* Subtitle */}
                    <Text size="lg" c="dimmed" ta="center" maw={650} className={classes.subtitle}>
                        Sua identidade pessoal e os dados da sua empresa, centralizados.
                        Um único cadastro desbloqueia RH, EAD, Finanças, Leads e mais —
                        sem preencher formulários repetidos, sem múltiplas senhas.
                    </Text>

                    {/* CTA Buttons */}
                    <Group gap="md" mt="md">
                        <Button
                            size="lg"
                            variant="gradient"
                            gradient={{ from: '#0087ff', to: '#00c6ff', deg: 90 }}
                            rightSection={<IconArrowRight size={18} />}
                            className={classes.ctaPrimary}
                            onClick={onOpenModal}
                        >
                            Começar grátis
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            color="gray"
                            className={classes.ctaSecondary}
                            component="a"
                            href="#como-funciona"
                        >
                            Ver como funciona
                        </Button>
                    </Group>

                    {/* Microcopy */}
                    <Text size="sm" c="dimmed" className={classes.microcopy}>
                        Cadastro único + 1 módulo ativo. Sem cartão, sem burocracia.
                    </Text>

                    {/* Stats */}
                    <Group gap={60} mt={80} className={classes.stats}>
                        <Box ta="center">
                            <Text className={classes.statNumber}>500+</Text>
                            <Text size="sm" c="dimmed">empresas cadastradas</Text>
                        </Box>
                        <Box ta="center">
                            <Text className={classes.statNumber}>15.000+</Text>
                            <Text size="sm" c="dimmed">usuários ativos</Text>
                        </Box>
                        <Box ta="center">
                            <Text className={classes.statNumber}>Zero</Text>
                            <Text size="sm" c="dimmed">cadastros repetidos</Text>
                        </Box>
                    </Group>
                </Stack>
            </Container>
        </section>
    );
}
