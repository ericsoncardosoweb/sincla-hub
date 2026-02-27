import { SimpleGrid, Card, Text, Group, Box, Button, ThemeIcon, TextInput, Badge } from '@mantine/core';
import { IconBook, IconSearch, IconApi, IconCode, IconFileText, IconExternalLink, IconArrowRight } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const docCategories = [
    {
        icon: IconBook,
        title: 'Guia do Usuário',
        description: 'Documentação completa para usuários finais',
        articles: 150,
        href: '#',
    },
    {
        icon: IconApi,
        title: 'API Reference',
        description: 'Referência completa da API REST',
        articles: 89,
        href: '#',
    },
    {
        icon: IconCode,
        title: 'SDK & Libraries',
        description: 'SDKs para diferentes linguagens',
        articles: 24,
        href: '#',
    },
    {
        icon: IconFileText,
        title: 'Webhooks & Events',
        description: 'Guia de integração via webhooks',
        articles: 35,
        href: '#',
    },
];

const quickLinks = [
    { title: 'Primeiros passos com a API', category: 'API' },
    { title: 'Autenticação OAuth 2.0', category: 'Segurança' },
    { title: 'Rate limits e boas práticas', category: 'API' },
    { title: 'SDK JavaScript - Guia rápido', category: 'SDK' },
    { title: 'Configurando webhooks', category: 'Integração' },
    { title: 'Migração de dados', category: 'Guia' },
];

const sdks = [
    { name: 'JavaScript/TypeScript', version: 'v2.5.0' },
    { name: 'Python', version: 'v2.3.1' },
    { name: 'PHP', version: 'v2.1.0' },
    { name: 'Ruby', version: 'v1.8.2' },
    { name: 'Java', version: 'v2.0.0' },
    { name: 'C#/.NET', version: 'v2.2.1' },
];

export function Documentacao() {
    return (
        <PageTemplate
            title="Documentação"
            subtitle="Tudo que você precisa saber para integrar e utilizar a plataforma Sincla"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Saiba Mais' },
                { label: 'Documentação' },
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
                <TextInput
                    placeholder="Buscar na documentação..."
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

            {/* Categories */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" mb="xl">
                {docCategories.map((cat, index) => (
                    <Card
                        key={index}
                        padding="lg"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s, transform 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(0, 135, 255, 0.3)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <ThemeIcon size={40} radius="md" variant="light" color="blue" mb="md">
                            <cat.icon size={20} />
                        </ThemeIcon>
                        <Text fw={600} c="white" mb="xs">{cat.title}</Text>
                        <Text size="sm" c="dimmed" mb="xs">{cat.description}</Text>
                        <Text size="xs" c="blue">{cat.articles} artigos</Text>
                    </Card>
                ))}
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                {/* Quick Links */}
                <Box>
                    <Text fw={600} size="lg" c="white" mb="md">
                        Artigos Populares
                    </Text>
                    <Card
                        padding={0}
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            overflow: 'hidden',
                        }}
                    >
                        {quickLinks.map((link, index) => (
                            <Group
                                key={index}
                                p="md"
                                justify="space-between"
                                style={{
                                    borderBottom: index < quickLinks.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <Group gap="xs">
                                    <Badge size="xs" color="blue" variant="light">{link.category}</Badge>
                                    <Text size="sm" c="white">{link.title}</Text>
                                </Group>
                                <IconArrowRight size={16} color="#868e96" />
                            </Group>
                        ))}
                    </Card>
                </Box>

                {/* SDKs */}
                <Box>
                    <Text fw={600} size="lg" c="white" mb="md">
                        SDKs Disponíveis
                    </Text>
                    <Card
                        padding="lg"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <SimpleGrid cols={2} spacing="md">
                            {sdks.map((sdk, index) => (
                                <Group key={index} justify="space-between">
                                    <Group gap="xs">
                                        <IconCode size={16} color="#0087ff" />
                                        <Text size="sm" c="white">{sdk.name}</Text>
                                    </Group>
                                    <Badge size="xs" color="gray" variant="light">{sdk.version}</Badge>
                                </Group>
                            ))}
                        </SimpleGrid>
                        <Button
                            variant="light"
                            color="blue"
                            fullWidth
                            mt="lg"
                            rightSection={<IconExternalLink size={16} />}
                        >
                            Ver no GitHub
                        </Button>
                    </Card>
                </Box>
            </SimpleGrid>
        </PageTemplate>
    );
}
