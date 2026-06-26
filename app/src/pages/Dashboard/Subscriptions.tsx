import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Container, Text, Card, Group, Badge, Stack, Skeleton,
    ThemeIcon, SimpleGrid, Button, Divider, Loader,
    ActionIcon, Title, Modal, Tooltip, SegmentedControl,
    Box, Paper, Progress, Tabs, Menu, Alert,
} from '@mantine/core';
import {
    IconCreditCard, IconCalendar, IconReceipt, IconUsers,
    IconStar, IconCheck, IconArrowLeft, IconRocket,
    IconMessage, IconChartBar, IconArrowsExchange, IconArrowUp,
    IconArrowDown, IconBrandWhatsapp, IconSparkles, IconExternalLink, 
    IconCrown, IconTrendingUp, IconDotsVertical, IconFileInvoice, 
    IconTrash, IconSettings, IconPlus,
} from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';

import { supabase } from '../../shared/lib/supabase';
import { PageHeader, EmptyState } from '../../components/shared';
import { redirectToProduct } from '../../shared/services/cross-auth';
import { listPaymentsBySubscription, cancelSubscription } from '../../shared/services/asaasService';
import { notifications } from '@mantine/notifications';
import { ConsumptionDashboard } from './components/ConsumptionDashboard';
import { EcosystemShortcutsPanel } from './components/EcosystemShortcutsPanel';
import { ToolActivationDrawer } from './components/ToolActivationDrawer';
import { sendEmail } from '../../shared/services/notificationService';
import {
    resolveCompanyAccountMode,
    shouldShowBillingUI,
    isFullAccessMode,
    type CompanyAccountMode,
} from '../../shared/lib/companyAccountMode';


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
    product: { name: string; brand_color?: string; icon?: string; base_url?: string } | null;
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

interface CatalogProduct {
    id: string;
    name: string;
    description: string | null;
    brand_color: string | null;
    icon: string;
    base_url: string | null;
    hasPlans: boolean;
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
    active: 'Ativa', trial: 'Em Trial', past_due: 'Em atraso',
    canceled: 'Cancelada', suspended: 'Suspensa',
};

const statusColors: Record<string, string> = {
    active: 'green', trial: 'blue', past_due: 'orange',
    canceled: 'red', suspended: 'gray',
};

const planLabels: Record<string, string> = {
    starter: 'Starter', pro: 'Pro', business: 'Business',
    enterprise: 'Enterprise', free: 'Gratuito', team: 'Team',
    lifetime: 'Acesso completo',
};

const UNLIMITED_SEATS_THRESHOLD = 999999;
const isUnlimitedSeats = (limit: number) => limit >= UNLIMITED_SEATS_THRESHOLD;
const formatSeatsDisplay = (used: number, limit: number) =>
    isUnlimitedSeats(limit) ? `${used} em uso · Ilimitado` : `${used}/${limit}`;

// ============================
// Component
// ============================

export function Subscriptions() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { currentCompany, subscriber } = useAuth();
    const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
    const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string | null>('assinaturas');
    const [platformBillingEnabled, setPlatformBillingEnabled] = useState(false);
    const [accountMode, setAccountMode] = useState<CompanyAccountMode>('free_access');

    // Plan selection state
    const productId = searchParams.get('produto');
    const isSuccess = searchParams.get('sucesso') === 'true';
    const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
    const [plans, setPlans] = useState<PlanOption[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(false);

    // Change plan modal state
    const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
    const [selectedSub, setSelectedSub] = useState<SubscriptionRow | null>(null);
    const [changePlans, setChangePlans] = useState<PlanOption[]>([]);
    const [changePlanLoading, setChangePlanLoading] = useState(false);
    const [changePlanSaving, _setChangePlanSaving] = useState(false);
    const [selectedNewPlan, setSelectedNewPlan] = useState<PlanOption | null>(null);
    const [changeBillingCycle, setChangeBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    // Invoices State
    const [invoicesModalOpen, setInvoicesModalOpen] = useState(false);
    const [invoicesLoading, setInvoicesLoading] = useState(false);
    const [invoices, setInvoices] = useState<any[]>([]);

    // Cancel State
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

    const [platformWhatsapp, setPlatformWhatsapp] = useState('');

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

    useEffect(() => {
        if (currentCompany) loadData();
    }, [currentCompany]);

    useEffect(() => {
        if (productId && isSuccess) loadPlans(productId);
    }, [productId, isSuccess]);

    useEffect(() => {
        supabase.from('platform_settings').select('key, value').in('key', ['empresa_whatsapp', 'billing_enabled'])
            .then(({ data }) => {
                (data || []).forEach((row: { key: string; value: unknown }) => {
                    if (row.key === 'empresa_whatsapp' && typeof row.value === 'string') {
                        setPlatformWhatsapp(row.value);
                    }
                    if (row.key === 'billing_enabled') {
                        setPlatformBillingEnabled(row.value === true || row.value === 'true');
                    }
                });
            });
    }, []);

    useEffect(() => {
        const aba = searchParams.get('aba');
        if (aba === 'recursos') setActiveTab('consumo');
        else if (aba === 'atalhos') setActiveTab('atalhos');
        else if (aba === 'ferramentas') setActiveTab('assinaturas');
    }, [searchParams]);

    const handleTabChange = (value: string | null) => {
        setActiveTab(value);
        if (!value || productId) return;
        const next = new URLSearchParams(searchParams);
        if (value === 'consumo') next.set('aba', 'recursos');
        else if (value === 'atalhos') next.set('aba', 'atalhos');
        else next.set('aba', 'ferramentas');
        setSearchParams(next, { replace: true });
    };

    const loadData = async () => {
        if (!currentCompany) return;
        setLoading(true);
        try {
            const [subsRes, productsRes, plansRes, modeRes] = await Promise.all([
                supabase
                    .from('subscriptions')
                    .select(`
                        id, product_id, plan, status, seats_limit, seats_used,
                        billing_cycle, monthly_amount, current_period_start, current_period_end,
                        trial_ends_at, canceled_at, created_at,
                        product:products!product_id (name, brand_color, icon, base_url, description)
                    `)
                    .eq('company_id', currentCompany.id)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('products')
                    .select('id, name, description, icon, brand_color, base_url, sort_order')
                    .eq('is_active', true)
                    .order('sort_order'),
                supabase
                    .from('product_plans')
                    .select('product_id')
                    .eq('is_active', true)
                    .eq('plan_kind', 'base'),
                supabase.rpc('get_company_account_mode', { p_company_id: currentCompany.id }),
            ]);

            const mapped = (subsRes.data || []).map((s: any) => ({
                ...s,
                product: Array.isArray(s.product) ? s.product[0] : s.product,
            }));
            setSubscriptions(mapped);

            const productsWithPlans = new Set((plansRes.data || []).map((p: { product_id: string }) => p.product_id));
            setCatalogProducts((productsRes.data || []).map((p: CatalogProduct) => ({
                ...p,
                hasPlans: productsWithPlans.has(p.id),
            })));

            const rpcMode = !modeRes.error && typeof modeRes.data === 'string'
                ? modeRes.data as CompanyAccountMode
                : null;
            const monthlyTotal = mapped
                .filter((s: SubscriptionRow) => ['active', 'trial'].includes(s.status))
                .reduce((sum: number, s: SubscriptionRow) => sum + (s.monthly_amount || 0), 0);
            setAccountMode(
                rpcMode && ['lifetime', 'partner', 'billing_active', 'free_access'].includes(rpcMode)
                    ? rpcMode
                    : resolveCompanyAccountMode(currentCompany, monthlyTotal),
            );
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
                    .select('id, name, slug, description, features, price_monthly, price_yearly, discount_yearly_percent, price_setup, is_popular, trial_days, plan_kind, account_type')
                    .eq('product_id', pid).eq('is_active', true).eq('plan_kind', 'base').order('sort_order'),
            ]);
            setProductInfo(productRes.data);
            setPlans(plansRes.data || []);
        } catch (err) {
            console.error('Error loading plans:', err);
        } finally {
            setLoadingPlans(false);
        }
    };

    const handleOpenChangePlan = async (sub: SubscriptionRow) => {
        setSelectedSub(sub);
        setSelectedNewPlan(null);
        setChangeBillingCycle(sub.billing_cycle === 'yearly' ? 'yearly' : 'monthly');
        setChangePlanModalOpen(true);
        setChangePlanLoading(true);
        try {
            const { data } = await supabase
                .from('product_plans')
                .select('id, name, slug, description, features, price_monthly, price_yearly, discount_yearly_percent, price_setup, is_popular, trial_days, plan_kind, account_type')
                .eq('product_id', sub.product_id).eq('is_active', true).eq('plan_kind', 'base').order('sort_order');
            setChangePlans(data || []);
        } catch (err) {
            console.error('Error loading plans for change:', err);
        } finally {
            setChangePlanLoading(false);
        }
    };

    const handleConfirmPlanChange = async () => {
        if (!selectedSub || !selectedNewPlan || !currentCompany) return;
        const cycle = changeBillingCycle === 'yearly' ? 'annual' : 'monthly';
        setChangePlanModalOpen(false);
        navigate(`/checkout?produto=${selectedSub.product_id}&plano=${selectedNewPlan.slug}&ciclo=${cycle}`);
    };

    const handleOpenInvoices = async (sub: SubscriptionRow) => {
        if (!sub.id) return;
        setSelectedSub(sub);
        setInvoicesModalOpen(true);
        setInvoicesLoading(true);
        try {
            const bills = await listPaymentsBySubscription(sub.id);
            setInvoices(bills);
        } catch (err) {
            notifications.show({ title: 'Erro', message: 'Falha ao buscar histórico do gateway Asaas', color: 'red' });
        } finally {
            setInvoicesLoading(false);
        }
    };

    const handleConfirmCancel = async () => {
        if (!selectedSub) return;
        setCancelLoading(true);

        try {
            // 1. Checagem rígida de débitos: Se hover fatura com status vencida (e não apenas aguardando), barrar.
            // PENDING é o estado das faturas futuras mensais ou da atual no prazo, OVERDUE é atrasada (débito aberto)
            const bills = await listPaymentsBySubscription(selectedSub.id);
            const hasOverdue = bills.some((b: any) => b.status === 'OVERDUE');
            if (hasOverdue) {
                setCancelModalOpen(false);
                notifications.show({ title: 'Ação Bloqueada', message: 'Você possui pendências em aberto. Quite seus débitos para poder cancelar a assinatura.', color: 'red' });
                return;
            }

            const res = await cancelSubscription(selectedSub.id);
            if (res.success) {
                await supabase.from('subscriptions').update({ status: 'canceled', canceled_at: new Date().toISOString() }).eq('id', selectedSub.id);
                
                if (subscriber?.email) {
                    await sendEmail(
                        subscriber.email,
                        'Confirmação de Cancelamento de Assinatura',
                        `Sua assinatura do plano ${selectedSub.product?.name || 'Contratado'} foi cancelada com sucesso. Fique tranquilo, o seu acesso vigora normalmente até o fechamento do período já pago.`,
                        'billing',
                        undefined,
                        currentCompany.id,
                    );
                }

                notifications.show({ title: 'Cancelada', message: 'Assinatura cancelada com sucesso. O acesso vigora até o fim do ciclo.', color: 'green' });
                setCancelModalOpen(false);
                loadData();
            } else {
                notifications.show({ title: 'Falha', message: res.error || 'Falha ao cancelar serviço financeiro', color: 'red' });
            }
        } catch {
            notifications.show({ title: 'Erro', message: 'Não foi possível validar o extrato de faturas com o Asaas.', color: 'red' });
        } finally {
            setCancelLoading(false);
        }
    };

    const getPlanDirection = (currentPlan: string, newPlan: PlanOption): 'upgrade' | 'downgrade' | 'same' => {
        const order = ['free', 'starter', 'pro', 'business', 'enterprise', 'team'];
        const currentIdx = order.indexOf(currentPlan);
        const newIdx = order.indexOf(newPlan.slug);
        if (newIdx > currentIdx) return 'upgrade';
        if (newIdx < currentIdx) return 'downgrade';
        return 'same';
    };

    // ---- No company ----
    if (!currentCompany) {
        return (
            <Container size="xl" py="md">
                <PageHeader title="Meu Ecossistema" subtitle="Selecione ou crie uma empresa para ver suas ferramentas." helpContent="Aqui você visualiza as ferramentas Sincla ativas para a empresa selecionada." />
                <EmptyState icon={<IconCreditCard size={28} />} title="Nenhuma empresa selecionada" description="Selecione ou crie uma empresa." actionLabel="Ir para Empresas" onAction={() => navigate('/painel/empresas')} />
            </Container>
        );
    }

    const color = productInfo?.brand_color || '#0047CC';
    const activeCount = subscriptions.filter(s => s.status === 'active').length;
    const totalAmount = subscriptions.filter(s => ['active', 'trial'].includes(s.status)).reduce((sum, s) => sum + (s.monthly_amount || 0), 0);
    const isLifetime = accountMode === 'lifetime';
    const isFullAccess = isFullAccessMode(accountMode);
    const showBilling = shouldShowBillingUI(accountMode, platformBillingEnabled);
    const totalSeatsUsed = subscriptions.reduce((acc, s) => acc + (s.seats_used || 0), 0);
    const totalSeatsLimit = subscriptions.reduce((acc, s) => acc + (s.seats_limit || 0), 0);
    const seatsSummaryUnlimited = subscriptions.length > 0 && subscriptions.every(s => isUnlimitedSeats(s.seats_limit));
    const activeSubscriptions = subscriptions.filter(s => ['active', 'trial'].includes(s.status));
    const inactiveSubscriptions = subscriptions.filter(s => !['active', 'trial'].includes(s.status));
    const activeProductIds = new Set(activeSubscriptions.map(s => s.product_id));
    const availableProducts = catalogProducts.filter(p => !activeProductIds.has(p.id) && p.hasPlans);

    const handleActivateProduct = (productIdToActivate: string) => {
        const next = new URLSearchParams(searchParams);
        next.set('produto', productIdToActivate);
        next.delete('sucesso');
        setSearchParams(next);
    };

    const handleCloseActivationDrawer = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('produto');
        setSearchParams(next, { replace: true });
    };

    const renderSubscriptionCard = (sub: SubscriptionRow) => {
        const subColor = sub.product?.brand_color || '#0047CC';
        const IconComp = iconMap[sub.product?.icon || ''] || IconRocket;
        const daysLeft = sub.current_period_end
            ? Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / 86400000))
            : null;
        const seatPercent = sub.seats_limit > 0 && !isUnlimitedSeats(sub.seats_limit)
            ? (sub.seats_used / sub.seats_limit) * 100
            : 0;
        const isSuspendedData = sub.status === 'suspended' || sub.status === 'canceled';
        let isAccessBlockedDate = false;
        let daysLate = 0;
        if (sub.status === 'past_due' && sub.current_period_end) {
            const pass = Math.ceil((Date.now() - new Date(sub.current_period_end).getTime()) / 86400000);
            if (pass > 5) isAccessBlockedDate = true;
            daysLate = pass;
        }
        const isAccessBlocked = isSuspendedData || isAccessBlockedDate;
        const showPlanBadge = showBilling && !isFullAccess && sub.plan && sub.plan !== 'lifetime';

        return (
            <Card key={sub.id} withBorder radius="md" padding={0} style={{ overflow: 'hidden', transition: 'all 0.2s ease', opacity: isAccessBlocked ? 0.8 : 1 }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.boxShadow = `0 8px 24px ${subColor}20`; }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
                <Box style={{ background: `linear-gradient(135deg, ${subColor}, ${subColor}cc)`, padding: '16px 20px' }}>
                    <Group justify="space-between">
                        <Group gap="sm">
                            <ThemeIcon size="lg" radius="md" variant="white" color="dark" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <IconComp size={20} color="#fff" />
                            </ThemeIcon>
                            <div>
                                <Text fw={700} c="white" size="md">{sub.product?.name || sub.product_id}</Text>
                                {showPlanBadge && (
                                    <Group gap={6} mt={4}>
                                        <Badge size="xs" variant="white" style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                                            <IconCrown size={10} style={{ marginRight: 4 }} />{planLabels[sub.plan] || sub.plan}
                                        </Badge>
                                    </Group>
                                )}
                            </div>
                        </Group>
                        <Group gap="xs">
                            <Badge color={statusColors[sub.status] || 'gray'} variant="filled" size="sm" style={{ textTransform: 'capitalize' }}>
                                {statusLabels[sub.status] || sub.status}
                            </Badge>
                            {showBilling && (
                                <Menu shadow="md" width={220} position="bottom-end" withinPortal>
                                    <Menu.Target>
                                        <ActionIcon variant="transparent" color="white" size="sm">
                                            <IconDotsVertical size={16} />
                                        </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Item leftSection={<IconFileInvoice size={14} />} onClick={() => handleOpenInvoices(sub)}>
                                            Histórico de Faturas
                                        </Menu.Item>
                                        {sub.status !== 'canceled' && (
                                            <>
                                                <Menu.Divider />
                                                <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => { setSelectedSub(sub); setCancelModalOpen(true); }}>
                                                    Cancelar Assinatura
                                                </Menu.Item>
                                            </>
                                        )}
                                    </Menu.Dropdown>
                                </Menu>
                            )}
                        </Group>
                    </Group>
                </Box>

                <Box p="md">
                    {showBilling ? (
                        <SimpleGrid cols={3} spacing="xs" mb="sm">
                            <div style={{ textAlign: 'center' }}>
                                <Text size="xs" c="dimmed">Valor</Text>
                                <Text size="sm" fw={700}>{sub.monthly_amount > 0 ? formatCurrency(sub.monthly_amount) : 'Grátis'}</Text>
                                <Text size="xs" c="dimmed">/{sub.billing_cycle === 'yearly' ? 'ano' : 'mês'}</Text>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <Text size="xs" c="dimmed">Seats</Text>
                                <Text size="sm" fw={700}>{formatSeatsDisplay(sub.seats_used, sub.seats_limit)}</Text>
                                {!isUnlimitedSeats(sub.seats_limit) && (
                                    <Progress value={seatPercent} size={4} color={seatPercent > 90 ? 'red' : subColor} mt={4} />
                                )}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <Text size="xs" c="dimmed">Renova em</Text>
                                <Text size="sm" fw={700}>{daysLeft !== null ? `${daysLeft}d` : '—'}</Text>
                                {sub.status === 'trial' && sub.trial_ends_at && (
                                    <Text size="xs" c="blue">Trial até {formatDate(sub.trial_ends_at)}</Text>
                                )}
                            </div>
                        </SimpleGrid>
                    ) : (
                        <Stack gap={4} align="center" mb="sm">
                            <Text size="xs" c="dimmed">Usuários ativos</Text>
                            <Text size="sm" fw={700}>{formatSeatsDisplay(sub.seats_used, sub.seats_limit)}</Text>
                        </Stack>
                    )}

                    <Divider my="xs" />

                    <Group justify={showBilling ? 'space-between' : 'center'} mt="md">
                        {showBilling && (
                            <Tooltip label={isAccessBlocked ? 'O plano desta assinatura não permite alterações' : 'Mudar plano'} withArrow>
                                <Button variant="subtle" size="xs" leftSection={<IconArrowsExchange size={14} />}
                                    onClick={() => handleOpenChangePlan(sub)} disabled={sub.status === 'canceled' || isAccessBlocked}
                                >
                                    Alterar Plano
                                </Button>
                            </Tooltip>
                        )}
                        <Tooltip label={isAccessBlocked ? (daysLate > 0 ? `Seu acesso está bloqueado por inatividade ou atraso de ${daysLate} dias.` : 'O plano desta assinatura foi cancelado ou desativado.') : 'Acessar ferramenta'} withArrow>
                            <Button variant={isAccessBlocked ? 'filled' : 'light'} size={showBilling ? 'xs' : 'sm'} rightSection={<IconExternalLink size={14} />}
                                color={isAccessBlocked ? 'red' : undefined}
                                style={!isAccessBlocked ? { color: subColor } : undefined}
                                disabled={isAccessBlocked}
                                onClick={async () => {
                                    if (isAccessBlocked) return;
                                    try {
                                        await redirectToProduct(
                                            { id: sub.product_id, base_url: sub.product?.base_url } as any,
                                            currentCompany as any
                                        );
                                    } catch { /* silent */ }
                                }}
                            >
                                {isAccessBlocked ? 'Bloqueada' : 'Acessar'}
                            </Button>
                        </Tooltip>
                    </Group>
                </Box>
            </Card>
        );
    };

    const renderAvailableProductCard = (product: CatalogProduct) => {
        const color = product.brand_color || '#0047CC';
        const IconComp = iconMap[product.icon] || IconRocket;
        return (
            <Card key={product.id} withBorder radius="md" padding="md">
                <Group gap="sm" align="flex-start" wrap="nowrap" mb="sm">
                    <ThemeIcon size="lg" radius="md" variant="light" style={{ backgroundColor: `${color}18`, color }}>
                        <IconComp size={20} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                        <Text fw={700} size="sm">{product.name}</Text>
                        {product.description && (
                            <Text size="xs" c="dimmed" lineClamp={2} mt={4}>{product.description}</Text>
                        )}
                    </div>
                </Group>
                <Button fullWidth variant="light" leftSection={<IconPlus size={16} />} style={{ color }}
                    onClick={() => handleActivateProduct(product.id)}>
                    Ativar ferramenta
                </Button>
            </Card>
        );
    };

    // ============================
    // Main View (Tabs)
    // ============================

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <PageHeader
                    title="Meu Ecossistema"
                    subtitle={`Ferramentas e recursos de ${currentCompany.name}`}
                    helpContent={
                        <Text size="sm">Veja quais ferramentas Sincla estão ativas, acesse cada produto e monitore uso de IA e armazenamento.</Text>
                    }
                />

                {isFullAccess && (
                    <Alert variant="light" color={isLifetime ? 'violet' : 'blue'} icon={<IconCrown size={18} />} radius="md">
                        <Text size="sm" fw={600}>
                            {isLifetime ? 'Acesso completo ao ecossistema Sincla' : 'Conta parceira com acesso ampliado'}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                            {isLifetime
                                ? 'Sua empresa tem acesso vitalício a todas as ferramentas — sem cobrança mensal nesta área.'
                                : 'Ferramentas liberadas pela parceria Sincla — gestão financeira fica oculta enquanto o billing estiver desligado.'}
                        </Text>
                    </Alert>
                )}

                {/* ── Hero KPIs ── */}
                {loading ? (
                    <SimpleGrid cols={{ base: 2, sm: showBilling ? 4 : 2 }} spacing="md">
                        {Array(showBilling ? 4 : 2).fill(0).map((_, i) => <Skeleton key={i} height={100} radius="md" />)}
                    </SimpleGrid>
                ) : showBilling ? (
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                        <Paper radius="md" p="md" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}>
                            <Group gap="xs">
                                <IconCreditCard size={18} style={{ opacity: 0.8 }} />
                                <Text size="xs" style={{ opacity: 0.85 }}>Ferramentas</Text>
                            </Group>
                            <Text size="xl" fw={800} mt={4}>{subscriptions.length}</Text>
                            <Text size="xs" style={{ opacity: 0.7 }}>{activeCount} ativa{activeCount !== 1 ? 's' : ''}</Text>
                        </Paper>

                        <Paper radius="md" p="md" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: '#fff' }}>
                            <Group gap="xs">
                                <IconReceipt size={18} style={{ opacity: 0.8 }} />
                                <Text size="xs" style={{ opacity: 0.85 }}>Valor Mensal</Text>
                            </Group>
                            <Text size="xl" fw={800} mt={4}>{formatCurrency(totalAmount)}</Text>
                            <Text size="xs" style={{ opacity: 0.7 }}>planos ativos</Text>
                        </Paper>

                        <Paper radius="md" p="md" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: '#fff' }}>
                            <Group gap="xs">
                                <IconUsers size={18} style={{ opacity: 0.8 }} />
                                <Text size="xs" style={{ opacity: 0.85 }}>Seats em Uso</Text>
                            </Group>
                            <Text size="xl" fw={800} mt={4}>{totalSeatsUsed}</Text>
                            <Text size="xs" style={{ opacity: 0.7 }}>
                                {seatsSummaryUnlimited ? 'ilimitados' : `de ${totalSeatsLimit} disponíveis`}
                            </Text>
                        </Paper>

                        <Paper radius="md" p="md" style={{ background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', color: '#fff' }}>
                            <Group gap="xs">
                                <IconTrendingUp size={18} style={{ opacity: 0.8 }} />
                                <Text size="xs" style={{ opacity: 0.85 }}>Economia Anual</Text>
                            </Group>
                            <Text size="xl" fw={800} mt={4}>
                                {formatCurrency(subscriptions.filter(s => s.billing_cycle === 'yearly').reduce((acc, s) => acc + (s.monthly_amount || 0) * 2, 0))}
                            </Text>
                            <Text size="xs" style={{ opacity: 0.7 }}>com planos anuais</Text>
                        </Paper>
                    </SimpleGrid>
                ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <Paper radius="md" p="md" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}>
                            <Group gap="xs">
                                <IconRocket size={18} style={{ opacity: 0.8 }} />
                                <Text size="xs" style={{ opacity: 0.85 }}>Ferramentas ativas</Text>
                            </Group>
                            <Text size="xl" fw={800} mt={4}>{activeCount}</Text>
                            <Text size="xs" style={{ opacity: 0.7 }}>
                                de {subscriptions.length} no ecossistema
                            </Text>
                        </Paper>

                        <Paper radius="md" p="md" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: '#fff' }}>
                            <Group gap="xs">
                                <IconUsers size={18} style={{ opacity: 0.8 }} />
                                <Text size="xs" style={{ opacity: 0.85 }}>Usuários nas ferramentas</Text>
                            </Group>
                            <Text size="xl" fw={800} mt={4}>{totalSeatsUsed}</Text>
                            <Text size="xs" style={{ opacity: 0.7 }}>
                                {seatsSummaryUnlimited ? 'sem limite de seats' : `de ${totalSeatsLimit} seats`}
                            </Text>
                        </Paper>
                    </SimpleGrid>
                )}

                {/* ── Tabs ── */}
                <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tabs.List>
                        <Tabs.Tab value="assinaturas" leftSection={<IconRocket size={16} />} style={{ fontWeight: 600 }}>
                            Ferramentas
                        </Tabs.Tab>
                        <Tabs.Tab value="consumo" leftSection={<IconSparkles size={16} />} style={{ fontWeight: 600 }}>
                            Recursos
                        </Tabs.Tab>
                        <Tabs.Tab value="atalhos" leftSection={<IconSettings size={16} />} style={{ fontWeight: 600 }}>
                            Atalhos
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="assinaturas" pt="lg">
                        {loading ? (
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                {[1, 2].map(i => <Skeleton key={i} height={200} radius="md" />)}
                            </SimpleGrid>
                        ) : activeSubscriptions.length === 0 && availableProducts.length === 0 && inactiveSubscriptions.length === 0 ? (
                            <EmptyState
                                icon={<IconRocket size={28} />}
                                title="Nenhuma ferramenta ativa"
                                description="Quando uma ferramenta Sincla for habilitada para sua empresa, ela aparecerá aqui com acesso direto."
                                actionLabel="Explorar catálogo"
                                onAction={() => navigate('/painel')}
                            />
                        ) : (
                            <Stack gap="xl">
                                {activeSubscriptions.length > 0 && (
                                    <Stack gap="md">
                                        <Group justify="space-between">
                                            <Title order={4}>Ativas</Title>
                                            <Badge variant="light" color="green">{activeSubscriptions.length}</Badge>
                                        </Group>
                                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                            {activeSubscriptions.map(renderSubscriptionCard)}
                                        </SimpleGrid>
                                    </Stack>
                                )}

                                {availableProducts.length > 0 && (
                                    <Stack gap="md">
                                        <div>
                                            <Title order={4}>Disponíveis para ativar</Title>
                                            <Text size="sm" c="dimmed" mt={4}>
                                                Ferramentas do catálogo Sincla que ainda não estão ligadas a esta empresa.
                                            </Text>
                                        </div>
                                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                                            {availableProducts.map(renderAvailableProductCard)}
                                        </SimpleGrid>
                                    </Stack>
                                )}

                                {inactiveSubscriptions.length > 0 && (
                                    <Stack gap="md">
                                        <Group justify="space-between">
                                            <Title order={4}>Inativas</Title>
                                            <Badge variant="light" color="gray">{inactiveSubscriptions.length}</Badge>
                                        </Group>
                                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                            {inactiveSubscriptions.map(renderSubscriptionCard)}
                                        </SimpleGrid>
                                    </Stack>
                                )}
                            </Stack>
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="consumo" pt="lg">
                        <ConsumptionDashboard companyId={currentCompany.id} billingEnabled={showBilling} />
                    </Tabs.Panel>

                    <Tabs.Panel value="atalhos" pt="lg">
                        <EcosystemShortcutsPanel />
                    </Tabs.Panel>
                </Tabs>
            </Stack>

            {/* ═══ Modal de Sucesso ═══ */}
            <Modal opened={isSuccess && !!productInfo} onClose={handleCloseSuccessModal} title="Assinatura Confirmada!" centered size="lg">
                <Stack align="center" ta="center" py="xl">
                    <ThemeIcon size={80} radius="100%" color="green" variant="light"><IconCheck size={40} /></ThemeIcon>
                    <Title order={3} mt="md">Parabéns pela sua nova assinatura!</Title>
                    <Text c="dimmed" size="md">
                        O <strong>{productInfo?.name}</strong> foi ativado com sucesso para a empresa <strong>{currentCompany.name}</strong>.
                    </Text>
                    <Button size="md" mt="lg" fullWidth rightSection={<IconRocket size={18} />} onClick={handleAccessTool} style={{ backgroundColor: color }}>
                        Acessar a Ferramenta Agora
                    </Button>
                    <Button variant="subtle" fullWidth onClick={handleCloseSuccessModal}>Voltar ao Meu Ecossistema</Button>
                </Stack>
            </Modal>

            {/* ═══ Modal de Mudança de Plano ═══ */}
            <Modal opened={changePlanModalOpen} onClose={() => setChangePlanModalOpen(false)} centered size="xl"
                title={<Group gap="xs"><IconArrowsExchange size={20} /><Text fw={600}>Mudar Plano — {selectedSub?.product?.name || selectedSub?.product_id}</Text></Group>}
            >
                {changePlanLoading ? (
                    <Stack align="center" py="xl"><Loader /><Text c="dimmed" size="sm">Carregando...</Text></Stack>
                ) : (
                    <Stack gap="md">
                        <Group justify="center">
                            <SegmentedControl value={changeBillingCycle} onChange={(v) => setChangeBillingCycle(v as 'monthly' | 'yearly')}
                                data={[{ label: 'Mensal', value: 'monthly' }, { label: 'Anual (desconto)', value: 'yearly' }]} size="sm" />
                        </Group>

                        <SimpleGrid cols={{ base: 1, sm: 2, md: changePlans.length >= 4 ? 4 : changePlans.length >= 3 ? 3 : 2 }} spacing="sm">
                            {changePlans.map((plan) => {
                                const isCurrent = plan.slug === selectedSub?.plan;
                                const isEnterprise = plan.slug === 'enterprise';
                                const isSelected = selectedNewPlan?.id === plan.id;
                                const direction = selectedSub ? getPlanDirection(selectedSub.plan, plan) : 'same';
                                const displayPrice = changeBillingCycle === 'yearly' && plan.price_yearly > 0 ? plan.price_yearly / 12 : plan.price_monthly;

                                return (
                                    <Card key={plan.id} withBorder radius="md" padding="md" style={{
                                        borderColor: isCurrent ? 'var(--mantine-color-green-5)' : isSelected ? 'var(--mantine-color-blue-5)' : undefined,
                                        borderWidth: isCurrent || isSelected ? 2 : 1,
                                        cursor: (isCurrent || isEnterprise) ? 'default' : 'pointer',
                                        opacity: isCurrent ? 0.7 : 1, transition: 'all 0.2s ease', position: 'relative',
                                    }} onClick={() => { if (!isCurrent && !isEnterprise) setSelectedNewPlan(plan); }}>
                                        {isCurrent && <Badge variant="filled" color="green" size="xs" style={{ position: 'absolute', top: 8, right: 8 }}>Atual</Badge>}
                                        {isSelected && !isCurrent && <Badge variant="filled" color="blue" size="xs" style={{ position: 'absolute', top: 8, right: 8 }}>Selecionado</Badge>}
                                        <Text fw={700} size="md">{plan.name}</Text>
                                        {plan.description && <Text size="xs" c="dimmed" lineClamp={2}>{plan.description}</Text>}
                                        <Group gap={4} align="baseline" mt="xs">
                                            <Text size="lg" fw={800} c={isCurrent ? 'green' : isSelected ? 'blue' : undefined}>
                                                {plan.price_monthly === 0 && plan.price_yearly === 0 ? 'Sob Consulta' : formatCurrency(displayPrice)}
                                            </Text>
                                            {plan.price_monthly > 0 && <Text size="xs" c="dimmed">/mês</Text>}
                                        </Group>
                                        {changeBillingCycle === 'yearly' && plan.discount_yearly_percent > 0 && (
                                            <Badge variant="light" color="green" size="xs" mt={4}>{plan.discount_yearly_percent}% de desconto</Badge>
                                        )}
                                        <Divider my="xs" />
                                        <Stack gap={3}>
                                            {plan.features.slice(0, 4).map((f: string, i: number) => (
                                                <Group key={i} gap={4} wrap="nowrap">
                                                    <IconCheck size={12} color="var(--mantine-color-green-5)" />
                                                    <Text size="xs">{f}</Text>
                                                </Group>
                                            ))}
                                            {plan.features.length > 4 && <Text size="xs" c="dimmed">+{plan.features.length - 4} mais</Text>}
                                        </Stack>
                                        {!isCurrent && !isEnterprise && direction !== 'same' && (
                                            <Badge variant="light" color={direction === 'upgrade' ? 'blue' : 'orange'} size="xs" mt="xs"
                                                leftSection={direction === 'upgrade' ? <IconArrowUp size={10} /> : <IconArrowDown size={10} />}>
                                                {direction === 'upgrade' ? 'Upgrade' : 'Downgrade'}
                                            </Badge>
                                        )}
                                        {isEnterprise && !isCurrent && (
                                            <Button fullWidth variant="filled" color="green" size="xs" mt="xs" leftSection={<IconBrandWhatsapp size={14} />}
                                                onClick={(e) => { e.stopPropagation(); const num = platformWhatsapp.replace(/\D/g, ''); window.open(`https://wa.me/55${num}?text=${encodeURIComponent(`Olá! Gostaria do plano Enterprise.`)}`, '_blank'); }}>
                                                Falar com Consultor
                                            </Button>
                                        )}
                                    </Card>
                                );
                            })}
                        </SimpleGrid>

                        {selectedNewPlan && (
                            <Card withBorder radius="md" padding="md" bg="var(--mantine-color-blue-0)">
                                <Group justify="space-between" align="center">
                                    <div>
                                        <Text size="sm" fw={600}>
                                            {getPlanDirection(selectedSub?.plan || '', selectedNewPlan) === 'upgrade' ? '⬆️ Upgrade' : '⬇️ Downgrade'}: {planLabels[selectedSub?.plan || ''] || selectedSub?.plan} → {selectedNewPlan.name}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Novo valor: {formatCurrency(changeBillingCycle === 'yearly' ? selectedNewPlan.price_yearly / 12 : selectedNewPlan.price_monthly)}/mês
                                        </Text>
                                    </div>
                                    <Button onClick={handleConfirmPlanChange} loading={changePlanSaving}
                                        color={getPlanDirection(selectedSub?.plan || '', selectedNewPlan) === 'upgrade' ? 'blue' : 'orange'}>
                                        Confirmar Mudança
                                    </Button>
                                </Group>
                            </Card>
                        )}
                    </Stack>
                )}
            </Modal>

            {/* ═══ Modal Histórico Faturas ═══ */}
            <Modal opened={invoicesModalOpen} onClose={() => setInvoicesModalOpen(false)} title={<Title order={4}>Histórico de Faturas</Title>} size="lg" centered>
                {invoicesLoading ? (
                    <Stack align="center" py="xl"><Loader /><Text c="dimmed">Buscando documentos no gateway...</Text></Stack>
                ) : invoices.length === 0 ? (
                    <EmptyState icon={<IconFileInvoice size={28} />} title="Nenhuma fatura encontrada" description="Nenhum pagamento registrado no Asaas para esta assinatura." />
                ) : (
                    <Stack gap="sm">
                        {invoices.map((inv: any) => (
                            <Card key={inv.id} withBorder padding="sm" radius="md">
                                <Group justify="space-between" align="center">
                                    <Group gap="sm">
                                        <ThemeIcon color={inv.status === 'RECEIVED' || inv.status === 'CONFIRMED' ? 'green' : inv.status === 'PENDING' ? 'orange' : 'gray'} variant="light" size="lg">
                                            <IconFileInvoice size={20} />
                                        </ThemeIcon>
                                        <div>
                                            <Text fw={600} size="sm">Fatura {inv.invoiceNumber || inv.id.split('_')[1] || ''}</Text>
                                            <Text size="xs" c="dimmed">Vencimento: {formatDate(inv.dueDate)}</Text>
                                        </div>
                                    </Group>
                                    <Group gap="md">
                                        <Stack gap={0} align="flex-end">
                                            <Text size="sm" fw={700}>{formatCurrency(inv.value)}</Text>
                                            <Badge size="xs" color={inv.status === 'RECEIVED' || inv.status === 'CONFIRMED' ? 'green' : inv.status === 'PENDING' ? 'orange' : 'gray'}>
                                                {inv.status === 'RECEIVED' || inv.status === 'CONFIRMED' ? 'Pago' : inv.status === 'PENDING' ? 'Aguardando' : inv.status}
                                            </Badge>
                                        </Stack>
                                        <Button variant="light" size="xs" component="a" href={inv.invoiceUrl} target="_blank" leftSection={<IconExternalLink size={14} />}>
                                            Visualizar
                                        </Button>
                                    </Group>
                                </Group>
                            </Card>
                        ))}
                    </Stack>
                )}
            </Modal>

            {/* ═══ Modal Cancelamento ═══ */}
            <Modal opened={cancelModalOpen} onClose={() => !cancelLoading && setCancelModalOpen(false)} title={<Title order={4} c="red">Cancelar Assinatura</Title>} centered>
                <Stack gap="md">
                    <Text size="sm">
                        Tem certeza que deseja solicitar o cancelamento de sua assinatura <Text span fw={700}>{(selectedSub?.product as any)?.name}</Text>?
                    </Text>
                    <Box p="sm" bg="var(--mantine-color-red-0)" style={{ borderRadius: 8, border: '1px solid var(--mantine-color-red-2)' }}>
                        <Text size="xs" c="red" fw={600}>⚠️ Atenção: Suas faturas futuras serão interrompidas.</Text>
                        <Text size="xs" c="red" mt={4}>Seu acesso continuará disponível até o fim do ciclo de faturamento vigente. Após isto, as contas e os dados da aplicação poderão ser desativados ou removidos da plataforma.</Text>
                    </Box>
                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" onClick={() => setCancelModalOpen(false)} disabled={cancelLoading}>Voltar</Button>
                        <Button color="red" onClick={handleConfirmCancel} loading={cancelLoading}>Sim, quero cancelar</Button>
                    </Group>
                </Stack>
            </Modal>

            <ToolActivationDrawer
                opened={!!productId && !isSuccess}
                onClose={handleCloseActivationDrawer}
                productId={productId}
                company={currentCompany}
                billingEnabled={showBilling}
                isFullAccess={isFullAccess}
                platformWhatsapp={platformWhatsapp}
                iconMap={iconMap}
                onActivated={loadData}
            />
        </Container>
    );
}
