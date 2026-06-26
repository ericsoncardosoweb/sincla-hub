import { useNavigate } from 'react-router-dom';
import { Card, Text, Group, ThemeIcon, SimpleGrid, Stack } from '@mantine/core';
import {
    IconBell, IconUsers, IconPlugConnected, IconSettings, IconSparkles, IconMail,
} from '@tabler/icons-react';

const shortcuts = [
    {
        icon: IconBell,
        label: 'Notificações e e-mail',
        description: 'SMTP da empresa, layout e testes de envio',
        path: '/painel/configuracoes?aba=notificacoes',
        color: 'blue',
    },
    {
        icon: IconUsers,
        label: 'Equipe',
        description: 'Convites, permissões e acesso por ferramenta',
        path: '/painel/equipe',
        color: 'violet',
    },
    {
        icon: IconPlugConnected,
        label: 'Integrações',
        description: 'Sincronização entre ferramentas e IA',
        path: '/painel/integracoes',
        color: 'teal',
    },
    {
        icon: IconSettings,
        label: 'Configurações da empresa',
        description: 'Dados, branding e domínio',
        path: '/painel/configuracoes',
        color: 'gray',
    },
    {
        icon: IconSparkles,
        label: 'Recursos e uso',
        description: 'IA, armazenamento e histórico',
        path: '/painel/assinaturas?aba=recursos',
        color: 'grape',
    },
    {
        icon: IconMail,
        label: 'Contatos',
        description: 'Base central de contatos do Hub',
        path: '/painel/contatos',
        color: 'orange',
    },
];

export function EcosystemShortcutsPanel() {
    const navigate = useNavigate();

    return (
        <Stack gap="md">
            <Text size="sm" c="dimmed">
                Atalhos para configurar sua empresa sem sair do ecossistema Sincla.
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {shortcuts.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Card
                            key={item.path}
                            withBorder
                            radius="md"
                            padding="md"
                            style={{ cursor: 'pointer', transition: 'box-shadow 0.2s ease' }}
                            onClick={() => navigate(item.path)}
                            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <Group gap="sm" align="flex-start" wrap="nowrap">
                                <ThemeIcon size="lg" radius="md" variant="light" color={item.color}>
                                    <Icon size={20} />
                                </ThemeIcon>
                                <div>
                                    <Text fw={600} size="sm">{item.label}</Text>
                                    <Text size="xs" c="dimmed" mt={4}>{item.description}</Text>
                                </div>
                            </Group>
                        </Card>
                    );
                })}
            </SimpleGrid>
        </Stack>
    );
}
