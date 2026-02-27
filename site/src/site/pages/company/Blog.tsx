import { SimpleGrid, Card, Text, Badge, Group } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const posts = [
    {
        title: 'Como a automação está transformando o RH em 2026',
        category: 'Tendências',
        date: '20 Jan 2026',
        readTime: '5 min',
        excerpt: 'Descubra as principais tendências de automação que estão revolucionando a gestão de pessoas.',
    },
    {
        title: '10 dicas para aumentar a produtividade da sua equipe',
        category: 'Produtividade',
        date: '18 Jan 2026',
        readTime: '7 min',
        excerpt: 'Estratégias comprovadas para melhorar o desempenho e engajamento do seu time.',
    },
    {
        title: 'O guia completo do Sincla Leads para iniciantes',
        category: 'Tutorial',
        date: '15 Jan 2026',
        readTime: '10 min',
        excerpt: 'Aprenda a configurar e utilizar todas as funcionalidades do Sincla Leads.',
    },
    {
        title: 'Case de sucesso: Como a TechCorp triplicou suas vendas',
        category: 'Cases',
        date: '12 Jan 2026',
        readTime: '6 min',
        excerpt: 'Conheça a história de transformação digital de um dos nossos clientes.',
    },
    {
        title: 'Novidades do Sincla EAD: Inteligência Artificial aplicada',
        category: 'Produto',
        date: '10 Jan 2026',
        readTime: '4 min',
        excerpt: 'Conheça as novas funcionalidades de IA que chegaram ao Sincla EAD.',
    },
    {
        title: 'Gestão financeira simplificada com Sincla Bolso',
        category: 'Tutorial',
        date: '08 Jan 2026',
        readTime: '8 min',
        excerpt: 'Um passo a passo completo para organizar as finanças da sua empresa.',
    },
];

const categoryColors: Record<string, string> = {
    'Tendências': 'violet',
    'Produtividade': 'teal',
    'Tutorial': 'blue',
    'Cases': 'orange',
    'Produto': 'pink',
};

export function Blog() {
    return (
        <PageTemplate
            title="Blog"
            subtitle="Insights, tutoriais e novidades do mundo da gestão empresarial"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Blog' },
            ]}
        >
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {posts.map((post, index) => (
                    <Card
                        key={index}
                        padding="lg"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s, border-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.borderColor = 'rgba(0, 135, 255, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        }}
                    >
                        <Badge color={categoryColors[post.category] || 'gray'} variant="light" mb="sm">
                            {post.category}
                        </Badge>
                        <Text fw={600} size="md" c="white" lineClamp={2}>
                            {post.title}
                        </Text>
                        <Text size="sm" c="dimmed" mt="xs" lineClamp={2}>
                            {post.excerpt}
                        </Text>
                        <Group gap="lg" mt="md">
                            <Text size="xs" c="dimmed">{post.date}</Text>
                            <Group gap="xs">
                                <IconClock size={14} color="#868e96" />
                                <Text size="xs" c="dimmed">{post.readTime}</Text>
                            </Group>
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>
        </PageTemplate>
    );
}
