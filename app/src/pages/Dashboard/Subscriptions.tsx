import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Container, Text, Card, Group, Badge, Stack, Skeleton,
    Table, ThemeIcon, SimpleGrid, Button, Divider, Loader,
    ActionIcon, Title, Modal,
} from '@mantine/core';
import {
    IconCreditCard, IconCalendar, IconReceipt, IconUsers,
    IconStar, IconCheck, IconArrowLeft, IconRocket,
    IconSchool, IconTarget, IconBuildingCommunity, IconShoppingCart,
    IconMessage, IconChartBar,
} from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { PageHeader, EmptyState } from '../../components/shared';
import { redirectToProduct } from '../../shared/services/cross-auth';

// ============================
// Types
// ============================

interface SubscriptionRow {
    id: string;
    product_id: string;
    plan: string;
    status: string;
    seats_limit: number;
    seats_used: number;
    billing_cycle: string | null;
    monthly_amount: number;
    current_period_start: string | null;
    current_period_end: string | null;
    trial_ends_at: string | null;
    canceled_at: string | null;
    created_at: string;
    product: { name: string } | null;
    name: string;
}

interface PlanOption {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    features: string[];
    price_monthly: number;
    price_yearly: number;
    discount_yearly_percent: number;
    price_setup: number;
    is_popular: boolean;
    trial_days: number;
}

interface ProductInfo {
    id: string;
    name: string;
    brand_color: string | null;
    icon: string;
    base_url?: string;
}

// ============================
// Icon Map
// ============================

const iconMap: Record<string, typeof IconUsers> = {
    IconUsers,
    IconSchool,
    IconTarget,
    IconCalendar,
    IconBuildingCommunity,
    IconShoppingCart,
    IconMessage,
    IconChartBar,
};

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

export function Subscriptions() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { currentCompany } = useAuth();
    const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
    const [loading, setLoading] = useState(true);

    // Plan selection state
    const productId = searchParams.get('produto');
    const isSuccess = searchParams.get('sucesso') === 'true';
    const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);

    const handleCloseSuccessModal = () => {
        searchParams.delete('sucesso');
        searchParams.delete('produto');
        setSearchParams(searchParams, { replace: true });
    };

    const handleAccessTool = async () => {
        if (!currentCompany || !productInfo) return;
        try {
            await redirectToProduct(
                { id: productInfo.id, base_url: productInfo.base_url } as any,
                currentCompany as any
            );
        } catch (error) {
            console.error('Error redirecting:', error);
            window.open('https://app.sincla.com.br', '_blank');
        }
    };
    const [plans, setPlans] = useState<PlanOption[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(false);

    useEffect(() => {
        if (currentCompany) loadData();
    }, [currentCompany]);

    useEffect(() => {
        if (productId) loadPlans(productId);
    }, [productId]);

    const loadData = async () => {
        if (!currentCompany) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('subscriptions')
                .select(`
                    id, product_id, plan, status, seats_limit, seats_used,
                    billing_cycle, monthly_amount, current_period_start, current_period_end,
                    trial_ends_at, canceled_at, created_at,
                    product:products!product_id (name)
                `)
                .eq('company_id', currentCompany.id)
                .order('created_at', { ascending: false });

            const mapped = (data || []).map((s: any) => ({
                ...s,
                product: Array.isArray(s.product) ? s.product[0] : s.product,
            }));
            setSubscriptions(mapped);
        } catch (error) {
            console.error('Error loading subscriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPlans = async (pid: string) => {
        setLoadingPlans(true);
        try {
            const [productRes, plansRes] = await Promise.all([
                supabase.from('products').select('id, name, brand_color, icon, base_url').eq('id', pid).single(),
                supabase.from('product_plans')
                    .select('id, name, slug, description, features, price_monthly, price_yearly, discount_yearly_percent, price_setup, is_popular, trial_days')
                    .eq('product_id', pid)
                    .eq('is_active', true)
                    .order('sort_order'),
            ]);
            setProductInfo(productRes.data);
            setPlans(plansRes.data || []);
        } catch (err) {
            console.error('Error loading plans:', err);
        } finally {
            setLoadingPlans(false);
        }
    };

    if (!currentCompany) {
        return (
            <Container size="xl" py="md">
                <PageHeader
                    title="Minhas Assinaturas"
                    subtitle="Gerencie as assinaturas de produtos"
                    helpContent="Aqui você visualiza todas as assinaturas de produtos da sua empresa."
                />
                <EmptyState
                    icon={<IconCreditCard size={28} />}
                    title="Nenhuma empresa selecionada"
                    description="Selecione ou crie uma empresa para ver suas assinaturas."
                    actionLabel="Ir para Empresas"
                    onAction={() => navigate('/painel/empresas')}
                />
            </Container>
        );
    }

    const color = productInfo?.brand_color || '#0087ff';

    // ---- Plan Selection View ----
    if (productId && !isSuccess) {
        return (
            <Container size="xl" py="md">
                <Stack gap="lg">
                    <Group justify="space-between">
                        <Group>
                            <ActionIcon
                                variant="subtle"
                                onClick={() => setSearchParams({})}
                            >
                                <IconArrowLeft size={20} />
                            </ActionIcon>
                            <div>
                                <Title order={3}>Escolha um plano</Title>
                                {productInfo && (
                                    <Group gap="xs" mt={4}>
                                        <Badge variant="light" style={{ backgroundColor: `${color}18`, color }}>
                                            {productInfo.name}
                                        </Badge>
                                    </Group>
                                )}
                            </div>
                        </Group>
                        {productInfo && (() => {
                            const IconComp = iconMap[productInfo.icon] || IconRocket;
                            return (
                                <ThemeIcon
                                    size={56}
                                    radius="md"
                                    variant="light"
                                    style={{ backgroundColor: `${color}18`, color }}
                                >
                                    <IconComp size={28} />
                                </ThemeIcon>
                            );
                        })()}
                    </Group>

                    {loadingPlans ? (
                        <Stack align="center" py="xl">
                            <Loader />
                            <Text c="dimmed">Carregando planos...</Text>
                        </Stack>
                    ) : plans.length === 0 ? (
                        <EmptyState
                            icon={<IconRocket size={28} />}
                            title="Nenhum plano disponível"
                            description="Este produto ainda não possui planos configurados."
                            actionLabel="Voltar"
                            onAction={() => setSearchParams({})}
                        />
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: plans.length >= 4 ? 4 : plans.length >= 3 ? 3 : 2 }} spacing="md">
                            {plans.map((plan) => (
                                <Card
                                    key={plan.id}
                                    withBorder
                                    radius="md"
                                    padding="lg"
                                    style={{
                                        borderColor: plan.is_popular ? color : undefined,
                                        borderWidth: plan.is_popular ? 2 : 1,
                                        position: 'relative',
                                        overflow: 'visible',
                                        marginTop: plan.is_popular ? 12 : 0,
                                        transition: 'all 0.25s ease',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = `0 12px 24px ${color}20`;
                                        e.currentTarget.style.borderColor = color;
                                    }}
                                    onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = plan.is_popular ? color : '';
                                    }}
                                >
                                    {plan.is_popular && (
                                        <Badge
                                            variant="filled"
                                            leftSection={<IconStar size={12} />}
                                            style={{ position: 'absolute', top: -10, right: 12, backgroundColor: color }}
                                        >
                                            Recomendado
                                        </Badge>
                                    )}

                                    <Text fw={700} size="lg" mb={4}>{plan.name}</Text>
                                    {plan.description && (
                                        <Text size="xs" c="dimmed" mb="sm">{plan.description}</Text>
                                    )}

                                    <Group gap="xs" align="baseline" mb={4}>
                                        <Text size="xl" fw={800} style={{ color }}>
                                            {formatCurrency(plan.price_monthly)}
                                        </Text>
                                        <Text size="xs" c="dimmed">/mês</Text>
                                    </Group>

                                    {plan.price_yearly > 0 && (
                                        <Text size="xs" c="dimmed" mb="xs">
                                            ou {formatCurrency(plan.price_yearly)}/ano ({plan.discount_yearly_percent}% off)
                                        </Text>
                                    )}

                                    {plan.trial_days > 0 && (
                                        <Badge variant="light" color="green" size="sm" mb="sm">
                                            {plan.trial_days} dias grátis
                                        </Badge>
                                    )}

                                    {plan.price_setup > 0 && (
                                        <Badge variant="light" color="orange" size="sm" mb="sm" ml={4}>
                                            + {formatCurrency(plan.price_setup)} setup
                                        </Badge>
                                    )}

                                    <Divider my="sm" />

                                    <Stack gap={6} mb="md">
                                        {plan.features.slice(0, 5).map((f: string, i: number) => (
                                            <Group key={i} gap={6} wrap="nowrap">
                                                <IconCheck size={14} style={{ color }} />
                                                <Text size="xs">{f}</Text>
                                            </Group>
                                        ))}
                                        {plan.features.length > 5 && (
                                            <Text size="xs" c="dimmed">+{plan.features.length - 5} mais...</Text>
                                        )}
                                    </Stack>

                                    <Button
                                        fullWidth
                                        variant={plan.is_popular ? 'filled' : 'light'}
                                        onClick={() => window.location.href = `/checkout?produto=${productId}&plano=${plan.slug}&ciclo=monthly`}
                                        style={{
                                            ...(plan.is_popular ? { backgroundColor: color } : { color }),
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        Quero Ativar
                                    </Button>
                                </Card>
                            ))}
                        </SimpleGrid>
                    )}
                </Stack>
            </Container>
        );
    }

    // ---- Subscriptions List View ----
    const activeCount = subscriptions.filter(s => s.status === 'active').length;
    const totalAmount = subscriptions
        .filter(s => ['active', 'trial'].includes(s.status))
        .reduce((sum, s) => sum + (s.monthly_amount || 0), 0);

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <PageHeader
                    title="Minhas Assinaturas"
                    subtitle={`Assinaturas de produtos para ${currentCompany.name}`}
                    helpContent={
                        <>
                            <Text size="sm">Aqui você visualiza todas as assinaturas de produtos da sua empresa. Cada assinatura representa um produto contratado com seus respectivos planos e períodos.</Text>
                        </>
                    }
                />

                {/* KPIs */}
                {loading ? (
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                        {Array(4).fill(0).map((_, i) => <Skeleton key={i} height={85} radius="md" />)}
                    </SimpleGrid>
                ) : (
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="blue">
                                    <IconCreditCard size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Total</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs">{subscriptions.length}</Text>
                        </Card>
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
                                <ThemeIcon size="md" radius="md" variant="light" color="teal">
                                    <IconReceipt size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Valor Mensal</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs" c="teal">{formatCurrency(totalAmount)}</Text>
                        </Card>
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="violet">
                                    <IconUsers size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Seats em Uso</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs">
                                {subscriptions.reduce((acc, s) => acc + (s.seats_used || 0), 0)}
                            </Text>
                        </Card>
                    </SimpleGrid>
                )}

                {/* Table */}
                {loading ? (
                    <Stack gap="sm">
                        {[1, 2].map(i => <Skeleton key={i} height={55} radius="md" />)}
                    </Stack>
                ) : subscriptions.length === 0 ? (
                    <EmptyState
                        icon={<IconCreditCard size={28} />}
                        title="Nenhuma assinatura encontrada"
                        description="Quando você contratar um produto, suas assinaturas aparecerão aqui com detalhes de plano, período e valor."
                    />
                ) : (
                    <Card shadow="sm" padding={0} radius="md" withBorder>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Produto</Table.Th>
                                    <Table.Th>Plano</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Seats</Table.Th>
                                    <Table.Th>Valor/mês</Table.Th>
                                    <Table.Th>Ciclo</Table.Th>
                                    <Table.Th>Período</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {subscriptions.map(sub => (
                                    <Table.Tr key={sub.id}>
                                        <Table.Td>
                                            <Text size="sm" fw={500}>{sub.product?.name || sub.product_id}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge variant="dot" size="sm">{planLabels[sub.plan] || sub.plan}</Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge color={statusColors[sub.status] || 'gray'} variant="light" size="sm">
                                                {statusLabels[sub.status] || sub.status}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{sub.seats_used}/{sub.seats_limit}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={600}>
                                                {sub.monthly_amount > 0 ? formatCurrency(sub.monthly_amount) : '—'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{sub.billing_cycle === 'yearly' ? 'Anual' : 'Mensal'}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            {sub.current_period_end ? (
                                                <Group gap={4}>
                                                    <IconCalendar size={12} />
                                                    <Text size="sm">até {formatDate(sub.current_period_end)}</Text>
                                                </Group>
                                            ) : (
                                                <Text size="sm" c="dimmed">—</Text>
                                            )}
                                            {sub.status === 'trial' && sub.trial_ends_at && (
                                                <Text size="xs" c="blue">Trial até {formatDate(sub.trial_ends_at)}</Text>
                                            )}
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                )}
            </Stack>

            {/* Modal de Sucesso */}
            <Modal
                opened={isSuccess && !!productInfo}
                onClose={handleCloseSuccessModal}
                title="Assinatura Confirmada!"
                centered
                size="lg"
            >
                <Stack align="center" ta="center" py="xl">
                    <ThemeIcon size={80} radius="100%" color="green" variant="light">
                        <IconCheck size={40} />
                    </ThemeIcon>
                    <Title order={3} mt="md">
                        Parabéns pela sua nova assinatura!
                    </Title>
                    <Text c="dimmed" size="md">
                        O <strong>{productInfo?.name}</strong> foi ativado com sucesso para a empresa <strong>{currentCompany.name}</strong>.
                        Você já pode começar a utilizar todas as funcionalidades da ferramenta.
                    </Text>
                    <Button
                        size="md"
                        mt="lg"
                        fullWidth
                        rightSection={<IconRocket size={18} />}
                        onClick={handleAccessTool}
                        style={{ backgroundColor: color }}
                    >
                        Acessar a Ferramenta Agora
                    </Button>
                    <Button variant="subtle" fullWidth onClick={handleCloseSuccessModal}>
                        Voltar para minhas Assinaturas
                    </Button>
                </Stack>
            </Modal>
        </Container>
    );
}
