import { Container, Title, Text, Button, Box, Stack, SimpleGrid } from '@mantine/core';
import { IconIdBadge2, IconBuilding, IconApps, IconArrowRight } from '@tabler/icons-react';
import classes from './HowItWorks.module.css';

const steps = [
    {
        number: 1,
        icon: IconIdBadge2,
        title: 'Cadastre você',
        description: 'Seus dados pessoais viram sua identidade única. Um login para tudo.',
    },
    {
        number: 2,
        icon: IconBuilding,
        title: 'Vincule sua empresa',
        description: 'Digite o CNPJ e buscamos tudo automaticamente. Zero digitação.',
    },
    {
        number: 3,
        icon: IconApps,
        title: 'Ative módulos',
        description: 'RH, EAD, Finanças — seus dados já estarão preenchidos.',
    },
];

interface HowItWorksProps {
    onOpenModal: () => void;
}

export function HowItWorks({ onOpenModal }: HowItWorksProps) {
    return (
        <section id="como-funciona" className={classes.section}>
            <Container size="xl">
                <Stack align="center" gap={0}>
                    {/* Header */}
                    <Stack align="center" gap="md">
                        <Box className={classes.badge}>
                            <Text size="xs" fw={600} tt="uppercase" lts={0.5}>
                                Como Funciona
                            </Text>
                        </Box>

                        <Title order={2} ta="center" className={classes.title}>
                            Um cadastro.{' '}
                            <span className={classes.gradient}>Acesso completo.</span>
                        </Title>

                        <Text ta="center" className={classes.subtitle} maw={550}>
                            Preencha uma vez. Seus dados viajam com você para qualquer módulo.
                        </Text>
                    </Stack>

                    {/* Steps Grid */}
                    <SimpleGrid
                        cols={{ base: 1, sm: 3 }}
                        spacing="lg"
                        mt={60}
                        className={classes.stepsGrid}
                    >
                        {steps.map((step) => (
                            <Box
                                key={step.number}
                                className={classes.stepCard}
                            >
                                <Box className={classes.stepNumber}>{step.number}</Box>
                                <Box className={classes.stepIcon}>
                                    <step.icon size={28} stroke={1.5} />
                                </Box>
                                <Title order={4} className={classes.stepTitle}>
                                    {step.title}
                                </Title>
                                <Text className={classes.stepDescription}>
                                    {step.description}
                                </Text>
                            </Box>
                        ))}
                    </SimpleGrid>

                    {/* Connection Visual */}
                    <Box className={classes.connectionLine}>
                        <Text size="sm" fw={500} c="dimmed">
                            1 cadastro = acesso a todo o ecossistema
                        </Text>
                    </Box>

                    {/* CTA */}
                    <Stack align="center" gap="xs" mt={48}>
                        <Button
                            size="lg"
                            variant="gradient"
                            gradient={{ from: '#0087ff', to: '#00c6ff', deg: 135 }}
                            rightSection={<IconArrowRight size={18} />}
                            className={classes.ctaButton}
                            onClick={onOpenModal}
                        >
                            Criar minha identidade
                        </Button>
                        <Text size="sm" className={classes.ctaMicrocopy}>
                            Gratuito • Sem cartão • 2 minutos
                        </Text>
                    </Stack>
                </Stack>
            </Container>
        </section>
    );
}
