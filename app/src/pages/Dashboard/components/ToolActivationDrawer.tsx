import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Drawer, Stack, Group, Text, Button, Badge, ThemeIcon, Loader,
    Card, Divider, SegmentedControl, Collapse, Alert, ScrollArea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconRocket, IconCheck, IconSparkles, IconBrandWhatsapp,
    IconChevronDown, IconChevronUp, IconStar,
} from '@tabler/icons-react';
import { supabase } from '../../../shared/lib/supabase';
import { buildPlatformWhatsAppUrl } from '../../../shared/constants/platformContact';
import {
    activateCompanyProduct,
    loadProductPlans,
    type ProductPlanOption,
} from '../../../shared/services/ecosystemActivationService';
import type { Company } from '../../../shared/contexts/AuthContext';
import {
    resolveCompanyAccountType,
    companyAccountTypeLabel,
} from '../../../shared/lib/companyAccountType';

interface ProductMeta {
    id: string;
    name: string;
    description: string | null;
    brand_color: string | null;
    icon: string;
    base_url: string | null;
}

interface Props {
    opened: boolean;
    onClose: () => void;
    productId: string | null;
    company: Company;
    billingEnabled: boolean;
    isFullAccess: boolean;
    platformWhatsapp: string;
    iconMap: Record<string, typeof IconRocket>;
    onActivated: () => void;
}

const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function formatActivationError(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('sem permissão') || lower.includes('permission')) {
        return 'Apenas administradores da empresa podem ativar ferramentas. Peça a um owner ou admin.';
    }
    if (lower.includes('nenhum plano')) {
        return 'Este produto ainda não possui planos configurados para o seu tipo de conta.';
    }
    if (lower.includes('produto indisponível')) {
        return 'Esta ferramenta não está disponível no momento.';
    }
    return message;
}

export function ToolActivationDrawer({
    opened,
    onClose,
    productId,
    company,
    billingEnabled,
    isFullAccess,
    platformWhatsapp,
    iconMap,
    onActivated,
}: Props) {
    const navigate = useNavigate();
    const companyAccountType = resolveCompanyAccountType(company);
    const [product, setProduct] = useState<ProductMeta | null>(null);
    const [plans, setPlans] = useState<ProductPlanOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [activating, setActivating] = useState(false);
    const [selectedPlanSlug, setSelectedPlanSlug] = useState<string | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [showAllPlans, setShowAllPlans] = useState(false);

    useEffect(() => {
        if (!opened || !productId) return;
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const [productRes, planList] = await Promise.all([
                    supabase.from('products')
                        .select('id, name, description, brand_color, icon, base_url')
                        .eq('id', productId).single(),
                    loadProductPlans(productId, companyAccountType),
                ]);
                if (cancelled) return;
                setProduct(productRes.data);
                setPlans(planList);
                const popular = planList.find(p => p.is_popular) || planList[0];
                setSelectedPlanSlug(popular?.slug ?? null);
                setShowAllPlans(planList.length <= 3);
            } catch (err) {
                console.error(err);
                notifications.show({ title: 'Erro', message: 'Não foi possível carregar os planos.', color: 'red' });
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [opened, productId, companyAccountType]);

    const selectedPlan = useMemo(
        () => plans.find(p => p.slug === selectedPlanSlug) ?? null,
        [plans, selectedPlanSlug],
    );

    const color = product?.brand_color || '#0047CC';
    const IconComp = iconMap[product?.icon || ''] || IconRocket;

    const displayPrice = selectedPlan
        ? (billingCycle === 'yearly' && selectedPlan.price_yearly > 0
            ? selectedPlan.price_yearly / 12
            : selectedPlan.price_monthly)
        : 0;

    const isFreePlan = selectedPlan
        && selectedPlan.price_monthly === 0
        && selectedPlan.price_yearly === 0
        && selectedPlan.slug !== 'enterprise';

    const canInstantActivate = isFullAccess || isFreePlan || !billingEnabled
        || (selectedPlan?.trial_days ?? 0) > 0;

    const handleActivate = async () => {
        if (!productId || !selectedPlan) return;

        if (selectedPlan.slug === 'enterprise') {
            window.open(
                buildPlatformWhatsAppUrl(
                    `Olá! Gostaria do plano Enterprise do ${product?.name || 'Sincla'}.`,
                    platformWhatsapp,
                ),
                '_blank',
            );
            return;
        }

        setActivating(true);
        try {
            const result = await activateCompanyProduct(company.id, productId, selectedPlan.slug);

            if (result.requires_checkout) {
                const cycle = billingCycle === 'yearly' ? 'annual' : 'monthly';
                navigate(`/checkout?produto=${productId}&plano=${result.plan_slug || selectedPlan.slug}&ciclo=${cycle}`);
                onClose();
                return;
            }

            if (!result.success) {
                throw new Error(result.error || 'Não foi possível ativar');
            }

            notifications.show({
                title: 'Ferramenta ativada!',
                message: result.status === 'trial' && result.trial_days
                    ? `${product?.name} em trial por ${result.trial_days} dias.`
                    : `${product?.name} está pronta para uso.`,
                color: 'green',
            });
            onActivated();
            onClose();
        } catch (err: any) {
            notifications.show({
                title: 'Falha na ativação',
                message: formatActivationError(err?.message || 'Tente novamente.'),
                color: 'red',
            });
        } finally {
            setActivating(false);
        }
    };

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            position="right"
            size="lg"
            title={product ? `Contratar ${product.name}` : 'Contratar ferramenta'}
            padding="lg"
            lockScroll
            overlayProps={{ opacity: 0.55, blur: 3 }}
            styles={{
                content: { maxWidth: 520 },
                body: { display: 'flex', flexDirection: 'column', height: 'calc(100% - 60px)' },
            }}
        >
            {loading ? (
                <Stack align="center" py="xl"><Loader /><Text c="dimmed" size="sm">Carregando...</Text></Stack>
            ) : !product ? (
                <Text c="dimmed">Produto não encontrado.</Text>
            ) : (
                <Stack gap="md" h="100%">
                    <Group gap="sm" wrap="nowrap">
                        <ThemeIcon size={48} radius="md" variant="light" style={{ backgroundColor: `${color}18`, color }}>
                            <IconComp size={24} />
                        </ThemeIcon>
                        <div>
                            <Text fw={800} size="lg">{product.name}</Text>
                            <Text size="sm" c="dimmed" lineClamp={2}>
                                {product.description || 'Escolha um plano e ative esta ferramenta para sua empresa.'}
                            </Text>
                        </div>
                    </Group>

                    <Badge variant="light" color="gray" size="sm" w="fit-content">
                        Planos para {companyAccountTypeLabel(companyAccountType)}
                    </Badge>

                    {isFullAccess && (
                        <Alert variant="light" color="violet" icon={<IconSparkles size={16} />}>
                            Sua empresa tem acesso ampliado — a ativação é imediata, sem cobrança.
                        </Alert>
                    )}

                    {plans.length === 0 ? (
                        <Alert color="orange">Este produto ainda não possui planos configurados.</Alert>
                    ) : (
                        <>
                            <div>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={600} size="sm">Escolha o plano</Text>
                                    {plans.length > 3 && (
                                        <Button variant="subtle" size="xs"
                                            rightSection={showAllPlans ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                                            onClick={() => setShowAllPlans(v => !v)}>
                                            {showAllPlans ? 'Menos opções' : 'Comparar todos'}
                                        </Button>
                                    )}
                                </Group>

                                <ScrollArea.Autosize mah={showAllPlans ? 480 : 280} type="auto">
                                    <Stack gap="xs">
                                        {(showAllPlans ? plans : plans.slice(0, 3)).map(plan => {
                                            const active = plan.slug === selectedPlanSlug;
                                            const price = plan.price_monthly === 0 && plan.price_yearly === 0
                                                ? 'Grátis'
                                                : fmt(plan.price_monthly);
                                            return (
                                                <Card key={plan.id} withBorder radius="md" padding="sm"
                                                    onClick={() => setSelectedPlanSlug(plan.slug)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        borderColor: active ? color : undefined,
                                                        borderWidth: active ? 2 : 1,
                                                        background: active ? `${color}08` : undefined,
                                                    }}>
                                                    <Group justify="space-between" wrap="nowrap">
                                                        <div>
                                                            <Group gap={6}>
                                                                <Text fw={700} size="sm">{plan.name}</Text>
                                                                {plan.is_popular && (
                                                                    <Badge size="xs" color="yellow" leftSection={<IconStar size={10} />}>
                                                                        Recomendado
                                                                    </Badge>
                                                                )}
                                                            </Group>
                                                            {plan.description && (
                                                                <Text size="xs" c="dimmed" lineClamp={1} mt={2}>{plan.description}</Text>
                                                            )}
                                                        </div>
                                                        <Stack gap={0} align="flex-end">
                                                            <Text fw={800} size="sm" c={active ? undefined : 'dimmed'}>{price}</Text>
                                                            {plan.trial_days > 0 && (
                                                                <Text size="xs" c="green">{plan.trial_days}d grátis</Text>
                                                            )}
                                                        </Stack>
                                                    </Group>
                                                </Card>
                                            );
                                        })}
                                    </Stack>
                                </ScrollArea.Autosize>
                            </div>

                            {billingEnabled && selectedPlan && selectedPlan.price_monthly > 0 && (
                                <SegmentedControl
                                    fullWidth size="xs"
                                    value={billingCycle}
                                    onChange={(v) => setBillingCycle(v as 'monthly' | 'yearly')}
                                    data={[
                                        { label: 'Mensal', value: 'monthly' },
                                        { label: `Anual${selectedPlan.discount_yearly_percent ? ` (-${selectedPlan.discount_yearly_percent}%)` : ''}`, value: 'yearly' },
                                    ]}
                                />
                            )}

                            {selectedPlan && selectedPlan.features?.length > 0 && (
                                <Collapse in={!!selectedPlan}>
                                    <Card withBorder radius="md" padding="sm" bg="var(--mantine-color-gray-0)">
                                        <Text size="xs" fw={600} mb={6}>O que você desbloqueia</Text>
                                        <Stack gap={4}>
                                            {selectedPlan.features.slice(0, 4).map((f, i) => (
                                                <Group key={i} gap={6} wrap="nowrap">
                                                    <IconCheck size={12} color={color} />
                                                    <Text size="xs">{f}</Text>
                                                </Group>
                                            ))}
                                        </Stack>
                                    </Card>
                                </Collapse>
                            )}
                        </>
                    )}

                    <Divider />

                    <Stack gap="sm" mt="auto">
                        {selectedPlan && billingEnabled && selectedPlan.price_monthly > 0 && !canInstantActivate && (
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">Total estimado</Text>
                                <Text fw={800}>{fmt(displayPrice)}/mês</Text>
                            </Group>
                        )}

                        <Button
                            size="md"
                            fullWidth
                            loading={activating}
                            disabled={!selectedPlan || plans.length === 0}
                            leftSection={
                                selectedPlan?.slug === 'enterprise'
                                    ? <IconBrandWhatsapp size={18} />
                                    : canInstantActivate
                                        ? <IconRocket size={18} />
                                        : undefined
                            }
                            color={selectedPlan?.slug === 'enterprise' ? 'green' : undefined}
                            style={selectedPlan?.slug !== 'enterprise' ? { backgroundColor: color } : undefined}
                            onClick={handleActivate}
                        >
                            {selectedPlan?.slug === 'enterprise'
                                ? 'Falar com consultor'
                                    : canInstantActivate
                                        ? 'Ativar agora'
                                        : 'Ir para pagamento'}
                        </Button>

                        <Button variant="subtle" fullWidth onClick={onClose}>
                            Cancelar
                        </Button>
                    </Stack>
                </Stack>
            )}
        </Drawer>
    );
}
