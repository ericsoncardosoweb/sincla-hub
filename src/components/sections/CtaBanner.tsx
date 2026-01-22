import { Container, Title, Text, Button, Box } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import classes from './CtaBanner.module.css';

interface CtaBannerProps {
    onOpenModal: () => void;
}

export function CtaBanner({ onOpenModal }: CtaBannerProps) {
    return (
        <section className={classes.ctaBanner}>
            <Box className={classes.glassCard}>
                <Container size="md" className={classes.container}>
                    <Title order={2} className={classes.title}>
                        Pronto para transformar
                        <br />
                        <span className={classes.highlight}>sua gestão?</span>
                    </Title>

                    <Text className={classes.subtitle}>
                        Comece agora e descubra como a Sincla pode simplificar
                        seus processos e impulsionar seus resultados.
                    </Text>

                    <Button
                        size="lg"
                        variant="filled"
                        color="blue"
                        radius="xl"
                        rightSection={<IconArrowRight size={18} />}
                        className={classes.ctaButton}
                        onClick={onOpenModal}
                    >
                        Começar gratuitamente
                    </Button>
                </Container>
            </Box>
        </section>
    );
}
