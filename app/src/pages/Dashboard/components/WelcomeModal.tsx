import { useState, useEffect } from 'react';
import { Modal, Text, Title, Button, Group, Stack, ThemeIcon } from '@mantine/core';
import { IconRocket, IconBuilding, IconHeartHandshake } from '@tabler/icons-react';

interface WelcomeModalProps {
    opened: boolean;
    onClose: () => void;
    userName: string;
}

export function WelcomeModal({ opened, onClose, userName }: WelcomeModalProps) {
    const [activeStep, setActiveStep] = useState(0);

    // Reset step if opened again (though ideally only shown once)
    useEffect(() => {
        if (opened) setActiveStep(0);
    }, [opened]);

    const handleNext = () => {
        if (activeStep < 2) {
            setActiveStep((current) => current + 1);
        } else {
            onClose();
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            size="lg"
            radius="md"
            withCloseButton={false}
            closeOnClickOutside={false}
            closeOnEscape={false}
            centered
        >
            <Stack gap="xl" py="sm">

                {/* Header Context */}
                {activeStep === 0 && (
                    <Stack align="center" gap="sm">
                        <ThemeIcon size={64} radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'violet' }}>
                            <IconRocket size={32} />
                        </ThemeIcon>
                        <Title order={2} ta="center">Bem-vindo ao Sincla Hub! 👋</Title>
                        <Text c="dimmed" ta="center" mb="md">
                            Olá, {userName}! Nós somos uma Hub de Tecnologia. Nossa missão é simplificar a gestão
                            dos seus projetos e negócios com facilidade e integrações amigáveis.
                        </Text>
                    </Stack>
                )}

                {activeStep === 1 && (
                    <Stack align="center" gap="sm">
                        <ThemeIcon size={64} radius="xl" variant="light" color="blue">
                            <IconBuilding size={32} />
                        </ThemeIcon>
                        <Title order={2} ta="center">Tudo em um só lugar</Title>
                        <Text c="dimmed" ta="center" mb="md">
                            Gerencie várias empresas, acesse ferramentas de RH, EAD, Leads e muito mais, tudo
                            com um único login e de forma integrada.
                        </Text>
                    </Stack>
                )}

                {activeStep === 2 && (
                    <Stack align="center" gap="sm">
                        <ThemeIcon size={64} radius="xl" variant="light" color="teal">
                            <IconHeartHandshake size={32} />
                        </ThemeIcon>
                        <Title order={2} ta="center">Vamos começar?</Title>
                        <Text c="dimmed" ta="center" mb="md">
                            Criaremos o perfil da sua primeira empresa e em seguida você já poderá escolher
                            a ferramenta ideal para alavancar seu negócio!
                        </Text>
                    </Stack>
                )}

                {/* Progress Indicators */}
                <Group justify="center" gap="sm">
                    {[0, 1, 2].map((step) => (
                        <div
                            key={step}
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: activeStep === step
                                    ? 'var(--mantine-color-blue-filled)'
                                    : 'var(--mantine-color-gray-3)',
                                transition: 'background-color 0.2s ease'
                            }}
                        />
                    ))}
                </Group>

                {/* Footer Controls */}
                <Group justify={activeStep > 0 ? 'space-between' : 'center'} mt="lg">
                    {activeStep > 0 && (
                        <Button variant="subtle" onClick={() => setActiveStep(s => s - 1)}>
                            Voltar
                        </Button>
                    )}
                    <Button
                        size="md"
                        fullWidth={activeStep === 0}
                        onClick={handleNext}
                        rightSection={activeStep === 2 ? <IconRocket size={16} /> : null}
                    >
                        {activeStep === 2 ? 'Configurar minha conta' : 'Avançar'}
                    </Button>
                </Group>

            </Stack>
        </Modal>
    );
}
