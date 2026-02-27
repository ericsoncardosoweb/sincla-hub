import { useEffect, useState } from 'react';
import {
    Container,
    Title,
    Text,
    SimpleGrid,
    Card,
    Group,
    Stack,
    ThemeIcon,
    Skeleton,
    Table,
    Badge,
    Progress,
} from '@mantine/core';
import {
    IconPackage,
    IconUsers,
    IconCreditCard,
    IconBuilding,
    IconTrendingUp,
    IconCash,
    IconUserPlus,
} from '@tabler/icons-react';
import { supabase } from '../../shared/lib/supabase';

// ============================
// Types
// ============================

interface DashboardStats {
    totalProducts: number;
    totalSubscribers: number;
    totalCompanies: number;
    activeSubscriptions: number;
    mrr: number;
    arr: number;
}

interface RecentSubscription {
    id: string;
    company_name: string;
    product_name: string;
    plan: string;
    status: string;
    monthly_amount: number;
    created_at: string;
}

interface RecentActivity {
    type: 'subscriber' | 'company';
    name: string;
    email?: string;
    created_at: string;
}

interface ProductStat {
    id: string;
    name: string;
    icon: string;
    subscriptions_count: number;
    active_count: number;
    mrr: number;
}

// ============================
// Helpers
// ============================

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);



const formatRelative = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}min atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
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
    free: 'Free',
    team: 'Team',
};

// ============================
// Component
// ============================

export function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentSubs, setRecentSubs] = useState<RecentSubscription[]>([]);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [productStats, setProductStats] = useState<ProductStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadStats(),
                loadRecentSubscriptions(),
                loadRecentActivity(),
                loadProductStats(),
            ]);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        const [products, subscribers, companies, subscriptions] = await Promise.all([
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('subscribers').select('*', { count: 'exact', head: true }),
            supabase.from('companies').select('*', { count: 'exact', head: true }),
            supabase.from('subscriptions').select('monthly_amount').eq('status', 'active'),
        ]);

        const mrr = (subscriptions.data || []).reduce(
            (sum, sub) => sum + (sub.monthly_amount || 0), 0
        );

        setStats({
            totalProducts: products.count || 0,
            totalSubscribers: subscribers.count || 0,
            totalCompanies: companies.count || 0,
            activeSubscriptions: subscriptions.data?.length || 0,
            mrr,
            arr: mrr * 12,
        });
    };

    const loadRecentSubscriptions = async () => {
        const { data } = await supabase
            .from('subscriptions')
            .select(`
                id, plan, status, monthly_amount, created_at,
                companies!inner(name),
                products!inner(name)
            `)
            .order('created_at', { ascending: false })
            .limit(8);

        if (data) {
            setRecentSubs(data.map((s: any) => ({
                id: s.id,
                company_name: s.companies?.name || '—',
                product_name: s.products?.name || '—',
                plan: s.plan || 'starter',
                status: s.status,
                monthly_amount: s.monthly_amount || 0,
                created_at: s.created_at,
            })));
        }
    };

    const loadRecentActivity = async () => {
        const [subs, comps] = await Promise.all([
            supabase
                .from('subscribers')
                .select('name, email, created_at')
                .order('created_at', { ascending: false })
                .limit(5),
            supabase
                .from('companies')
                .select('name, created_at')
                .order('created_at', { ascending: false })
                .limit(5),
        ]);

        const activities: RecentActivity[] = [
            ...(subs.data || []).map((s: any) => ({
                type: 'subscriber' as const,
                name: s.name || s.email?.split('@')[0],
                email: s.email,
                created_at: s.created_at,
            })),
            ...(comps.data || []).map((c: any) => ({
                type: 'company' as const,
                name: c.name,
                created_at: c.created_at,
            })),
        ];

        activities.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setRecentActivity(activities.slice(0, 8));
    };

    const loadProductStats = async () => {
        const { data: products } = await supabase
            .from('products')
            .select('id, name, icon')
            .eq('is_active', true)
            .order('name');

        if (!products) return;

        const { data: subscriptions } = await supabase
            .from('subscriptions')
            .select('product_id, status, monthly_amount');

        const statsMap: Record<string, ProductStat> = {};
        products.forEach((p: any) => {
            statsMap[p.id] = {
                id: p.id,
                name: p.name,
                icon: p.icon,
                subscriptions_count: 0,
                active_count: 0,
                mrr: 0,
            };
        });

        (subscriptions || []).forEach((s: any) => {
            if (statsMap[s.product_id]) {
                statsMap[s.product_id].subscriptions_count++;
                if (s.status === 'active' || s.status === 'trial') {
                    statsMap[s.product_id].active_count++;
                    statsMap[s.product_id].mrr += s.monthly_amount || 0;
                }
            }
        });

        setProductStats(Object.values(statsMap));
    };

    // ---- KPI Cards ----
    const statCards = [
        { icon: IconPackage, label: 'Produtos', value: stats?.totalProducts, color: 'blue' },
        { icon: IconUsers, label: 'Assinantes', value: stats?.totalSubscribers, color: 'green' },
        { icon: IconBuilding, label: 'Empresas', value: stats?.totalCompanies, color: 'violet' },
        { icon: IconCreditCard, label: 'Assinaturas Ativas', value: stats?.activeSubscriptions, color: 'orange' },
        { icon: IconTrendingUp, label: 'MRR', value: stats ? formatCurrency(stats.mrr) : '—', color: 'teal', isCurrency: true },
        { icon: IconCash, label: 'ARR', value: stats ? formatCurrency(stats.arr) : '—', color: 'pink', isCurrency: true },
    ];

    // ---- Total MRR for product progress bars ----
    const totalMRR = productStats.reduce((sum, p) => sum + p.mrr, 0);

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                {/* Title */}
                <div>
                    <Title order={2}>Admin Dashboard</Title>
                    <Text c="dimmed">Centro de inteligência da plataforma Sincla Hub</Text>
                </div>

                {/* KPI Cards */}
                <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="md">
                    {loading
                        ? Array(6).fill(0).map((_, i) => <Skeleton key={i} height={100} radius="md" />)
                        : statCards.map((stat, i) => (
                            <Card key={i} shadow="sm" padding="md" radius="md">
                                <Group gap="xs">
                                    <ThemeIcon size="lg" radius="md" variant="light" color={stat.color}>
                                        <stat.icon size={20} />
                                    </ThemeIcon>
                                </Group>
                                <Text size="xs" c="dimmed" mt="sm">{stat.label}</Text>
                                <Text size="xl" fw={700}>
                                    {stat.isCurrency ? stat.value : (typeof stat.value === 'number' ? stat.value.toLocaleString('pt-BR') : stat.value)}
                                </Text>
                            </Card>
                        ))}
                </SimpleGrid>

                {/* Distribuição por Produto */}
                <Card shadow="sm" padding="lg" radius="md">
                    <Title order={4} mb="md">Inteligência por Produto</Title>
                    {loading ? (
                        <Skeleton height={120} />
                    ) : productStats.length === 0 ? (
                        <Text c="dimmed" size="sm">Nenhum produto cadastrado</Text>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                            {productStats.map((product) => (
                                <Card key={product.id} withBorder padding="md" radius="md">
                                    <Group justify="space-between" mb="xs">
                                        <Text fw={600} size="sm">{product.name}</Text>
                                        <Badge size="sm" variant="light" color="blue">
                                            {product.active_count} {product.active_count === 1 ? 'ativo' : 'ativos'}
                                        </Badge>
                                    </Group>
                                    <Group gap="xl" mb="xs">
                                        <div>
                                            <Text size="xs" c="dimmed">Assinaturas</Text>
                                            <Text fw={700}>{product.subscriptions_count}</Text>
                                        </div>
                                        <div>
                                            <Text size="xs" c="dimmed">MRR</Text>
                                            <Text fw={700} c="teal">{formatCurrency(product.mrr)}</Text>
                                        </div>
                                    </Group>
                                    {totalMRR > 0 && (
                                        <Progress
                                            value={(product.mrr / totalMRR) * 100}
                                            size="sm"
                                            radius="xl"
                                            color="blue"
                                        />
                                    )}
                                </Card>
                            ))}
                        </SimpleGrid>
                    )}
                </Card>

                {/* Tables Row */}
                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                    {/* Últimas Assinaturas */}
                    <Card shadow="sm" padding="lg" radius="md">
                        <Title order={4} mb="md">Últimas Assinaturas</Title>
                        {loading ? (
                            <Stack gap="sm">
                                {Array(5).fill(0).map((_, i) => <Skeleton key={i} height={36} />)}
                            </Stack>
                        ) : recentSubs.length === 0 ? (
                            <Text c="dimmed" size="sm">Nenhuma assinatura encontrada</Text>
                        ) : (
                            <Table striped highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Empresa</Table.Th>
                                        <Table.Th>Produto</Table.Th>
                                        <Table.Th>Plano</Table.Th>
                                        <Table.Th>Status</Table.Th>
                                        <Table.Th ta="right">Valor</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {recentSubs.map((sub) => (
                                        <Table.Tr key={sub.id}>
                                            <Table.Td>
                                                <Text size="sm" lineClamp={1}>{sub.company_name}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{sub.product_name}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge size="xs" variant="light">
                                                    {planLabels[sub.plan] || sub.plan}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge size="xs" color={statusColors[sub.status] || 'gray'}>
                                                    {sub.status}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td ta="right">
                                                <Text size="sm" fw={500}>{formatCurrency(sub.monthly_amount)}</Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        )}
                    </Card>

                    {/* Atividade Recente */}
                    <Card shadow="sm" padding="lg" radius="md">
                        <Title order={4} mb="md">Atividade Recente</Title>
                        {loading ? (
                            <Stack gap="sm">
                                {Array(5).fill(0).map((_, i) => <Skeleton key={i} height={48} />)}
                            </Stack>
                        ) : recentActivity.length === 0 ? (
                            <Text c="dimmed" size="sm">Nenhuma atividade recente</Text>
                        ) : (
                            <Stack gap="xs">
                                {recentActivity.map((activity, i) => (
                                    <Group key={i} gap="sm" py={6} style={{ borderBottom: i < recentActivity.length - 1 ? '1px solid var(--mantine-color-gray-2)' : 'none' }}>
                                        <ThemeIcon
                                            size="md"
                                            radius="xl"
                                            variant="light"
                                            color={activity.type === 'subscriber' ? 'green' : 'violet'}
                                        >
                                            {activity.type === 'subscriber'
                                                ? <IconUserPlus size={14} />
                                                : <IconBuilding size={14} />
                                            }
                                        </ThemeIcon>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Text size="sm" fw={500} lineClamp={1}>
                                                {activity.type === 'subscriber' ? 'Novo assinante' : 'Nova empresa'}
                                            </Text>
                                            <Text size="xs" c="dimmed" lineClamp={1}>
                                                {activity.name}
                                                {activity.email ? ` — ${activity.email}` : ''}
                                            </Text>
                                        </div>
                                        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                                            {formatRelative(activity.created_at)}
                                        </Text>
                                    </Group>
                                ))}
                            </Stack>
                        )}
                    </Card>
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
