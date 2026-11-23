import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, Button, Center, Code, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface BoundaryProps {
    resetKey: string;
    children: ReactNode;
}

interface BoundaryState {
    error: Error | null;
}

class Boundary extends Component<BoundaryProps, BoundaryState> {
    state: BoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): BoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[RouteErrorBoundary]', error, info.componentStack);
    }

    componentDidUpdate(prev: BoundaryProps) {
        if (prev.resetKey !== this.props.resetKey && this.state.error) {
            this.setState({ error: null });
        }
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <Center py="xl" px="md">
                <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Algo deu errado nesta tela" maw={560} w="100%">
                    <Stack gap="sm">
                        <Text size="sm">
                            A página encontrou um erro inesperado. Você pode tentar novamente ou navegar para outra seção.
                        </Text>
                        <Code block>{this.state.error.message}</Code>
                        <Group gap="sm">
                            <Button size="xs" variant="light" color="red" onClick={() => this.setState({ error: null })}>
                                Tentar novamente
                            </Button>
                            <Button size="xs" variant="subtle" color="gray" onClick={() => window.location.reload()}>
                                Recarregar página
                            </Button>
                        </Group>
                    </Stack>
                </Alert>
            </Center>
        );
    }
}

/** Isola erros de render da rota atual; reseta ao trocar de página. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
    const location = useLocation();
    return <Boundary resetKey={location.pathname}>{children}</Boundary>;
}
