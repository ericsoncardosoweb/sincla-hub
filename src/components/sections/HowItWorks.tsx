import { Container, Title, Text, Button, Box, Stack, SimpleGrid } from '@mantine/core';
import { IconIdBadge2, IconBuilding, IconApps, IconArrowRight } from '@tabler/icons-react';
import classes from './HowItWorks.module.css';

const steps = [
    {
        number: 1,
        icon: IconIdBadge2,
        title: 'Cadastre você',
        description: 'Seus dados pessoais — nome, e-mail, telefone — viram sua identidade única no ecossistema Sincla. Um login para tudo. Uma senha para sempre.',
    },
    {
        number: 2,
        icon: IconBuilding,
        title: 'Cadastre sua empresa',
        description: 'Digite o CNPJ e buscamos os dados automaticamente. Nome fantasia, segmento, tamanho — tudo registrado uma vez e compartilhado em todos os módulos que você ativar.',
    },
    {
        number: 3,
        icon: IconApps,
        title: 'Ative módulos',
        description: 'Escolha RH, EAD, Finanças, Leads ou Agenda. Ao abrir qualquer módulo, seus dados pessoais e da empresa já estarão preenchidos. Adicione mais módulos quando quiser — zero retrabalho.',
    },
];

interface HowItWorksProps {
    onOpenModal: () => void;
}

export function HowItWorks({ onOpenModal }: HowItWorksProps) {
    return (
        <section id="como-funciona" className={classes.section}>
            <Container size="xl">
                <Stack align="center" gap="xl">
                    {/* Badge */}
                    <Box className={classes.badge}>
                        <Text size="sm" fw={500}>Como Funciona</Text>
                    </Box>

                    {/* Header */}
                    <Title order={2} ta="center" className={classes.title}>
                        Um cadastro.{' '}
                        <span className={classes.gradient}>Dados que viajam com você.</span>
                    </Title>

                    <Text size="lg" c="dimmed" ta="center" maw={650} className={classes.subtitle}>
                        Preencha uma vez. Acesse qualquer módulo com tudo pronto.
                        Sem formulários repetidos, sem retrabalho, sem fricção.
                    </Text>

                    {/* Steps Grid */}
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl" mt="xl" className={classes.stepsGrid}>
                        {steps.map((step, index) => (
                            <Box
                                key={step.number}
                                className={classes.stepCard}
                                style={{ animationDelay: `${index * 150}ms` }}
                            >
                                <Box className={classes.stepNumber}>{step.number}</Box>
                                <Box className={classes.stepIcon}>
                                    <step.icon size={32} stroke={1.5} />
                                </Box>
                                <Title order={4} className={classes.stepTitle}>
                                    {step.title}
                                </Title>
                                <Text size="sm" c="dimmed" className={classes.stepDescription}>
                                    {step.description}
                                </Text>
                            </Box>
                        ))}
                    </SimpleGrid>

                    {/* Connection Line Visual */}
                    <Box className={classes.connectionLine}>
                        <Text size="sm" c="dimmed" fw={500}>
                            1 cadastro = acesso a todo o ecossistema
                        </Text>
                    </Box>

                    {/* CTA */}
                    <Stack align="center" gap="xs" mt="xl">
                        <Button
                            size="lg"
                            variant="gradient"
                            gradient={{ from: '#0087ff', to: '#00c6ff', deg: 90 }}
                            rightSection={<IconArrowRight size={18} />}
                            className={classes.ctaButton}
                            onClick={onOpenModal}
                        >
                            Criar minha identidade
                        </Button>
                        <Text size="sm" c="dimmed">
                            Gratuito. Sem cartão. Leva 2 minutos.
                        </Text>
                    </Stack>
                </Stack>
            </Container>
        </section>
    );
}
