import { SimpleGrid, Card, Text, Group, Box, Button, ThemeIcon, TextInput } from '@mantine/core';
import { IconHeadset, IconMessageCircle, IconMail, IconPhone, IconSearch } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const supportChannels = [
    {
        icon: IconMessageCircle,
        title: 'Chat ao Vivo',
        description: 'Converse com nosso time em tempo real',
        availability: 'Seg-Sex, 8h-20h',
        action: 'Iniciar chat',
        color: 'teal',
    },
    {
        icon: IconMail,
        title: 'Email',
        description: 'Envie sua dúvida por email',
        availability: 'Resposta em até 24h',
        action: 'Enviar email',
        color: 'blue',
    },
    {
        icon: IconPhone,
        title: 'Telefone',
        description: 'Ligue para nossa central',
        availability: 'Seg-Sex, 9h-18h',
        action: 'Ver número',
        color: 'violet',
    },
    {
        icon: IconHeadset,
        title: 'Suporte Premium',
        description: 'Atendimento prioritário 24/7',
        availability: 'Para clientes Enterprise',
        action: 'Saiba mais',
        color: 'orange',
    },
];

export function Suporte() {
    return (
        <PageTemplate
            title="Suporte Técnico"
            subtitle="Estamos aqui para ajudar você a aproveitar ao máximo a Sincla"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Recursos', href: '/recursos' },
                { label: 'Suporte' },
            ]}
        >
            {/* Search */}
            <Card
                padding="lg"
                radius="md"
                mb="xl"
                style={{
                    background: 'linear-gradient(135deg, rgba(0, 135, 255, 0.1) 0%, rgba(0, 198, 255, 0.05) 100%)',
                    border: '1px solid rgba(0, 135, 255, 0.2)',
                }}
            >
                <Text fw={600} c="white" mb="md">Como podemos ajudar?</Text>
                <TextInput
                    placeholder="Pesquise sua dúvida..."
                    leftSection={<IconSearch size={18} />}
                    size="lg"
                    styles={{
                        input: {
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: 'white',
                        },
                    }}
                />
            </Card>

            {/* Support Channels */}
            <Text fw={600} size="lg" c="white" mb="md">
                Canais de Atendimento
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                {supportChannels.map((channel, index) => (
                    <Card
                        key={index}
                        padding="lg"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <Group mb="md">
                            <ThemeIcon
                                size={50}
                                radius="md"
                                variant="light"
                                color={channel.color}
                            >
                                <channel.icon size={26} />
                            </ThemeIcon>
                            <Box>
                                <Text fw={600} c="white">{channel.title}</Text>
                                <Text size="xs" c="dimmed">{channel.availability}</Text>
                            </Box>
                        </Group>
                        <Text c="dimmed" size="sm" mb="md">
                            {channel.description}
                        </Text>
                        <Button variant="light" color={channel.color} fullWidth>
                            {channel.action}
                        </Button>
                    </Card>
                ))}
            </SimpleGrid>
        </PageTemplate>
    );
}
