import { SimpleGrid, Card, Text, Group, Box, Button, ThemeIcon, Anchor } from '@mantine/core';
import { IconPhoto, IconFileText, IconMail, IconDownload } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const pressReleases = [
    {
        title: 'Sincla anuncia expansão para a América Latina',
        date: '20 Jan 2026',
    },
    {
        title: 'Nova rodada de investimentos de R$ 200 milhões',
        date: '15 Jan 2026',
    },
    {
        title: 'Parceria estratégica com Microsoft Azure',
        date: '10 Jan 2026',
    },
];

const mediaAssets = [
    { title: 'Logo Sincla (PNG)', type: 'Logo' },
    { title: 'Logo Sincla (SVG)', type: 'Logo' },
    { title: 'Fotos do Time Executivo', type: 'Fotos' },
    { title: 'Screenshots dos Produtos', type: 'Imagens' },
];

export function Imprensa() {
    return (
        <PageTemplate
            title="Kit de Imprensa"
            subtitle="Recursos e materiais para jornalistas e veículos de comunicação"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Imprensa' },
            ]}
        >
            {/* Contact */}
            <Card
                padding="lg"
                radius="md"
                mb="xl"
                style={{
                    background: 'linear-gradient(135deg, rgba(0, 135, 255, 0.1) 0%, rgba(0, 198, 255, 0.05) 100%)',
                    border: '1px solid rgba(0, 135, 255, 0.2)',
                }}
            >
                <Group justify="space-between" wrap="wrap">
                    <Box>
                        <Text fw={600} c="white" size="lg">Contato para Imprensa</Text>
                        <Text c="dimmed" size="sm">imprensa@sincla.com.br</Text>
                    </Box>
                    <Button
                        variant="light"
                        color="blue"
                        leftSection={<IconMail size={16} />}
                    >
                        Enviar email
                    </Button>
                </Group>
            </Card>

            {/* Press Releases */}
            <Text fw={600} size="lg" c="white" mb="md">
                Comunicados Recentes
            </Text>
            <SimpleGrid cols={{ base: 1 }} spacing="md" mb="xl">
                {pressReleases.map((item, index) => (
                    <Card
                        key={index}
                        padding="md"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            cursor: 'pointer',
                        }}
                    >
                        <Group justify="space-between">
                            <Group>
                                <ThemeIcon size={36} radius="md" variant="light" color="blue">
                                    <IconFileText size={18} />
                                </ThemeIcon>
                                <Box>
                                    <Text fw={500} c="white">{item.title}</Text>
                                    <Text size="xs" c="dimmed">{item.date}</Text>
                                </Box>
                            </Group>
                            <Anchor c="blue" size="sm">Ler mais →</Anchor>
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Media Assets */}
            <Text fw={600} size="lg" c="white" mb="md">
                Recursos de Mídia
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {mediaAssets.map((item, index) => (
                    <Card
                        key={index}
                        padding="md"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <Group justify="space-between">
                            <Group>
                                <ThemeIcon size={36} radius="md" variant="light" color="gray">
                                    <IconPhoto size={18} />
                                </ThemeIcon>
                                <Box>
                                    <Text fw={500} c="white">{item.title}</Text>
                                    <Text size="xs" c="dimmed">{item.type}</Text>
                                </Box>
                            </Group>
                            <Button variant="subtle" color="blue" size="xs" leftSection={<IconDownload size={14} />}>
                                Download
                            </Button>
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>
        </PageTemplate>
    );
}
