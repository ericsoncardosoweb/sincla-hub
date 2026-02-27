import { SimpleGrid, Card, Text, Group, Box, Button, ThemeIcon } from '@mantine/core';
import { IconFileText, IconDownload } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const reports = [
    {
        title: 'Relatório Anual 2025',
        type: 'Relatório Financeiro',
        date: 'Dez 2025',
    },
    {
        title: 'Resultados Q4 2025',
        type: 'Trimestral',
        date: 'Jan 2026',
    },
    {
        title: 'Apresentação Institucional',
        type: 'Apresentação',
        date: 'Jan 2026',
    },
    {
        title: 'Governança Corporativa',
        type: 'Documento',
        date: 'Nov 2025',
    },
];

const highlights = [
    { label: 'Receita Anual', value: 'R$ 150M+' },
    { label: 'Crescimento YoY', value: '85%' },
    { label: 'Clientes Ativos', value: '50.000+' },
    { label: 'NPS Score', value: '78' },
];

export function Investidores() {
    return (
        <PageTemplate
            title="Relações com Investidores"
            subtitle="Transparência e compromisso com nossos acionistas e stakeholders"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Investidores' },
            ]}
        >
            {/* Highlights */}
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg" mb="xl">
                {highlights.map((item, index) => (
                    <Card
                        key={index}
                        padding="lg"
                        radius="md"
                        ta="center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0, 135, 255, 0.1) 0%, rgba(0, 198, 255, 0.05) 100%)',
                            border: '1px solid rgba(0, 135, 255, 0.2)',
                        }}
                    >
                        <Text size="xl" fw={700} c="white">
                            {item.value}
                        </Text>
                        <Text size="sm" c="dimmed">
                            {item.label}
                        </Text>
                    </Card>
                ))}
            </SimpleGrid>

            <Text fw={600} size="lg" c="white" mb="md">
                Documentos e Relatórios
            </Text>

            {/* Reports */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {reports.map((report, index) => (
                    <Card
                        key={index}
                        padding="lg"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <Group justify="space-between">
                            <Group>
                                <ThemeIcon size={40} radius="md" variant="light" color="blue">
                                    <IconFileText size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text fw={600} c="white">{report.title}</Text>
                                    <Text size="xs" c="dimmed">{report.type} • {report.date}</Text>
                                </Box>
                            </Group>
                            <Button variant="subtle" color="blue" leftSection={<IconDownload size={16} />}>
                                Download
                            </Button>
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>
        </PageTemplate>
    );
}
