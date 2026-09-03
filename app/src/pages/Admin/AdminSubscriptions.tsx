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
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
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

const planLabels: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business',
    enterprise: 'Enterprise',
};

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
    const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
    const [loading, setLoading] = useState(true);
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
        try {
            // Load products for filter
            const { data: prods } = await supabase
                .from('products')
                .select('id, name')
                .eq('is_active', true)
                .order('name');
            setProducts((prods || []).map(p => ({ value: p.id, label: p.name })));

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
                    id, company_id, product_id, plan, status, seats_limit, seats_used,
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

    // ============================
    // Cancel Subscription Handler
    // ============================
    const handleCancelSubscription = async () => {
        if (!cancelTarget) return;
        setCancelLoading(true);
        try {
            // Se tem assinatura externa no Asaas, cancelar lá primeiro
            if (cancelTarget.external_subscription_id) {
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
                    <Button
                        leftSection={<IconCrown size={16} />}
                        color="violet"
                        onClick={openGrantModal}
                    >
                        Conceder Acesso Ilimitado
                    </Button>
                </Group>

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
                                    <Table.Th style={{ width: 70 }}>A\u00e7\u00f5es</Table.Th>
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
                                        <Table.Td>
                                            <Group gap={4}>
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
                                \u26a0\ufe0f Esta assinatura tem cobran\u00e7a no Asaas. O cancelamento tamb\u00e9m ser\u00e1 enviado para o gateway de pagamento.
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
                        Esta a\u00e7\u00e3o remove apenas o registro do banco de dados. A conta da empresa e do usu\u00e1rio n\u00e3o ser\u00e3o afetadas.
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
        </Container>
    );
}
