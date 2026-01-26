import { Card, Text, Group, Box, Button, TextInput, Textarea, Select, FileInput, ThemeIcon, Badge, Timeline } from '@mantine/core';
import { IconTicket, IconUpload, IconSend, IconClock, IconCheck } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const recentTickets = [
    {
        id: '#12345',
        title: 'Erro ao exportar relatório',
        status: 'Em andamento',
        date: '24 Jan 2026',
        color: 'yellow',
    },
    {
        id: '#12344',
        title: 'Dúvida sobre integração API',
        status: 'Resolvido',
        date: '20 Jan 2026',
        color: 'teal',
    },
    {
        id: '#12343',
        title: 'Problema de acesso',
        status: 'Resolvido',
        date: '15 Jan 2026',
        color: 'teal',
    },
];

export function TicketSuporte() {
    return (
        <PageTemplate
            title="Criar Ticket de Suporte"
            subtitle="Descreva seu problema e nossa equipe entrará em contato"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Recursos', href: '/recursos' },
                { label: 'Suporte', href: '/suporte' },
                { label: 'Novo Ticket' },
            ]}
        >
            <Group align="flex-start" gap="xl" wrap="wrap">
                {/* Form */}
                <Box style={{ flex: 2, minWidth: 300 }}>
                    <Card
                        padding="xl"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <Group mb="lg">
                            <ThemeIcon size={40} radius="md" variant="light" color="blue">
                                <IconTicket size={20} />
                            </ThemeIcon>
                            <Text fw={600} c="white" size="lg">Novo Ticket</Text>
                        </Group>

                        <form>
                            <Select
                                label="Produto"
                                placeholder="Selecione o produto"
                                mb="md"
                                data={['Sincla RH', 'Sincla EAD', 'Sincla Bolso', 'Sincla Leads', 'Sincla Agenda', 'Sincla Intranet', 'Outro']}
                                styles={{
                                    input: {
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'white',
                                    },
                                }}
                            />

                            <Select
                                label="Prioridade"
                                placeholder="Selecione a prioridade"
                                mb="md"
                                data={[
                                    { value: 'low', label: 'Baixa - Dúvida geral' },
                                    { value: 'medium', label: 'Média - Funcionalidade não opera corretamente' },
                                    { value: 'high', label: 'Alta - Sistema indisponível' },
                                ]}
                                styles={{
                                    input: {
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'white',
                                    },
                                }}
                            />

                            <TextInput
                                label="Assunto"
                                placeholder="Resumo do problema"
                                mb="md"
                                styles={{
                                    input: {
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'white',
                                    },
                                }}
                            />

                            <Textarea
                                label="Descrição"
                                placeholder="Descreva o problema em detalhes. Inclua passos para reproduzir o erro, mensagens de erro, etc."
                                rows={6}
                                mb="md"
                                styles={{
                                    input: {
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'white',
                                    },
                                }}
                            />

                            <FileInput
                                label="Anexos"
                                placeholder="Clique para anexar arquivos"
                                leftSection={<IconUpload size={18} />}
                                mb="xl"
                                multiple
                                accept="image/*,.pdf,.doc,.docx"
                                styles={{
                                    input: {
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'white',
                                    },
                                }}
                            />

                            <Button
                                fullWidth
                                variant="gradient"
                                gradient={{ from: '#0087ff', to: '#00c6ff' }}
                                leftSection={<IconSend size={18} />}
                                size="md"
                            >
                                Enviar Ticket
                            </Button>
                        </form>
                    </Card>
                </Box>

                {/* Recent Tickets */}
                <Box style={{ flex: 1, minWidth: 280 }}>
                    <Card
                        padding="lg"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <Text fw={600} c="white" mb="lg">Seus Tickets Recentes</Text>

                        <Timeline active={0} bulletSize={24} lineWidth={2}>
                            {recentTickets.map((ticket, index) => (
                                <Timeline.Item
                                    key={index}
                                    bullet={
                                        ticket.status === 'Resolvido' ? (
                                            <IconCheck size={12} />
                                        ) : (
                                            <IconClock size={12} />
                                        )
                                    }
                                    color={ticket.color}
                                    title={
                                        <Group gap="xs">
                                            <Text size="sm" c="white">{ticket.id}</Text>
                                            <Badge size="xs" color={ticket.color} variant="light">
                                                {ticket.status}
                                            </Badge>
                                        </Group>
                                    }
                                >
                                    <Text c="dimmed" size="sm">{ticket.title}</Text>
                                    <Text size="xs" c="dimmed" mt={4}>{ticket.date}</Text>
                                </Timeline.Item>
                            ))}
                        </Timeline>

                        <Button variant="subtle" color="blue" fullWidth mt="lg">
                            Ver todos os tickets
                        </Button>
                    </Card>
                </Box>
            </Group>
        </PageTemplate>
    );
}
