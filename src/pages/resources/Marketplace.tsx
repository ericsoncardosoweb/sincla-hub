import { SimpleGrid, Card, Text, Group, Button, ThemeIcon, Badge, TextInput, Select } from '@mantine/core';
import { IconSearch, IconDownload, IconStar, IconPuzzle, IconApi, IconTemplate } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const categories = ['Todos', 'Integrações', 'Templates', 'Extensões', 'APIs'];

const apps = [
    {
        name: 'Slack Integration',
        category: 'Integrações',
        description: 'Receba notificações da Sincla diretamente no Slack',
        rating: 4.8,
        downloads: '12.5k',
        icon: IconApi,
        featured: true,
    },
    {
        name: 'Template de RH Completo',
        category: 'Templates',
        description: 'Pack com 50+ templates para gestão de pessoas',
        rating: 4.9,
        downloads: '8.2k',
        icon: IconTemplate,
        featured: true,
    },
    {
        name: 'WhatsApp Business',
        category: 'Integrações',
        description: 'Integre o Sincla Leads com WhatsApp Business',
        rating: 4.7,
        downloads: '15.1k',
        icon: IconApi,
        featured: false,
    },
    {
        name: 'Power BI Connector',
        category: 'Integrações',
        description: 'Conecte seus dados ao Microsoft Power BI',
        rating: 4.6,
        downloads: '6.8k',
        icon: IconApi,
        featured: false,
    },
    {
        name: 'Automação Avançada',
        category: 'Extensões',
        description: 'Regras de automação personalizadas',
        rating: 4.5,
        downloads: '4.3k',
        icon: IconPuzzle,
        featured: false,
    },
    {
        name: 'Pack de Relatórios Financeiros',
        category: 'Templates',
        description: '30+ relatórios prontos para Sincla Bolso',
        rating: 4.8,
        downloads: '5.7k',
        icon: IconTemplate,
        featured: false,
    },
];

export function Marketplace() {
    return (
        <PageTemplate
            title="Marketplace"
            subtitle="Expanda as funcionalidades da Sincla com integrações, templates e extensões"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Recursos', href: '/recursos' },
                { label: 'Marketplace' },
            ]}
        >
            {/* Search and Filter */}
            <Group mb="xl" grow>
                <TextInput
                    placeholder="Buscar apps, integrações, templates..."
                    leftSection={<IconSearch size={18} />}
                    size="md"
                    styles={{
                        input: {
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white',
                        },
                    }}
                />
                <Select
                    placeholder="Categoria"
                    data={categories}
                    size="md"
                    styles={{
                        input: {
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white',
                        },
                    }}
                />
            </Group>

            {/* Apps Grid */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {apps.map((app, index) => (
                    <Card
                        key={index}
                        padding="lg"
                        radius="md"
                        style={{
                            background: app.featured
                                ? 'linear-gradient(135deg, rgba(0, 135, 255, 0.1) 0%, rgba(0, 198, 255, 0.05) 100%)'
                                : 'rgba(255, 255, 255, 0.03)',
                            border: app.featured
                                ? '1px solid rgba(0, 135, 255, 0.3)'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <Group justify="space-between" mb="md">
                            <ThemeIcon size={50} radius="md" variant="light" color="blue">
                                <app.icon size={24} />
                            </ThemeIcon>
                            {app.featured && (
                                <Badge color="blue" variant="filled">
                                    Destaque
                                </Badge>
                            )}
                        </Group>
                        <Badge size="xs" color="gray" variant="light" mb="xs">
                            {app.category}
                        </Badge>
                        <Text fw={600} c="white" mb="xs">
                            {app.name}
                        </Text>
                        <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
                            {app.description}
                        </Text>
                        <Group justify="space-between" mb="md">
                            <Group gap={4}>
                                <IconStar size={14} color="#ffc107" fill="#ffc107" />
                                <Text size="sm" c="white">{app.rating}</Text>
                            </Group>
                            <Group gap={4}>
                                <IconDownload size={14} color="#868e96" />
                                <Text size="sm" c="dimmed">{app.downloads}</Text>
                            </Group>
                        </Group>
                        <Button variant="light" color="blue" fullWidth>
                            Instalar
                        </Button>
                    </Card>
                ))}
            </SimpleGrid>
        </PageTemplate>
    );
}
