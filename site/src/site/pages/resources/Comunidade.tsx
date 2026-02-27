import { SimpleGrid, Card, Text, Group, Box, Button, ThemeIcon, Avatar, Badge } from '@mantine/core';
import { IconUsers, IconMessageCircle, IconBulb, IconTrophy } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const stats = [
    { value: '50.000+', label: 'Membros' },
    { value: '15.000+', label: 'Discussões' },
    { value: '98%', label: 'Perguntas respondidas' },
    { value: '24h', label: 'Tempo médio de resposta' },
];

const categories = [
    {
        icon: IconMessageCircle,
        title: 'Fórum Geral',
        description: 'Discussões gerais sobre a plataforma Sincla',
        topics: 3420,
        color: 'blue',
    },
    {
        icon: IconBulb,
        title: 'Ideias e Sugestões',
        description: 'Compartilhe suas ideias para novos recursos',
        topics: 856,
        color: 'yellow',
    },
    {
        icon: IconUsers,
        title: 'Casos de Uso',
        description: 'Aprenda como outros usuários utilizam a Sincla',
        topics: 1243,
        color: 'teal',
    },
    {
        icon: IconTrophy,
        title: 'Melhores Práticas',
        description: 'Dicas e truques dos nossos power users',
        topics: 678,
        color: 'orange',
    },
];

const topContributors = [
    { name: 'Maria Silva', points: 15420, avatar: 'MS' },
    { name: 'João Santos', points: 12350, avatar: 'JS' },
    { name: 'Ana Costa', points: 9870, avatar: 'AC' },
];

export function Comunidade() {
    return (
        <PageTemplate
            title="Comunidade Sincla"
            subtitle="Conecte-se com outros usuários, compartilhe conhecimento e aprenda junto"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Recursos', href: '/recursos' },
                { label: 'Comunidade' },
            ]}
        >
            {/* Stats */}
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md" mb="xl">
                {stats.map((stat, index) => (
                    <Card
                        key={index}
                        padding="md"
                        radius="md"
                        ta="center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0, 135, 255, 0.1) 0%, rgba(0, 198, 255, 0.05) 100%)',
                            border: '1px solid rgba(0, 135, 255, 0.2)',
                        }}
                    >
                        <Text fw={700} size="xl" c="white">{stat.value}</Text>
                        <Text size="sm" c="dimmed">{stat.label}</Text>
                    </Card>
                ))}
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                {/* Categories */}
                <Box style={{ gridColumn: 'span 2' }}>
                    <Text fw={600} size="lg" c="white" mb="md">
                        Categorias do Fórum
                    </Text>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        {categories.map((cat, index) => (
                            <Card
                                key={index}
                                padding="lg"
                                radius="md"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    cursor: 'pointer',
                                }}
                            >
                                <Group mb="sm">
                                    <ThemeIcon size={40} radius="md" variant="light" color={cat.color}>
                                        <cat.icon size={20} />
                                    </ThemeIcon>
                                    <Box>
                                        <Text fw={600} c="white">{cat.title}</Text>
                                        <Text size="xs" c="dimmed">{cat.topics} tópicos</Text>
                                    </Box>
                                </Group>
                                <Text size="sm" c="dimmed">{cat.description}</Text>
                            </Card>
                        ))}
                    </SimpleGrid>
                </Box>

                {/* Top Contributors */}
                <Box>
                    <Text fw={600} size="lg" c="white" mb="md">
                        Top Contribuidores
                    </Text>
                    <Card
                        padding="lg"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        {topContributors.map((user, index) => (
                            <Group key={index} mb={index < topContributors.length - 1 ? 'md' : 0}>
                                <Badge size="lg" circle color={index === 0 ? 'yellow' : index === 1 ? 'gray' : 'orange'}>
                                    {index + 1}
                                </Badge>
                                <Avatar radius="xl" color="blue">{user.avatar}</Avatar>
                                <Box style={{ flex: 1 }}>
                                    <Text fw={500} c="white" size="sm">{user.name}</Text>
                                    <Text size="xs" c="dimmed">{user.points.toLocaleString()} pontos</Text>
                                </Box>
                            </Group>
                        ))}
                        <Button variant="light" color="blue" fullWidth mt="lg">
                            Ver ranking completo
                        </Button>
                    </Card>
                </Box>
            </SimpleGrid>
        </PageTemplate>
    );
}
