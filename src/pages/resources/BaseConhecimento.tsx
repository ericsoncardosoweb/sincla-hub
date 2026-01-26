import { SimpleGrid, Card, Text, Group, Box, ThemeIcon, TextInput, Badge } from '@mantine/core';
import { IconBook, IconSearch, IconFileText, IconVideo, IconDownload, IconArrowRight } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const categories = [
    {
        icon: IconBook,
        title: 'Primeiros Passos',
        articles: 24,
        description: 'Guias para começar a usar a Sincla',
    },
    {
        icon: IconFileText,
        title: 'Tutoriais',
        articles: 86,
        description: 'Passo a passo detalhados',
    },
    {
        icon: IconVideo,
        title: 'Vídeo Aulas',
        articles: 45,
        description: 'Aprenda assistindo',
    },
    {
        icon: IconDownload,
        title: 'Downloads',
        articles: 15,
        description: 'Materiais e templates',
    },
];

const popularArticles = [
    { title: 'Como configurar sua conta pela primeira vez', views: 12500, category: 'Primeiros Passos' },
    { title: 'Integrando Sincla RH com seu sistema de folha', views: 8300, category: 'Integrações' },
    { title: 'Criando relatórios personalizados no Sincla Leads', views: 7200, category: 'Tutoriais' },
    { title: 'Configurando permissões e acessos de usuários', views: 6100, category: 'Administração' },
    { title: 'Importando dados de outras plataformas', views: 5800, category: 'Migração' },
];

export function BaseConhecimento() {
    return (
        <PageTemplate
            title="Base de Conhecimento"
            subtitle="Encontre respostas para suas dúvidas e aprenda a usar todas as funcionalidades"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Recursos', href: '/recursos' },
                { label: 'Base de Conhecimento' },
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
                    placeholder="Pesquisar artigos, tutoriais, vídeos..."
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
            <Text fw={600} size="lg" c="white" mb="md">
                Categorias
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
                {categories.map((cat, index) => (
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
                        <ThemeIcon size={40} radius="md" variant="light" color="blue" mb="md">
                            <cat.icon size={20} />
                        </ThemeIcon>
                        <Text fw={600} c="white" mb="xs">{cat.title}</Text>
                        <Text size="sm" c="dimmed" mb="xs">{cat.description}</Text>
                        <Text size="xs" c="blue">{cat.articles} artigos</Text>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Popular Articles */}
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
                {popularArticles.map((article, index) => (
                    <Group
                        key={index}
                        p="md"
                        justify="space-between"
                        style={{
                            borderBottom: index < popularArticles.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <Box>
                            <Group gap="xs" mb={4}>
                                <Badge size="xs" color="blue" variant="light">{article.category}</Badge>
                            </Group>
                            <Text fw={500} c="white">{article.title}</Text>
                            <Text size="xs" c="dimmed">{article.views.toLocaleString()} visualizações</Text>
                        </Box>
                        <IconArrowRight size={18} color="#868e96" />
                    </Group>
                ))}
            </Card>
        </PageTemplate>
    );
}
