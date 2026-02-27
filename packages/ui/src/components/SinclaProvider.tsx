import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '../theme';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '../styles/global.css';

interface SinclaProviderProps {
    children: React.ReactNode;
}

/**
 * Provider raiz do ecossistema Sincla.
 * Envolve a app com Mantine (tema Sincla) + Notifications.
 * Todas as apps devem usar este provider no topo.
 *
 * @example
 * ```tsx
 * import { SinclaProvider } from '@sincla/ui';
 *
 * function App() {
 *   return (
 *     <SinclaProvider>
 *       <MyApp />
 *     </SinclaProvider>
 *   );
 * }
 * ```
 */
export function SinclaProvider({ children }: SinclaProviderProps) {
    return (
        <MantineProvider theme={theme} defaultColorScheme="dark">
            <Notifications position="top-right" />
            {children}
        </MantineProvider>
    );
}
