import { useState } from 'react';
import { Modal, Stepper, Button, Group, Box, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { StepPersonal } from './steps/StepPersonal';
import { StepCompany } from './steps/StepCompany';
import { StepModule } from './steps/StepModule';
import classes from './OnboardingModal.module.css';

interface OnboardingModalProps {
    opened: boolean;
    onClose: () => void;
}

export function OnboardingModal({ opened, onClose }: OnboardingModalProps) {
    const [active, setActive] = useState(0);
    const [selectedModule, setSelectedModule] = useState<string | null>(null);
    const isMobile = useMediaQuery('(max-width: 768px)');

    const nextStep = () => setActive((current) => (current < 3 ? current + 1 : current));
    const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

    const handleClose = () => {
        setActive(0);
        setSelectedModule(null);
        onClose();
    };

    const getStepContent = () => {
        switch (active) {
            case 0:
                return <StepPersonal />;
            case 1:
                return <StepCompany />;
            case 2:
                return <StepModule selectedModule={selectedModule} onSelectModule={setSelectedModule} />;
            default:
                return null;
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            size="lg"
            fullScreen={isMobile}
            centered
            padding="xl"
            radius="lg"
            classNames={{
                header: classes.modalHeader,
                body: classes.modalBody,
                content: classes.modalContent,
            }}
            title={
                <Box>
                    <Text size="xs" c="dimmed" mb={4}>
                        Etapa {active + 1} de 3
                    </Text>
                </Box>
            }
        >
            <Stepper
                active={active}
                size="sm"
                className={classes.stepper}
            >
                <Stepper.Step label="Você" />
                <Stepper.Step label="Empresa" />
                <Stepper.Step label="Módulo" />
            </Stepper>

            <Box className={classes.stepContent}>
                {getStepContent()}
            </Box>

            <Group justify="space-between" mt="xl" className={classes.navigation}>
                {active > 0 ? (
                    <Button variant="subtle" color="gray" onClick={prevStep}>
                        Voltar
                    </Button>
                ) : (
                    <Box />
                )}

                {active < 2 ? (
                    <Button
                        variant="gradient"
                        gradient={{ from: '#0087ff', to: '#00c6ff', deg: 90 }}
                        onClick={nextStep}
                    >
                        Continuar
                    </Button>
                ) : (
                    <Button
                        variant="gradient"
                        gradient={{ from: '#0087ff', to: '#00c6ff', deg: 90 }}
                        disabled={!selectedModule}
                        onClick={handleClose}
                    >
                        {selectedModule ? `Ativar ${selectedModule}` : 'Selecione um módulo'}
                    </Button>
                )}
            </Group>
        </Modal>
    );
}
