import { useEffect, useState } from 'react';
import {
    Text, Card, Group, Badge, Stack, Skeleton,
    Table, Avatar, TextInput,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';

interface ReferredClient {
    id: string;
    name: string;
    email: string;
    created_at: string;
    activated_at: string | null;
    companies: {
        id: string;
        name: string;
        subscriptions: {
            product_id: string;
            status: string;
            monthly_amount: number;
            created_at: string;
        }[];
    }[];
}

export function PartnerClients() {
    const { subscriber } = useAuth();
    const [clients, setClients] = useState<ReferredClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadClients();
    }, [subscriber]);

    const loadClients = async () => {
        if (!subscriber) return;
        setLoading(true);
        try {
            // Get partner id
            const { data: partner } = await supabase
                .from('partners')
                .select('id')
                .eq('user_id', subscriber.id)
                .single();

            if (!partner) return;

            // Get referred subscribers with their companies and subscriptions
            const { data: referred } = await supabase
                .from('subscribers')
                .select(`
                    id, name, email, created_at, activated_at,
                    companies:companies!subscriber_id (
                        id, name,
                        subscriptions (product_id, status, monthly_amount, created_at)
                    )
                `)
                .eq('referred_by', partner.id)
                .order('created_at', { ascending: false });

            setClients(referred || []);
        } catch (error) {
            console.error('Error loading clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const isEligible = (client: ReferredClient) => {
        return client.companies?.some(c =>
            c.subscriptions?.some(s =>
                s.status === 'active' &&
                new Date(s.created_at) <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            )
        );
    };

    const getActiveSubscriptions = (client: ReferredClient) => {
        return client.companies?.flatMap(c =>
            c.subscriptions?.filter(s => s.status === 'active') || []
        ) || [];
    };

    const getMonthlyRevenue = (client: ReferredClient) => {
        return getActiveSubscriptions(client)
            .reduce((sum, s) => sum + (s.monthly_amount || 0), 0);
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('pt-BR');

    const filteredClients = clients.filter(c =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Stack gap="lg">
            <Text c="dimmed">{clients.length} cliente{clients.length !== 1 ? 's' : ''} no total</Text>

            <TextInput
                placeholder="Buscar por nome ou email..."
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
            />

            {loading ? (
                <Stack gap="sm">
                    {[1, 2, 3].map(i => <Skeleton key={i} height={60} radius="md" />)}
                </Stack>
            ) : filteredClients.length === 0 ? (
                <Card shadow="sm" padding="xl" radius="md" withBorder>
                    <Text ta="center" c="dimmed">
                        {clients.length === 0
                            ? 'Você ainda não indicou nenhum cliente. Compartilhe seu link de afiliado!'
                            : 'Nenhum cliente encontrado com esse filtro.'}
                    </Text>
                </Card>
            ) : (
                <Card shadow="sm" padding={0} radius="md" withBorder>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Cliente</Table.Th>
                                <Table.Th>Cadastro</Table.Th>
                                <Table.Th>Assinaturas</Table.Th>
                                <Table.Th>Receita/mês</Table.Th>
                                <Table.Th>Status</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredClients.map(client => {
                                const activeSubs = getActiveSubscriptions(client);
                                const revenue = getMonthlyRevenue(client);
                                const eligible = isEligible(client);

                                return (
                                    <Table.Tr key={client.id}>
                                        <Table.Td>
                                            <Group gap="sm">
                                                <Avatar radius="xl" size="sm" color="blue">
                                                    {(client.name || client.email || '?').charAt(0).toUpperCase()}
                                                </Avatar>
                                                <div>
                                                    <Text size="sm" fw={500}>{client.name || 'Sem nome'}</Text>
                                                    <Text size="xs" c="dimmed">{client.email}</Text>
                                                </div>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{formatDate(client.created_at)}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge color={activeSubs.length > 0 ? 'blue' : 'gray'} variant="light">
                                                {activeSubs.length} ativa{activeSubs.length !== 1 ? 's' : ''}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={500}>{formatCurrency(revenue)}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge color={eligible ? 'green' : 'orange'} variant="light">
                                                {eligible ? 'Elegível' : 'Aguardando 30d'}
                                            </Badge>
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                </Card>
            )}
        </Stack>
    );
}
