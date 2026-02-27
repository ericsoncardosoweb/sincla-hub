import { Loader, Center, Stack, Text } from '@mantine/core';

interface AppLoadingProps {
    message?: string;
}

/**
 * Tela de loading padrão do ecossistema.
 * Exibido durante carregamento inicial da app ou autenticação.
 */
export function AppLoading({ message = 'Carregando...' }: AppLoadingProps) {
    return (
        <Center h="100vh" bg="var(--sincla-bg-base)">
            <Stack align="center" gap="md">
                <Loader size="lg" color="sinclaPrimary" />
                <Text size="sm" c="dimmed">{message}</Text>
            </Stack>
        </Center>
    );
}
