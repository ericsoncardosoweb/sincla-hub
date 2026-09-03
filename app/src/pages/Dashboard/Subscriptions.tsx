import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Container, Text, Card, Group, Badge, Stack, Skeleton,
    ThemeIcon, SimpleGrid, Button, Divider, Loader,
    ActionIcon, Title, Modal, Tooltip, SegmentedControl,
    Paper, Progress, Tabs, Menu, Alert, Box,
} from '@mantine/core';
import {
    IconCreditCard, IconCalendar, IconReceipt, IconUsers,
    IconCheck, IconRocket, IconSchool, IconTarget,
    IconBuildingCommunity, IconShoppingCart,
    IconMessage, IconChartBar, IconArrowsExchange, IconArrowUp,
    IconArrowDown, IconBrandWhatsapp, IconSparkles, IconExternalLink, 
    IconCrown, IconTrendingUp, IconDotsVertical, IconFileInvoice, 
    IconTrash, IconPlus,
} from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';

import { supabase } from '../../shared/lib/supabase';
import { buildPlatformWhatsAppUrl, PLATFORM_WHATSAPP_DISPLAY } from '../../shared/constants/platformContact';
import { PageHeader, EmptyState } from '../../components/shared';
import { redirectToProduct } from '../../shared/services/cross-auth';
import { listPaymentsBySubscription, cancelSubscription } from '../../shared/services/asaasService';
import { notifications } from '@mantine/notifications';
import { ConsumptionDashboard } from './components/ConsumptionDashboard';
import { ToolActivationDrawer } from './components/ToolActivationDrawer';
import { StartWithToolPanel } from './components/StartWithToolPanel';
import { sendEmail } from '../../shared/services/notificationService';
import {
    resolveCompanyAccountMode,
    shouldShowBillingUI,
    isFullAccessMode,
    type CompanyAccountMode,
} from '../../shared/lib/companyAccountMode';
import {
    resolveCompanyAccountType,
    filterPlansForAccountType,
    companyAccountTypeLabel,
} from '../../shared/lib/companyAccountType';


// ============================
// Types
// ============================

interface PlanDetail {
    name: string;
    slug: string;
    description: string | null;
    features: string[];
    price_monthly: number;
}

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
    product: {
        name: string;
        brand_color?: string;
        icon?: string;
        base_url?: string;
        description?: string | null;
    } | null;
    planDetail: PlanDetail | null;
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
    account_type?: string | null;
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
    startingPlan: PlanDetail | null;
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
    isUnlimitedSeats(limit) ? `${used} em uso · ilimitado` : `${used}/${limit} seats`;

const getPlanDisplayName = (sub: SubscriptionRow, fullAccess: boolean) => {
    if (fullAccess || sub.plan === 'lifetime') return 'Acesso vitalício';
    if (sub.planDetail?.name) return sub.planDetail.name;
    return planLabels[sub.plan] || sub.plan;
};

const getBillingSummary = (sub: SubscriptionRow, billingVisible: boolean, fullAccess: boolean) => {
    if (fullAccess || sub.plan === 'lifetime') {
        return { primary: 'Incluso na conta', secondary: 'Sem cobrança mensual' };
    }
    if (sub.status === 'trial') {
        return {
            primary: sub.trial_ends_at ? `Trial até ${formatDate(sub.trial_ends_at)}` : 'Período de teste',
            secondary: sub.monthly_amount > 0 ? formatCurrency(sub.monthly_amount) + '/mês após trial' : 'Sem cartão nesta fase',
        };
    }
    if (billingVisible && sub.monthly_amount > 0) {
        return {
            primary: `${formatCurrency(sub.monthly_amount)}/${sub.billing_cycle === 'yearly' ? 'ano' : 'mês'}`,
            secondary: sub.billing_cycle === 'yearly' ? 'Plano anual' : 'Plano mensal',
        };
    }
    if (billingVisible) return { primary: 'Grátis', secondary: 'Sem valor recorrente' };
    return { primary: 'Acesso liberado', secondary: 'Detalhes de cobrança indisponíveis' };
};

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

    const [platformWhatsapp, setPlatformWhatsapp] = useState(PLATFORM_WHATSAPP_DISPLAY);

    const handleCloseSuccessModal = () => {
        searchParams.delete('sucesso');
        searchParams.delete('produto');
        setSearchParams(searchParams, { replace: true });
    };

    const handleAccessTool = async () => {
        if (!currentCompany || !productInfo) return;
        await redirectToProduct(
            { id: productInfo.id, name: productInfo.name, base_url: productInfo.base_url || '' },
            currentCompany,
        );
    };

    useEffect(() => {
        if (searchParams.get('modulo') === 'ok') {
            notifications.show({
                title: 'Módulo contratado',
                message: 'O complemento foi ativado. Os recursos já estão disponíveis na ferramenta.',
                color: 'green',
            });
            const next = new URLSearchParams(searchParams);
            next.delete('modulo');
            setSearchParams(next, { replace: true });
        }
    }, [searchParams]);

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
        else if (aba === 'ferramentas' || aba === 'assinaturas') setActiveTab('assinaturas');
    }, [searchParams]);

    const handleTabChange = (value: string | null) => {
        if (value === 'consumo') {
            const hasTool = subscriptions.some(s => ['active', 'trial'].includes(s.status))
                || isFullAccessMode(accountMode);
            if (!hasTool) return;
        }
        setActiveTab(value);
        if (!value || productId) return;
        const next = new URLSearchParams(searchParams);
        if (value === 'consumo') next.set('aba', 'recursos');
        else next.set('aba', 'assinaturas');
        setSearchParams(next, { replace: true });
    };

    const loadData = async () => {
        if (!currentCompany) return;
        setLoading(true);
        try {
            const [subsRes, productsRes, allPlansRes, modeRes] = await Promise.all([
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
                    .select('product_id, slug, name, description, features, price_monthly, plan_kind')
                    .eq('is_active', true),
                supabase.rpc('get_company_account_mode', { p_company_id: currentCompany.id }),
            ]);

            const companyType = resolveCompanyAccountType(currentCompany);
            const planByKey = new Map<string, PlanDetail>();
            const startingByProduct = new Map<string, PlanDetail>();
            (allPlansRes.data || []).forEach((p: PlanDetail & { product_id: string; plan_kind: string; account_type?: string | null }) => {
                if (p.plan_kind !== 'base') return;
                if (!filterPlansForAccountType([p], companyType).length) return;
                planByKey.set(`${p.product_id}:${p.slug}`, p);
                const existing = startingByProduct.get(p.product_id);
                if (!existing || p.price_monthly < existing.price_monthly) {
                    startingByProduct.set(p.product_id, p);
                }
            });

            const mapped = (subsRes.data || []).map((s: Record<string, unknown>) => {
                const productRaw = s.product;
                const product = Array.isArray(productRaw) ? productRaw[0] : productRaw;
                const productId = s.product_id as string;
                const plan = s.plan as string;
                return {
                    ...s,
                    product,
                    planDetail: planByKey.get(`${productId}:${plan}`) || null,
                };
            }) as SubscriptionRow[];
            setSubscriptions(mapped);

            const productsWithPlans = new Set((allPlansRes.data || [])
                .filter((p: { plan_kind: string; account_type?: string | null }) =>
                    p.plan_kind === 'base' && filterPlansForAccountType([p], companyType).length > 0)
                .map((p: { product_id: string }) => p.product_id));
            setCatalogProducts((productsRes.data || []).map((p) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                brand_color: p.brand_color,
                icon: p.icon,
                base_url: p.base_url,
                hasPlans: productsWithPlans.has(p.id),
                startingPlan: startingByProduct.get(p.id) || null,
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
        try {
            const { data } = await supabase
                .from('products')
                .select('id, name, brand_color, icon, base_url')
                .eq('id', pid)
                .single();
            setProductInfo(data);
        } catch (err) {
            console.error('Error loading product for success modal:', err);
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
            const companyType = resolveCompanyAccountType(currentCompany);
            setChangePlans(filterPlansForAccountType(data || [], companyType));
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
        if (!selectedSub || !currentCompany) return;
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
                <PageHeader title="Assinaturas" subtitle="Selecione ou crie uma empresa para ver planos e ferramentas." helpContent="Aqui você vê o que está contratado, quanto paga e pode contratar ou fazer upgrade." />
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
    const companyAccountType = resolveCompanyAccountType(currentCompany);
    const hasActiveTool = activeSubscriptions.length > 0 || isFullAccess;
    const checkoutBillingEnabled = platformBillingEnabled && !isFullAccess;
    const toolsForFirstPurchase = catalogProducts.filter(p => p.hasPlans && !activeProductIds.has(p.id));
    const allPurchasableTools = catalogProducts.filter(p => p.hasPlans);
    const availableProducts = toolsForFirstPurchase;

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
        const planName = getPlanDisplayName(sub, isFullAccess);
        const billing = getBillingSummary(sub, showBilling, isFullAccess);
        const features = sub.planDetail?.features?.length
            ? sub.planDetail.features
            : sub.product?.description
                ? [sub.product.description]
                : [];
        const canChangePlan = checkoutBillingEnabled && sub.status !== 'canceled' && !isAccessBlocked;

        return (
            <Card key={sub.id} withBorder radius="md" padding="md" style={{ opacity: isAccessBlocked ? 0.85 : 1 }}>
                <Group align="flex-start" wrap="nowrap" gap="md">
                    <ThemeIcon
                        size={44}
                        radius="md"
                        variant="light"
                        style={{ backgroundColor: `${subColor}18`, color: subColor, flexShrink: 0 }}
                    >
                        <IconComp size={22} />
                    </ThemeIcon>

                    <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
                        <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Text fw={700} size="sm">{sub.product?.name || sub.product_id}</Text>
                                {sub.product?.description && (
                                    <Text size="xs" c="dimmed" mt={2} lineClamp={2}>{sub.product.description}</Text>
                                )}
                            </div>
                            <Badge color={statusColors[sub.status] || 'gray'} variant="light" size="sm">
                                {statusLabels[sub.status] || sub.status}
                            </Badge>
                        </Group>

                        <Group gap="xs" wrap="wrap">
                            <Badge variant="outline" size="sm" leftSection={<IconCrown size={10} />}>
                                {planName}
                            </Badge>
                            <Text size="xs" fw={600}>{billing.primary}</Text>
                            {billing.secondary && <Text size="xs" c="dimmed">· {billing.secondary}</Text>}
                        </Group>

                        {features.length > 0 && (
                            <Text size="xs" c="dimmed" lineClamp={2}>
                                {features.slice(0, 4).join(' · ')}
                            </Text>
                        )}

                        <Group gap="md" wrap="wrap">
                            <Text size="xs" c="dimmed">
                                Usuários: {formatSeatsDisplay(sub.seats_used, sub.seats_limit)}
                            </Text>
                            {showBilling && daysLeft !== null && sub.status !== 'canceled' && (
                                <Text size="xs" c="dimmed">Renova em {daysLeft} dias</Text>
                            )}
                            {showBilling && !isUnlimitedSeats(sub.seats_limit) && sub.seats_limit > 0 && (
                                <Progress value={seatPercent} size={4} color={seatPercent > 90 ? 'red' : subColor} w={80} />
                            )}
                        </Group>
                    </Stack>

                    <Stack gap={6} align="stretch" style={{ flexShrink: 0, minWidth: 120 }}>
                        <Tooltip label={isAccessBlocked ? (daysLate > 0 ? `Acesso bloqueado por atraso de ${daysLate} dias.` : 'Assinatura cancelada ou suspensa.') : 'Abrir ferramenta'} withArrow>
                            <Button
                                variant={isAccessBlocked ? 'filled' : 'light'}
                                size="xs"
                                color={isAccessBlocked ? 'red' : undefined}
                                style={!isAccessBlocked ? { color: subColor } : undefined}
                                rightSection={<IconExternalLink size={14} />}
                                disabled={isAccessBlocked}
                                onClick={() => {
                                    if (isAccessBlocked || !currentCompany) return;
                                    void redirectToProduct(
                                        {
                                            id: sub.product_id,
                                            name: sub.product?.name,
                                            base_url: sub.product?.base_url || '',
                                        },
                                        currentCompany,
                                    );
                                }}
                            >
                                {isAccessBlocked ? 'Bloqueada' : 'Acessar'}
                            </Button>
                        </Tooltip>

                        {canChangePlan && (
                            <Button variant="subtle" size="xs" leftSection={<IconArrowsExchange size={14} />}
                                onClick={() => handleOpenChangePlan(sub)}>
                                {sub.status === 'trial' ? 'Assinar plano' : 'Fazer upgrade'}
                            </Button>
                        )}

                        {showBilling && (
                            <Menu shadow="md" width={200} position="bottom-end" withinPortal>
                                <Menu.Target>
                                    <ActionIcon variant="subtle" color="gray" size="sm" mx="auto">
                                        <IconDotsVertical size={16} />
                                    </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Item leftSection={<IconFileInvoice size={14} />} onClick={() => handleOpenInvoices(sub)}>
                                        Faturas
                                    </Menu.Item>
                                    {sub.status !== 'canceled' && (
                                        <>
                                            <Menu.Divider />
                                            <Menu.Item color="red" leftSection={<IconTrash size={14} />}
                                                onClick={() => { setSelectedSub(sub); setCancelModalOpen(true); }}>
                                                Cancelar
                                            </Menu.Item>
                                        </>
                                    )}
                                </Menu.Dropdown>
                            </Menu>
                        )}
                    </Stack>
                </Group>
            </Card>
        );
    };

    const renderAvailableProductCard = (product: CatalogProduct) => {
        const color = product.brand_color || '#0047CC';
        const IconComp = iconMap[product.icon] || IconRocket;
        const start = product.startingPlan;
        return (
            <Card key={product.id} withBorder radius="md" padding="md">
                <Group align="flex-start" wrap="nowrap" gap="md">
                    <ThemeIcon size={40} radius="md" variant="light" style={{ backgroundColor: `${color}18`, color, flexShrink: 0 }}>
                        <IconComp size={20} />
                    </ThemeIcon>
                    <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={700} size="sm">{product.name}</Text>
                        {product.description && (
                            <Text size="xs" c="dimmed" lineClamp={2}>{product.description}</Text>
                        )}
                        {start && (
                            <Group gap="xs">
                                <Text size="xs" c="dimmed">A partir de</Text>
                                <Text size="xs" fw={600}>
                                    {start.price_monthly > 0 ? `${formatCurrency(start.price_monthly)}/mês` : 'Sob consulta'}
                                </Text>
                                <Text size="xs" c="dimmed">· plano {start.name}</Text>
                            </Group>
                        )}
                        {start?.features?.length ? (
                            <Text size="xs" c="dimmed" lineClamp={2}>{start.features.slice(0, 3).join(' · ')}</Text>
                        ) : null}
                    </Stack>
                    <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} style={{ color, flexShrink: 0 }}
                        onClick={() => handleActivateProduct(product.id)}>
                        Contratar
                    </Button>
                </Group>
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
                    title="Assinaturas"
                    subtitle={`Planos e ferramentas de ${currentCompany.name}`}
                    helpContent={
                        <Text size="sm">Veja o plano de cada ferramenta, valor, usuários incluídos e ações para acessar, contratar ou fazer upgrade.</Text>
                    }
                />

                {isFullAccess && (
                    <Alert variant="light" color={isLifetime ? 'violet' : 'blue'} icon={<IconCrown size={18} />} radius="md">
                        <Text size="sm" fw={600}>
                            {isLifetime ? 'Acesso vitalício a todas as ferramentas' : 'Conta parceira com acesso ampliado'}
                        </Text>
                        <Text size="xs" c="dimmed" mt={4}>
                            {isLifetime
                                ? 'Sua empresa não paga mensalidade — abaixo estão os detalhes de cada ferramenta liberada.'
                                : 'Ferramentas liberadas pela parceria Sincla — cobrança oculta enquanto o billing estiver desligado.'}
                        </Text>
                    </Alert>
                )}

                {!isFullAccess && (
                    <Badge variant="light" color="gray" w="fit-content">
                        Exibindo planos para {companyAccountTypeLabel(companyAccountType)}
                    </Badge>
                )}

                {/* ── Hero KPIs (só após primeira ferramenta) ── */}
                {hasActiveTool && (loading ? (
                    <SimpleGrid cols={{ base: 2, sm: showBilling ? 4 : 2 }} spacing="md">
                        {Array(showBilling ? 4 : 2).fill(0).map((_, i) => <Skeleton key={i} height={100} radius="md" />)}
                    </SimpleGrid>
                ) : showBilling ? (
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                        <Paper radius="md" p="md" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }}>
                            <Group gap="xs">
                                <IconCreditCard size={18} style={{ opacity: 0.8 }} />
                                <Text size="xs" style={{ opacity: 0.85 }}>Assinaturas</Text>
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
                                <Text size="xs" style={{ opacity: 0.85 }}>Assinaturas ativas</Text>
                            </Group>
                            <Text size="xl" fw={800} mt={4}>{activeCount}</Text>
                            <Text size="xs" style={{ opacity: 0.7 }}>
                                de {subscriptions.length} contratadas
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
                ))}

                {/* ── Tabs ── */}
                <Tabs value={activeTab} onChange={handleTabChange}>
                    <Tabs.List>
                        <Tabs.Tab value="assinaturas" leftSection={<IconCreditCard size={16} />} style={{ fontWeight: 600 }}>
                            Assinaturas
                        </Tabs.Tab>
                        <Tabs.Tab
                            value="consumo"
                            leftSection={<IconSparkles size={16} />}
                            style={{ fontWeight: 600 }}
                            disabled={!hasActiveTool}
                        >
                            Recursos
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="assinaturas" pt="lg">
                        {loading ? (
                            <Stack gap="sm">
                                {[1, 2, 3].map(i => <Skeleton key={i} height={120} radius="md" />)}
                            </Stack>
                        ) : !hasActiveTool ? (
                            <StartWithToolPanel
                                products={allPurchasableTools.map(p => ({
                                    id: p.id,
                                    name: p.name,
                                    description: p.description,
                                    brand_color: p.brand_color,
                                    icon: p.icon,
                                    startingPlan: p.startingPlan
                                        ? { name: p.startingPlan.name, price_monthly: p.startingPlan.price_monthly, features: p.startingPlan.features }
                                        : null,
                                }))}
                                accountType={companyAccountType}
                                iconMap={iconMap}
                                onSelectProduct={handleActivateProduct}
                                ctaLabel={isFullAccess ? 'Ativar ferramenta' : 'Ver planos e contratar'}
                            />
                        ) : (
                            <Stack gap="xl">
                                {activeSubscriptions.length > 0 && (
                                    <Stack gap="md">
                                        <Group justify="space-between">
                                            <Title order={4}>Ativas</Title>
                                            <Badge variant="light" color="green">{activeSubscriptions.length}</Badge>
                                        </Group>
                                        <Stack gap="sm">
                                            {activeSubscriptions.map(renderSubscriptionCard)}
                                        </Stack>
                                    </Stack>
                                )}

                                {availableProducts.length > 0 && (
                                    <Stack gap="md">
                                        <div>
                                            <Title order={4}>Disponíveis para contratar</Title>
                                            <Text size="sm" c="dimmed" mt={4}>
                                                Ferramentas que sua empresa ainda não contratou — veja plano inicial e valores.
                                            </Text>
                                        </div>
                                        <Stack gap="sm">
                                            {availableProducts.map(renderAvailableProductCard)}
                                        </Stack>
                                    </Stack>
                                )}

                                {inactiveSubscriptions.length > 0 && (
                                    <Stack gap="md">
                                        <Group justify="space-between">
                                            <Title order={4}>Inativas</Title>
                                            <Badge variant="light" color="gray">{inactiveSubscriptions.length}</Badge>
                                        </Group>
                                        <Stack gap="sm">
                                            {inactiveSubscriptions.map(renderSubscriptionCard)}
                                        </Stack>
                                    </Stack>
                                )}
                            </Stack>
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="consumo" pt="lg">
                        {!hasActiveTool ? (
                            <Alert variant="light" color="blue" icon={<IconSparkles size={18} />}>
                                <Text size="sm" fw={600}>Recursos disponíveis após a primeira ferramenta</Text>
                                <Text size="xs" c="dimmed" mt={4}>
                                    Contrate uma ferramenta na aba Assinaturas. Depois você gerencia add-ons, armazenamento e créditos de IA aqui.
                                </Text>
                            </Alert>
                        ) : (
                            <ConsumptionDashboard
                                companyId={currentCompany.id}
                                billingEnabled={showBilling || checkoutBillingEnabled}
                                isFullAccess={isFullAccess}
                            />
                        )}
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
                    <Button variant="subtle" fullWidth onClick={handleCloseSuccessModal}>Voltar às Assinaturas</Button>
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(
                                                        buildPlatformWhatsAppUrl('Olá! Gostaria do plano Enterprise.', platformWhatsapp),
                                                        '_blank',
                                                    );
                                                }}>
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
                billingEnabled={checkoutBillingEnabled}
                isFullAccess={isFullAccess}
                platformWhatsapp={platformWhatsapp}
                iconMap={iconMap}
                onActivated={loadData}
            />
        </Container>
    );
}
