import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Container, Title, Text, Card, Group, Badge, Stack, Skeleton,
    Table, TextInput, SimpleGrid, ThemeIcon, Select, Button, Modal,
    ActionIcon, Tooltip,
} from '@mantine/core';
import {
    IconSearch, IconCreditCard, IconTrendingUp,
    IconClock, IconX, IconCrown, IconGift,
    IconPlayerStop, IconTrash, IconAlertTriangle, IconCheck,
    IconUserPlus, IconEdit,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../shared/lib/supabase';
import { ManualSubscriptionModal } from './components/ManualSubscriptionModal';
import { SubscriptionInvitesCard, SUBSCRIPTION_INVITES_QUERY_KEY } from './components/SubscriptionInvitesCard';
import { resolvePlanLabel, type PlanRef } from './utils/planLabel';

// ============================
// Types
// ============================

interface SubscriptionRow {
    id: string;
    company_id: string;
    product_id: string;
    plan: string;
    plan_id: string | null;
    invite_id: string | null;
    status: string;
    seats_limit: number;
    seats_used: number;
    billing_cycle: string | null;
    monthly_amount: number;
    trial_ends_at: string | null;
    canceled_at: string | null;
    current_period_end: string | null;
    created_at: string;
    external_subscription_id: string | null;
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

const resolvePlan = resolvePlanLabel;

const GRANT_DURATION_OPTIONS = [
    { value: '0', label: 'Vitalício (ilimitado)' },
    { value: '30', label: '30 dias' },
    { value: '60', label: '60 dias' },
    { value: '90', label: '90 dias' },
];

/** Dropdowns dentro de Modal precisam portal + z-index alto */
const MODAL_COMBOBOX_PROPS = { withinPortal: true, zIndex: 10000 } as const;

// ============================
// Component
// ============================

export function AdminSubscriptions() {
    const queryClient = useQueryClient();
    const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
    const [plans, setPlans] = useState<PlanRef[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [manualModalOpened, setManualModalOpened] = useState(false);
    const [planTarget, setPlanTarget] = useState<SubscriptionRow | null>(null);
    const [planTargetValue, setPlanTargetValue] = useState<string | null>(null);
    const [planSaving, setPlanSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string | null>(null);
    const [filterProduct, setFilterProduct] = useState<string | null>(null);
    const [products, setProducts] = useState<{ value: string; label: string }[]>([]);

    // Grant Subscription
    const [grantModalOpened, setGrantModalOpened] = useState(false);
    const [grantLoading, setGrantLoading] = useState(false);
    const [companies, setCompanies] = useState<{ value: string; label: string }[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const [grantDuration, setGrantDuration] = useState<string>('0');
    const [loadingGrantOptions, setLoadingGrantOptions] = useState(false);

    const companyOptions = useMemo(() => {
        const byId = new Map<string, { value: string; label: string }>();

        for (const company of companies) {
            if (company.value && company.label) {
                byId.set(company.value, company);
            }
        }

        for (const sub of subscriptions) {
            if (sub.company_id && sub.company?.name && !byId.has(sub.company_id)) {
                byId.set(sub.company_id, {
                    value: sub.company_id,
                    label: sub.company.name,
                });
            }
        }

        return Array.from(byId.values()).sort((a, b) =>
            a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }),
        );
    }, [companies, subscriptions]);

    const loadCompaniesForGrant = useCallback(async () => {
        setLoadingGrantOptions(true);
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('id, name, slug')
                .order('name')
                .limit(1000);

            if (error) throw error;

            setCompanies((data || []).map(c => ({
                value: c.id,
                label: (c.name || c.slug || 'Sem nome').trim(),
            })));
        } catch (error) {
            console.error('Error loading companies for grant:', error);
            notifications.show({
                title: 'Erro ao carregar empresas',
                message: 'Não foi possível listar as empresas. Tente novamente.',
                color: 'red',
            });
        } finally {
            setLoadingGrantOptions(false);
        }
    }, []);

    const openGrantModal = () => {
        setSelectedCompany(null);
        setSelectedProduct(null);
        setGrantDuration('0');
        setGrantModalOpened(true);
        void loadCompaniesForGrant();
    };

    // Cancel / Delete Subscription
    const [cancelTarget, setCancelTarget] = useState<SubscriptionRow | null>(null);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<SubscriptionRow | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            // Load products for filter
            const { data: prods } = await supabase
                .from('products')
                .select('id, name')
                .eq('is_active', true)
                .order('name');
            setProducts((prods || []).map(p => ({ value: p.id, label: p.name })));

            const { data: planRows } = await supabase
                .from('product_plans')
                .select('id, product_id, slug, name')
                .order('sort_order');
            setPlans((planRows || []) as PlanRef[]);

            // Load companies for the grant modal
            const { data: comps, error: companiesError } = await supabase
                .from('companies')
                .select('id, name, slug')
                .order('name')
                .limit(1000);
            if (companiesError) {
                console.error('Error loading companies:', companiesError);
            }
            setCompanies((comps || []).map(c => ({
                value: c.id,
                label: (c.name || c.slug || 'Sem nome').trim(),
            })));

            // Load subscriptions
            let query = supabase
                .from('subscriptions')
                .select(`
                    id, company_id, product_id, plan, plan_id, invite_id, status, seats_limit, seats_used,
                    billing_cycle, monthly_amount, trial_ends_at, canceled_at,
                    current_period_end, created_at, external_subscription_id,
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

            const { data, error: subsError } = await query;
            if (subsError) throw subsError;
            const mapped = (data || []).map((s: any) => ({
                ...s,
                company: Array.isArray(s.company) ? s.company[0] : s.company,
                product: Array.isArray(s.product) ? s.product[0] : s.product,
            }));

            setSubscriptions(mapped);
        } catch (error: any) {
            console.error('Error loading subscriptions:', error);
            setLoadError(error?.message || 'Não foi possível carregar as assinaturas.');
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
        (s.product?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        resolvePlan(s, plans).label.toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = subscriptions.filter(s => s.status === 'active').length;
    const trialCount = subscriptions.filter(s => s.status === 'trial').length;
    const canceledCount = subscriptions.filter(s => s.status === 'canceled').length;
    const mrr = subscriptions
        .filter(s => s.status === 'active' || s.status === 'trial')
        .reduce((sum, s) => sum + (s.monthly_amount || 0), 0);

    const loadChargeSiblings = async (sub: SubscriptionRow) => {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('id, product_id, billing_cycle, monthly_amount')
            .eq('external_subscription_id', sub.external_subscription_id!)
            .neq('id', sub.id)
            .in('status', ['active', 'trial', 'past_due']);
        if (error) throw error;
        return data || [];
    };

    const remainingChargeValue = async (
        sub: SubscriptionRow,
        siblings: { product_id: string; billing_cycle: string | null; monthly_amount: number }[],
    ) => {
        if (sub.invite_id) {
            const { data: invite } = await supabase
                .from('subscription_invites')
                .select('items')
                .eq('id', sub.invite_id)
                .maybeSingle();
            const items = (invite?.items || []) as { product_id: string; price: number }[];
            if (items.length > 0) {
                return Math.round(items
                    .filter(i => siblings.some(s => s.product_id === i.product_id))
                    .reduce((sum, i) => sum + Number(i.price || 0), 0) * 100) / 100;
            }
        }
        return Math.round(siblings.reduce((sum, s) =>
            sum + Number(s.monthly_amount || 0) * (s.billing_cycle === 'yearly' ? 12 : 1), 0) * 100) / 100;
    };

    // ============================
    // Change plan (vincular ao plano cadastrado)
    // ============================
    const openPlanModal = (sub: SubscriptionRow) => {
        const current = resolvePlan(sub, plans);
        const match = sub.plan_id
            ? sub.plan_id
            : plans.find(p => p.product_id === sub.product_id && p.slug === sub.plan)?.id ?? null;
        setPlanTargetValue(current.kind === 'plan' ? match : null);
        setPlanTarget(sub);
    };

    const handleSavePlan = async () => {
        if (!planTarget || !planTargetValue) return;
        const plan = plans.find(p => p.id === planTargetValue);
        if (!plan) return;
        setPlanSaving(true);
        try {
            const { error } = await supabase
                .from('subscriptions')
                .update({ plan_id: plan.id, plan: plan.slug })
                .eq('id', planTarget.id);
            if (error) throw error;
            notifications.show({
                title: 'Plano atualizado',
                message: `${planTarget.company?.name || 'Empresa'} agora está no plano ${plan.name}. Limites e créditos foram recalculados.`,
                color: 'green',
            });
            setPlanTarget(null);
            loadData();
        } catch (error: any) {
            notifications.show({ title: 'Erro ao alterar o plano', message: error.message || 'Falha desconhecida.', color: 'red' });
        } finally {
            setPlanSaving(false);
        }
    };

    // ============================
    // Cancel Subscription Handler
    // ============================
    const handleCancelSubscription = async () => {
        if (!cancelTarget) return;
        setCancelLoading(true);
        try {
            // Cobrança única de convite cobre vários produtos: reduz o valor em vez de cancelar no Asaas
            const siblings = cancelTarget.external_subscription_id
                ? await loadChargeSiblings(cancelTarget)
                : [];

            if (cancelTarget.external_subscription_id && siblings.length > 0) {
                const remaining = await remainingChargeValue(cancelTarget, siblings);
                const { data: asaasResult, error: asaasError } = await supabase.functions.invoke('asaas-checkout', {
                    body: {
                        endpoint: `/subscriptions/${cancelTarget.external_subscription_id}`,
                        method: 'PUT',
                        data: { value: remaining, updatePendingPayments: true },
                    },
                });
                if (asaasError || asaasResult?.error) {
                    throw new Error(asaasResult?.error || asaasError?.message || 'Falha ao ajustar o valor da cobrança no Asaas.');
                }
            } else if (cancelTarget.external_subscription_id) {
                const { data: asaasResult, error: asaasError } = await supabase.functions.invoke('asaas-checkout', {
                    body: {
                        endpoint: `/subscriptions/${cancelTarget.external_subscription_id}`,
                        method: 'DELETE',
                    },
                });

                if (asaasError) {
                    console.error('Asaas cancel error:', asaasError);
                    // Continuar mesmo com erro no Asaas (pode já estar cancelada)
                }

                if (asaasResult?.error && !asaasResult.error.includes('inativada')) {
                    console.warn('Asaas cancel warning:', asaasResult.error);
                }
            }

            // Atualizar no banco
            const { error: dbError } = await supabase
                .from('subscriptions')
                .update({
                    status: 'canceled',
                    canceled_at: new Date().toISOString(),
                })
                .eq('id', cancelTarget.id);

            if (dbError) throw dbError;

            notifications.show({
                title: 'Assinatura cancelada \u2705',
                message: `${cancelTarget.product?.name || cancelTarget.product_id} da empresa ${cancelTarget.company?.name || ''} foi cancelada.`,
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            setCancelTarget(null);
            loadData();
        } catch (error: any) {
            console.error('Error canceling subscription:', error);
            notifications.show({
                title: 'Erro ao cancelar',
                message: error.message || 'Falha desconhecida.',
                color: 'red',
            });
        } finally {
            setCancelLoading(false);
        }
    };

    // ============================
    // Delete Subscription Handler (only canceled)
    // ============================
    const handleDeleteSubscription = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            const { error } = await supabase
                .from('subscriptions')
                .delete()
                .eq('id', deleteTarget.id);

            if (error) throw error;

            notifications.show({
                title: 'Registro exclu\u00eddo \u2705',
                message: 'Assinatura cancelada removida do banco de dados.',
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            setDeleteTarget(null);
            loadData();
        } catch (error: any) {
            console.error('Error deleting subscription:', error);
            notifications.show({
                title: 'Erro ao excluir',
                message: error.message || 'Falha desconhecida.',
                color: 'red',
            });
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <Group justify="space-between">
                    <div>
                        <Title order={2}>Assinaturas</Title>
                        <Text c="dimmed">Todas as assinaturas de produtos na plataforma</Text>
                    </div>
                    <Group gap="sm">
                        <Button
                            leftSection={<IconCrown size={16} />}
                            color="violet"
                            variant="light"
                            onClick={openGrantModal}
                        >
                            Conceder Acesso Ilimitado
                        </Button>
                        <Button
                            leftSection={<IconUserPlus size={16} />}
                            onClick={() => setManualModalOpened(true)}
                        >
                            Nova assinatura
                        </Button>
                    </Group>
                </Group>

                {loadError && (
                    <Card withBorder padding="md" radius="md" bg="var(--mantine-color-red-light)">
                        <Group justify="space-between">
                            <Text size="sm" c="red">{loadError}</Text>
                            <Button size="xs" variant="light" color="red" onClick={() => loadData()}>Tentar novamente</Button>
                        </Group>
                    </Card>
                )}

                <SubscriptionInvitesCard />

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
                        <Table.ScrollContainer minWidth={900}>
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
                                    <Table.Th style={{ width: 90 }}>Ações</Table.Th>
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
                                            {(() => {
                                                const resolved = resolvePlan(sub, plans);
                                                return (
                                                    <Group gap={4} wrap="nowrap">
                                                        <Badge
                                                            variant="dot"
                                                            size="sm"
                                                            color={resolved.kind === 'plan' ? 'blue' : resolved.kind === 'courtesy' ? 'violet' : 'gray'}
                                                            style={{ textTransform: 'none' }}
                                                        >
                                                            {resolved.label}
                                                        </Badge>
                                                        {resolved.kind === 'legacy' && (
                                                            <Tooltip label="Plano antigo, sem cadastro na aba Planos. Use “Alterar plano” para vincular.">
                                                                <Badge size="xs" color="orange" variant="light">legado</Badge>
                                                            </Tooltip>
                                                        )}
                                                    </Group>
                                                );
                                            })()}
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
                                        <Table.Td>
                                            <Group gap={4} wrap="nowrap">
                                                {sub.status !== 'canceled' && (
                                                    <Tooltip label="Alterar plano">
                                                        <ActionIcon size="sm" variant="subtle" onClick={() => openPlanModal(sub)}>
                                                            <IconEdit size={14} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                )}
                                                {sub.status === 'active' || sub.status === 'trial' ? (
                                                    <Tooltip label="Cancelar assinatura">
                                                        <ActionIcon
                                                            size="sm" variant="subtle" color="orange"
                                                            onClick={() => setCancelTarget(sub)}
                                                        >
                                                            <IconPlayerStop size={14} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                ) : null}
                                                {sub.status === 'canceled' && (
                                                    <Tooltip label="Excluir registro">
                                                        <ActionIcon
                                                            size="sm" variant="subtle" color="red"
                                                            onClick={() => setDeleteTarget(sub)}
                                                        >
                                                            <IconTrash size={14} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                )}
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                        </Table.ScrollContainer>
                    </Card>
                )}

                <Text size="xs" c="dimmed" ta="right">
                    Exibindo {filtered.length} de {subscriptions.length} assinaturas
                </Text>
            </Stack>

            <Modal
                opened={grantModalOpened}
                onClose={() => !grantLoading && setGrantModalOpened(false)}
                title={
                    <Group gap="xs">
                        <IconGift size={20} color="var(--mantine-color-violet-6)" />
                        <Title order={4}>Conceder Cortesia Enterprise</Title>
                    </Group>
                }
                centered
                size="md"
                styles={{ body: { overflow: 'visible' } }}
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Conceda acesso com limite máximo de licenças sem a necessidade de passar pelo Checkout (Asaas). A assinatura será registrada como Plano Enterprise com valor R$ 0,00.
                    </Text>

                    <Select
                        label="Empresa Recebedora"
                        placeholder="Busque ou selecione a empresa"
                        withAsterisk
                        searchable
                        clearable
                        nothingFoundMessage="Nenhuma empresa encontrada"
                        data={companyOptions}
                        value={selectedCompany}
                        onChange={setSelectedCompany}
                        comboboxProps={MODAL_COMBOBOX_PROPS}
                        maxDropdownHeight={280}
                        disabled={grantLoading || loadingGrantOptions}
                        description={
                            loadingGrantOptions
                                ? 'Carregando empresas...'
                                : `${companyOptions.length} empresa(s) disponível(is)`
                        }
                    />

                    <Select
                        label="Produto"
                        placeholder="Busque ou selecione (vazio = todos)"
                        searchable
                        clearable
                        nothingFoundMessage="Nenhum produto encontrado"
                        data={products}
                        value={selectedProduct}
                        onChange={setSelectedProduct}
                        comboboxProps={MODAL_COMBOBOX_PROPS}
                        maxDropdownHeight={220}
                        disabled={grantLoading}
                        description="Se você não selecionar um produto, todas as ferramentas do Hub serão concedidas de uma vez."
                    />

                    <Select
                        label="Duração do acesso"
                        data={GRANT_DURATION_OPTIONS}
                        value={grantDuration}
                        onChange={(val) => setGrantDuration(val || '0')}
                        allowDeselect={false}
                        comboboxProps={MODAL_COMBOBOX_PROPS}
                        maxDropdownHeight={220}
                        description="Vitalício concede acesso por tempo indeterminado."
                    />

                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" onClick={() => setGrantModalOpened(false)} disabled={grantLoading}>
                            Cancelar
                        </Button>
                        <Button
                            color="violet"
                            onClick={async () => {
                                if (!selectedCompany) {
                                    notifications.show({
                                        title: 'Empresa obrigatória',
                                        message: 'Selecione uma empresa da lista.',
                                        color: 'orange',
                                    });
                                    return;
                                }

                                setGrantLoading(true);

                                try {
                                    const productsToGrant = selectedProduct
                                        ? products.filter(p => p.value === selectedProduct)
                                        : products;

                                    if (productsToGrant.length === 0) throw new Error('Nenhum produto encontrado para conceder.');

                                    const durationDays = parseInt(grantDuration, 10) || 0;

                                    const { error } = await supabase
                                        .rpc('admin_grant_subscription', {
                                            p_company_id: selectedCompany,
                                            p_product_ids: productsToGrant.map(p => p.value),
                                            p_duration_days: durationDays,
                                            p_plan: 'enterprise',
                                        });

                                    if (error) throw error;

                                    setGrantModalOpened(false);
                                    setSelectedCompany(null);
                                    setSelectedProduct(null);
                                    setGrantDuration('0');
                                    loadData();
                                    notifications.show({
                                        title: 'Acesso concedido! ✅',
                                        message: `Assinatura concedida com sucesso.${durationDays > 0 ? ` Duração: ${durationDays} dias.` : ' Acesso vitalício.'}`,
                                        color: 'green',
                                    });
                                } catch (error: any) {
                                    console.error(error);
                                    notifications.show({
                                        title: 'Erro ao conceder assinatura',
                                        message: error.message || 'Falha desconhecida.',
                                        color: 'red',
                                    });
                                } finally {
                                    setGrantLoading(false);
                                }
                            }}
                            loading={grantLoading}
                        >
                            Conceder Acessos
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* ============================
                Modal: Confirmar Cancelamento
            ============================ */}
            <Modal
                opened={!!cancelTarget}
                onClose={() => !cancelLoading && setCancelTarget(null)}
                title={
                    <Group gap="xs">
                        <IconAlertTriangle size={20} color="var(--mantine-color-orange-6)" />
                        <Title order={4}>Cancelar Assinatura</Title>
                    </Group>
                }
                centered
                size="md"
            >
                <Stack gap="md">
                    <Text size="sm">
                        Tem certeza que deseja cancelar a assinatura de{' '}
                        <strong>{cancelTarget?.product?.name || cancelTarget?.product_id}</strong>{' '}
                        da empresa <strong>{cancelTarget?.company?.name || '—'}</strong>?
                    </Text>
                    {cancelTarget?.external_subscription_id && (
                        <Card withBorder padding="sm" radius="md" bg="var(--mantine-color-orange-light)">
                            <Text size="xs" c="orange" fw={600}>
                                ⚠️ Esta assinatura tem cobrança no Asaas. O cancelamento também será enviado para o gateway de pagamento
                                {cancelTarget.invite_id ? ' (se a cobrança incluir outros produtos, apenas o valor deste produto é removido).' : '.'}
                            </Text>
                            <Text size="xs" c="dimmed" mt={4}>
                                ID Asaas: {cancelTarget.external_subscription_id}
                            </Text>
                        </Card>
                    )}
                    <Group justify="flex-end" gap="sm">
                        <Button variant="subtle" onClick={() => setCancelTarget(null)} disabled={cancelLoading}>
                            Voltar
                        </Button>
                        <Button
                            color="orange"
                            onClick={handleCancelSubscription}
                            loading={cancelLoading}
                            leftSection={<IconPlayerStop size={16} />}
                        >
                            Cancelar Assinatura
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* ============================
                Modal: Confirmar Exclus\u00e3o
            ============================ */}
            <Modal
                opened={!!deleteTarget}
                onClose={() => !deleteLoading && setDeleteTarget(null)}
                title={
                    <Group gap="xs">
                        <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
                        <Title order={4}>Excluir Registro</Title>
                    </Group>
                }
                centered
                size="md"
            >
                <Stack gap="md">
                    <Text size="sm">
                        Deseja excluir permanentemente o registro da assinatura cancelada de{' '}
                        <strong>{deleteTarget?.product?.name || deleteTarget?.product_id}</strong>{' '}
                        da empresa <strong>{deleteTarget?.company?.name || '—'}</strong>?
                    </Text>
                    <Text size="xs" c="dimmed">
                        Esta ação remove apenas o registro do banco de dados. A conta da empresa e do usuário não serão afetadas.
                    </Text>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="subtle" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
                            Cancelar
                        </Button>
                        <Button
                            color="red"
                            onClick={handleDeleteSubscription}
                            loading={deleteLoading}
                            leftSection={<IconTrash size={16} />}
                        >
                            Excluir Registro
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={!!planTarget}
                onClose={() => !planSaving && setPlanTarget(null)}
                title={<Title order={4}>Alterar plano</Title>}
                centered
                size="md"
            >
                <Stack gap="md">
                    <Text size="sm">
                        <strong>{planTarget?.product?.name || planTarget?.product_id}</strong> da empresa{' '}
                        <strong>{planTarget?.company?.name || '—'}</strong>
                    </Text>
                    {planTarget && (
                        <Text size="xs" c="dimmed">
                            Atual: {resolvePlan(planTarget, plans).label}
                            {resolvePlan(planTarget, plans).kind === 'legacy' ? ' (plano antigo, sem cadastro)' : ''}
                        </Text>
                    )}
                    <Select
                        label="Plano cadastrado"
                        placeholder="Selecione o plano"
                        data={plans
                            .filter(p => p.product_id === planTarget?.product_id)
                            .map(p => ({ value: p.id, label: p.name }))}
                        value={planTargetValue}
                        onChange={setPlanTargetValue}
                        comboboxProps={MODAL_COMBOBOX_PROPS}
                        nothingFoundMessage="Nenhum plano cadastrado para este produto"
                    />
                    <Text size="xs" c="dimmed">
                        Altera apenas o plano usado para limites e créditos. O valor cobrado no Asaas não muda.
                    </Text>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="subtle" onClick={() => setPlanTarget(null)} disabled={planSaving}>Cancelar</Button>
                        <Button onClick={handleSavePlan} loading={planSaving} disabled={!planTargetValue}>Salvar</Button>
                    </Group>
                </Stack>
            </Modal>

            <ManualSubscriptionModal
                opened={manualModalOpened}
                onClose={() => setManualModalOpened(false)}
                onCreated={() => {
                    queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_INVITES_QUERY_KEY });
                }}
            />
        </Container>
    );
}
