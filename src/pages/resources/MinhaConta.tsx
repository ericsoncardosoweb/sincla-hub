import { SimpleGrid, Card, Text, Group, Box, Button, ThemeIcon, Avatar, Badge, Progress } from '@mantine/core';
import { IconUser, IconCreditCard, IconLock, IconBell, IconDevices, IconReceipt } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const menuItems = [
    {
        icon: IconUser,
        title: 'Perfil',
        description: 'Informações pessoais e foto',
        action: 'Editar perfil',
    },
    {
        icon: IconLock,
        title: 'Segurança',
        description: 'Senha, 2FA e sessões ativas',
        action: 'Gerenciar',
    },
    {
        icon: IconCreditCard,
        title: 'Assinatura',
        description: 'Plano Professional - Ativo',
        action: 'Ver plano',
        badge: 'Ativo',
    },
    {
        icon: IconReceipt,
        title: 'Faturas',
        description: 'Histórico de pagamentos',
        action: 'Ver faturas',
    },
    {
        icon: IconBell,
        title: 'Notificações',
        description: 'Preferências de alertas',
        action: 'Configurar',
    },
    {
        icon: IconDevices,
        title: 'Dispositivos',
        description: '3 dispositivos conectados',
        action: 'Gerenciar',
    },
];

export function MinhaConta() {
    return (
        <PageTemplate
            title="Minha Conta"
            subtitle="Gerencie suas informações pessoais e configurações"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Recursos', href: '/recursos' },
                { label: 'Minha Conta' },
            ]}
        >
            {/* Profile Card */}
            <Card
                padding="xl"
                radius="md"
                mb="xl"
                style={{
                    background: 'linear-gradient(135deg, rgba(0, 135, 255, 0.1) 0%, rgba(0, 198, 255, 0.05) 100%)',
                    border: '1px solid rgba(0, 135, 255, 0.2)',
                }}
            >
                <Group justify="space-between" wrap="wrap">
                    <Group>
                        <Avatar size={80} radius="xl" color="blue">US</Avatar>
                        <Box>
                            <Text fw={700} size="xl" c="white">Usuário Sincla</Text>
                            <Text c="dimmed">usuario@empresa.com.br</Text>
                            <Badge color="blue" variant="light" mt="xs">Professional</Badge>
                        </Box>
                    </Group>
                    <Box>
                        <Text size="sm" c="dimmed" mb="xs">Uso do armazenamento</Text>
                        <Progress value={65} size="sm" radius="xl" color="blue" style={{ width: 200 }} />
                        <Text size="xs" c="dimmed" mt="xs">32.5 GB de 50 GB utilizados</Text>
                    </Box>
                </Group>
            </Card>

            {/* Menu Items */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {menuItems.map((item, index) => (
                    <Card
                        key={index}
                        padding="lg"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s',
                        }}
                    >
                        <Group justify="space-between" mb="md">
                            <ThemeIcon size={40} radius="md" variant="light" color="blue">
                                <item.icon size={20} />
                            </ThemeIcon>
                            {item.badge && (
                                <Badge color="teal" variant="light">{item.badge}</Badge>
                            )}
                        </Group>
                        <Text fw={600} c="white" mb="xs">{item.title}</Text>
                        <Text size="sm" c="dimmed" mb="md">{item.description}</Text>
                        <Button variant="subtle" color="blue" size="xs" fullWidth>
                            {item.action}
                        </Button>
                    </Card>
                ))}
            </SimpleGrid>
        </PageTemplate>
    );
}
