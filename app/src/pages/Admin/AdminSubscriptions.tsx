import { useEffect, useState, useCallback } from 'react';
import {
    Container, Title, Text, Card, Group, Badge, Stack, Skeleton,
    Table, TextInput, SimpleGrid, ThemeIcon, Select,
} from '@mantine/core';
import {
    IconSearch, IconCreditCard, IconTrendingUp,
    IconClock, IconX,
} from '@tabler/icons-react';
import { supabase } from '../../shared/lib/supabase';

// ============================
// Types
// ============================

interface SubscriptionRow {
    id: string;
    company_id: string;
    product_id: string;
    plan: string;
    status: string;
    seats_limit: number;
    seats_used: number;
    billing_cycle: string | null;
    monthly_amount: number;
    trial_ends_at: string | null;
    canceled_at: string | null;
    current_period_end: string | null;
    created_at: string;
    company: { name: string; slug: string } | null;
    product: { name: string } | null;
}

// ============================
// Helpers
// ============================

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR');

const statusLabels: Record<string, string> = {
    active: 'Ativa',
    trial: 'Trial',
    past_due: 'Em atraso',
    canceled: 'Cancelada',
    suspended: 'Suspensa',
};

const statusColors: Record<string, string> = {
    active: 'green',
    trial: 'blue',
    past_due: 'orange',
    canceled: 'red',
    suspended: 'gray',
};

const planLabels: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business',
    enterprise: 'Enterprise',
};

// ============================
// Component
// ============================

export function AdminSubscriptions() {
    const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [filterProduct, setFilterProduct] = useState<string | null>(null);
    const [products, setProducts] = useState<{ value: string; label: string }[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Load products for filter
            const { data: prods } = await supabase
                .from('products')
                .select('id, name')
                .order('name');
            setProducts((prods || []).map(p => ({ value: p.id, label: p.name })));

            // Load subscriptions
            let query = supabase
                .from('subscriptions')
                .select(`
                    id, company_id, product_id, plan, status, seats_limit, seats_used,
                    billing_cycle, monthly_amount, trial_ends_at, canceled_at,
                    current_period_end, created_at,
                    company:companies!company_id (name, slug),
                    product:products!product_id (name)
                `)
                .order('created_at', { ascending: false })
                .limit(200);

            if (filterStatus) {
                query = query.eq('status', filterStatus);
            }
            if (filterProduct) {
                query = query.eq('product_id', filterProduct);
            }

            const { data } = await query;
            const mapped = (data || []).map((s: any) => ({
                ...s,
                company: Array.isArray(s.company) ? s.company[0] : s.company,
                product: Array.isArray(s.product) ? s.product[0] : s.product,
            }));

            setSubscriptions(mapped);
        } catch (error) {
            console.error('Error loading subscriptions:', error);
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterProduct]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filtered = subscriptions.filter(s =>
        !search.trim() ||
        (s.company?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.company?.slug || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.product?.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = subscriptions.filter(s => s.status === 'active').length;
    const trialCount = subscriptions.filter(s => s.status === 'trial').length;
    const canceledCount = subscriptions.filter(s => s.status === 'canceled').length;
    const mrr = subscriptions
        .filter(s => s.status === 'active' || s.status === 'trial')
        .reduce((sum, s) => sum + (s.monthly_amount || 0), 0);

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <div>
                    <Title order={2}>Assinaturas</Title>
                    <Text c="dimmed">Todas as assinaturas de produtos na plataforma</Text>
                </div>

                {/* KPIs */}
                {loading ? (
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                        {Array(4).fill(0).map((_, i) => <Skeleton key={i} height={90} radius="md" />)}
                    </SimpleGrid>
                ) : (
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="green">
                                    <IconCreditCard size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Ativas</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs" c="green">{activeCount}</Text>
                        </Card>
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="blue">
                                    <IconClock size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Em Trial</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs" c="blue">{trialCount}</Text>
                        </Card>
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="red">
                                    <IconX size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Canceladas</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs" c="red">{canceledCount}</Text>
                        </Card>
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="teal">
                                    <IconTrendingUp size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">MRR</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs" c="teal">{formatCurrency(mrr)}</Text>
                            <Text size="xs" c="dimmed">ARR: {formatCurrency(mrr * 12)}</Text>
                        </Card>
                    </SimpleGrid>
                )}

                {/* Filters */}
                <Group>
                    <TextInput
                        placeholder="Buscar por empresa ou produto..."
                        leftSection={<IconSearch size={16} />}
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        style={{ flex: 1 }}
                    />
                    <Select
                        placeholder="Status"
                        data={[
                            { value: 'active', label: 'Ativa' },
                            { value: 'trial', label: 'Trial' },
                            { value: 'past_due', label: 'Em atraso' },
                            { value: 'canceled', label: 'Cancelada' },
                            { value: 'suspended', label: 'Suspensa' },
                        ]}
                        value={filterStatus}
                        onChange={setFilterStatus}
                        clearable
                        w={160}
                    />
                    <Select
                        placeholder="Produto"
                        data={products}
                        value={filterProduct}
                        onChange={setFilterProduct}
                        clearable
                        w={180}
                    />
                </Group>

                {/* Table */}
                {loading ? (
                    <Stack gap="sm">
                        {[1, 2, 3].map(i => <Skeleton key={i} height={55} radius="md" />)}
                    </Stack>
                ) : filtered.length === 0 ? (
                    <Card shadow="sm" padding="xl" radius="md" withBorder>
                        <Text ta="center" c="dimmed">Nenhuma assinatura encontrada.</Text>
                    </Card>
                ) : (
                    <Card shadow="sm" padding={0} radius="md" withBorder>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Empresa</Table.Th>
                                    <Table.Th>Produto</Table.Th>
                                    <Table.Th>Plano</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Seats</Table.Th>
                                    <Table.Th>Valor/mês</Table.Th>
                                    <Table.Th>Ciclo</Table.Th>
                                    <Table.Th>Desde</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filtered.map(sub => (
                                    <Table.Tr key={sub.id}>
                                        <Table.Td>
                                            <div>
                                                <Text size="sm" fw={500}>{sub.company?.name || '—'}</Text>
                                                <Text size="xs" c="dimmed">{sub.company?.slug || ''}</Text>
                                            </div>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge variant="light" color="violet" size="sm">
                                                {sub.product?.name || sub.product_id}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge variant="dot" size="sm">
                                                {planLabels[sub.plan] || sub.plan}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={statusColors[sub.status] || 'gray'}
                                                variant="light"
                                                size="sm"
                                            >
                                                {statusLabels[sub.status] || sub.status}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">
                                                {sub.seats_used}/{sub.seats_limit}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={600}>
                                                {sub.monthly_amount > 0 ? formatCurrency(sub.monthly_amount) : '—'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">
                                                {sub.billing_cycle === 'yearly' ? 'Anual' : 'Mensal'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{formatDate(sub.created_at)}</Text>
                                            {sub.status === 'trial' && sub.trial_ends_at && (
                                                <Text size="xs" c="blue">
                                                    Trial até {formatDate(sub.trial_ends_at)}
                                                </Text>
                                            )}
                                            {sub.status === 'canceled' && sub.canceled_at && (
                                                <Text size="xs" c="red">
                                                    Cancelada em {formatDate(sub.canceled_at)}
                                                </Text>
                                            )}
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                )}

                <Text size="xs" c="dimmed" ta="right">
                    Exibindo {filtered.length} de {subscriptions.length} assinaturas
                </Text>
            </Stack>
        </Container>
    );
}
