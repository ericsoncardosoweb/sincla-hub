import { SimpleGrid, Card, Text, Badge, Group, Button } from '@mantine/core';
import { IconCalendar, IconMapPin } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const events = [
    {
        title: 'Sincla Summit 2026',
        date: '15-17 Mar 2026',
        location: 'São Paulo, SP',
        type: 'Presencial',
        description: 'O maior evento de gestão empresarial do Brasil.',
    },
    {
        title: 'Webinar: Tendências de RH 2026',
        date: '28 Jan 2026',
        location: 'Online',
        type: 'Virtual',
        description: 'Descubra as principais tendências de gestão de pessoas.',
    },
    {
        title: 'Workshop: Automação de Processos',
        date: '10 Fev 2026',
        location: 'Online',
        type: 'Virtual',
        description: 'Aprenda a automatizar processos com a Sincla.',
    },
    {
        title: 'Meetup Desenvolvedores Sincla',
        date: '22 Fev 2026',
        location: 'Rio de Janeiro, RJ',
        type: 'Presencial',
        description: 'Encontro da comunidade de desenvolvedores.',
    },
];

export function Eventos() {
    return (
        <PageTemplate
            title="Eventos"
            subtitle="Participe dos nossos eventos e conecte-se com a comunidade Sincla"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Eventos' },
            ]}
        >
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {events.map((event, index) => (
                    <Card
                        key={index}
                        padding="lg"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <Group justify="space-between" mb="xs">
                            <Badge color={event.type === 'Virtual' ? 'teal' : 'blue'} variant="light">
                                {event.type}
                            </Badge>
                        </Group>
                        <Text fw={600} size="lg" c="white" mt="xs">
                            {event.title}
                        </Text>
                        <Text size="sm" c="dimmed" mt="xs">
                            {event.description}
                        </Text>
                        <Group gap="lg" mt="md">
                            <Group gap="xs">
                                <IconCalendar size={16} color="#868e96" />
                                <Text size="sm" c="dimmed">{event.date}</Text>
                            </Group>
                            <Group gap="xs">
                                <IconMapPin size={16} color="#868e96" />
                                <Text size="sm" c="dimmed">{event.location}</Text>
                            </Group>
                        </Group>
                        <Button variant="light" color="blue" fullWidth mt="md">
                            Inscrever-se
                        </Button>
                    </Card>
                ))}
            </SimpleGrid>
        </PageTemplate>
    );
}
