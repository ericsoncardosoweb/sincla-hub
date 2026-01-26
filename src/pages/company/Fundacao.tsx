import { SimpleGrid, Card, Text, Group, Box, ThemeIcon, Progress } from '@mantine/core';
import { IconHeart, IconSchool, IconTree, IconUsers } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const initiatives = [
    {
        icon: IconSchool,
        title: 'Educação Digital',
        description: 'Levando tecnologia e conhecimento para comunidades carentes.',
        progress: 75,
        goal: '10.000 alunos',
    },
    {
        icon: IconTree,
        title: 'Sincla Verde',
        description: 'Compromisso com a sustentabilidade e neutralidade de carbono.',
        progress: 60,
        goal: '50.000 árvores',
    },
    {
        icon: IconUsers,
        title: 'Inclusão Tech',
        description: 'Capacitação profissional para grupos sub-representados.',
        progress: 85,
        goal: '5.000 pessoas',
    },
    {
        icon: IconHeart,
        title: 'Voluntariado',
        description: 'Programa de voluntariado corporativo com nossos colaboradores.',
        progress: 90,
        goal: '1.000 horas/mês',
    },
];

export function Fundacao() {
    return (
        <PageTemplate
            title="Fundação Sincla"
            subtitle="Nosso compromisso com a sociedade e o desenvolvimento sustentável"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Fundação Sincla' },
            ]}
        >
            <Text c="dimmed" mb="xl">
                A Fundação Sincla nasceu com o propósito de gerar impacto positivo na sociedade,
                investindo em educação, sustentabilidade e inclusão digital.
            </Text>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {initiatives.map((item, index) => (
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
                                variant="gradient"
                                gradient={{ from: '#0087ff', to: '#00c6ff' }}
                            >
                                <item.icon size={26} />
                            </ThemeIcon>
                            <Box>
                                <Text fw={600} size="lg" c="white">
                                    {item.title}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    Meta: {item.goal}
                                </Text>
                            </Box>
                        </Group>
                        <Text c="dimmed" size="sm" mb="md">
                            {item.description}
                        </Text>
                        <Progress
                            value={item.progress}
                            size="sm"
                            radius="xl"
                            color="blue"
                        />
                        <Text size="xs" c="dimmed" mt="xs" ta="right">
                            {item.progress}% concluído
                        </Text>
                    </Card>
                ))}
            </SimpleGrid>
        </PageTemplate>
    );
}
