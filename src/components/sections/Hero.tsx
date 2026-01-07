import { Container, Title, Text, Button, Group, Box, Stack } from '@mantine/core';
import { IconArrowRight, IconCloud } from '@tabler/icons-react';
import classes from './Hero.module.css';

const floatingLogos = [
    { id: 'rh', logo: '/logos/sincla-rh.svg', alt: 'Sincla RH' },
    { id: 'ead', logo: '/logos/sincla-ead.svg', alt: 'Sincla EAD' },
    { id: 'bolso', logo: '/logos/sincla-bolso.svg', alt: 'Sincla Bolso' },
    { id: 'leads', logo: '/logos/sincla-leads.svg', alt: 'Sincla Leads' },
    { id: 'agenda', logo: '/logos/sincla-agenda.svg', alt: 'Sincla Agenda' },
];

export function Hero() {
    return (
        <section className={classes.hero}>
            {/* Background Effects */}
            <div className={classes.bgGlow} />
            <div className={classes.gridPattern} />

            <Container size="xl" className={classes.container}>
                <Stack align="center" gap="xl">
                    {/* Badge */}
                    <Box className={classes.badge}>
                        <IconCloud size={16} />
                        <Text size="sm" fw={500}>Hub de Tecnologias</Text>
                    </Box>

                    {/* Main Heading */}
                    <Title order={1} ta="center" className={classes.title}>
                        Um hub.{' '}
                        <span className={classes.gradient}>Todas as suas</span>
                        <br />
                        ferramentas.
                    </Title>

                    {/* Subtitle */}
                    <Text size="xl" c="dimmed" ta="center" maw={600} className={classes.subtitle}>
                        Centralize sua experiência Sincla. Acesse suas plataformas,
                        gerencie assinaturas e descubra novas ferramentas em um único lugar.
                    </Text>

                    {/* CTA Buttons */}
                    <Group gap="md" mt="md">
                        <Button
                            size="lg"
                            variant="gradient"
                            gradient={{ from: '#0087ff', to: '#00c6ff', deg: 90 }}
                            rightSection={<IconArrowRight size={18} />}
                            className={classes.ctaPrimary}
                        >
                            Começar Grátis
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            color="gray"
                            className={classes.ctaSecondary}
                            component="a"
                            href="#produtos"
                        >
                            Ver Produtos
                        </Button>
                    </Group>

                    {/* Floating Logos */}
                    <Box className={classes.logosContainer}>
                        {floatingLogos.map((item, index) => (
                            <Box
                                key={item.id}
                                className={`${classes.floatingLogo} ${classes[`logo${index + 1}`]}`}
                            >
                                <img
                                    src={item.logo}
                                    alt={item.alt}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        padding: '8px'
                                    }}
                                />
                            </Box>
                        ))}
                    </Box>

                    {/* Stats */}
                    <Group gap={60} mt={60} className={classes.stats}>
                        <Box ta="center">
                            <Text className={classes.statNumber}>6</Text>
                            <Text size="sm" c="dimmed">Plataformas</Text>
                        </Box>
                        <Box ta="center">
                            <Text className={classes.statNumber}>10k+</Text>
                            <Text size="sm" c="dimmed">Usuários</Text>
                        </Box>
                        <Box ta="center">
                            <Text className={classes.statNumber}>99.9%</Text>
                            <Text size="sm" c="dimmed">Uptime</Text>
                        </Box>
                    </Group>
                </Stack>
            </Container>
        </section>
    );
}

