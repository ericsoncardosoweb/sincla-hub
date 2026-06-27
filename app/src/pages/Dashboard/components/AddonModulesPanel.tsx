import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card, Text, Group, Stack, ThemeIcon, Badge, Button, Skeleton, Alert, SimpleGrid,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPuzzle, IconCheck, IconPlus, IconRocket } from '@tabler/icons-react';
import { supabase } from '../../../shared/lib/supabase';
import { activateCompanyAddon } from '../../../shared/services/ecosystemActivationService';

interface AddonPlan {
    id: string;
    product_id: string;
    name: string;
    slug: string;
    description: string | null;
    features: string[];
    price_monthly: number;
    price_yearly: number;
    plan_kind: string;
    is_popular: boolean;
}

interface ActiveAddon {
    id: string;
    product_id: string;
    plan_id: string;
    status: string;
    monthly_amount: number;
    plan: { name: string; slug: string } | null;
}

interface BaseProduct {
    id: string;
    name: string;
    brand_color: string | null;
}

interface Props {
    companyId: string;
    billingEnabled: boolean;
    isFullAccess?: boolean;
}

const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function AddonModulesPanel({ companyId, billingEnabled, isFullAccess = false }: Props) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activatingSlug, setActivatingSlug] = useState<string | null>(null);
    const [products, setProducts] = useState<BaseProduct[]>([]);
    const [addonPlans, setAddonPlans] = useState<AddonPlan[]>([]);
    const [activeAddons, setActiveAddons] = useState<ActiveAddon[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: subs } = await supabase
                .from('subscriptions')
                .select('product_id, product:products(id, name, brand_color)')
                .eq('company_id', companyId)
                .in('status', ['active', 'trial']);

            const productIds = [...new Set((subs || []).map((s: { product_id: string }) => s.product_id))];
            const baseProducts = (subs || [])
                .map((s: { product: BaseProduct | BaseProduct[] | null; product_id: string }) => {
                    const p = Array.isArray(s.product) ? s.product[0] : s.product;
                    return p ? { id: p.id, name: p.name, brand_color: p.brand_color } : null;
                })
                .filter(Boolean) as BaseProduct[];

            const uniqueProducts = baseProducts.filter(
                (p, i, arr) => arr.findIndex(x => x.id === p.id) === i,
            );
            setProducts(uniqueProducts);

            if (productIds.length === 0) {
                setAddonPlans([]);
                setActiveAddons([]);
                return;
            }

            const [plansRes, addonsRes] = await Promise.all([
                supabase
                    .from('product_plans')
                    .select('id, product_id, name, slug, description, features, price_monthly, price_yearly, plan_kind, is_popular, sort_order')
                    .in('product_id', productIds)
                    .in('plan_kind', ['addon', 'bundle'])
                    .eq('is_active', true)
                    .order('sort_order'),
                supabase
                    .from('subscription_addons')
                    .select('id, product_id, plan_id, status, monthly_amount, plan:product_plans(name, slug)')
                    .eq('company_id', companyId)
                    .in('status', ['active', 'trial']),
            ]);

            setAddonPlans((plansRes.data || []) as AddonPlan[]);
            setActiveAddons((addonsRes.data || []).map((a: Record<string, unknown>) => ({
                ...a,
                plan: Array.isArray(a.plan) ? a.plan[0] : a.plan,
            })) as ActiveAddon[]);
        } catch (err) {
            console.error('[AddonModules]', err);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => { load(); }, [load]);

    const activePlanIds = useMemo(
        () => new Set(activeAddons.map(a => a.plan_id)),
        [activeAddons],
    );

    const handleActivate = async (productId: string, plan: AddonPlan) => {
        setActivatingSlug(`${productId}:${plan.slug}`);
        try {
            const result = await activateCompanyAddon(companyId, productId, plan.slug);
            if (result.requires_checkout) {
                navigate(`/checkout?produto=${productId}&plano=${plan.slug}&ciclo=monthly&tipo=modulo`);
                return;
            }
            if (!result.success) throw new Error(result.error || 'Falha ao ativar módulo');
            notifications.show({
                title: 'Módulo ativado',
                message: `${plan.name} está disponível na sua conta.`,
                color: 'green',
            });
            load();
        } catch (err: unknown) {
            notifications.show({
                title: 'Erro',
                message: err instanceof Error ? err.message : 'Não foi possível ativar',
                color: 'red',
            });
        } finally {
            setActivatingSlug(null);
        }
    };

    if (loading) {
        return <Skeleton height={120} radius="md" />;
    }

    if (products.length === 0) {
        return (
            <Alert variant="light" color="blue" icon={<IconPuzzle size={18} />}>
                <Text size="sm" fw={600}>Módulos extras</Text>
                <Text size="xs" c="dimmed" mt={4}>
                    Contrate uma ferramenta na aba Assinaturas para liberar módulos complementares (ex.: Engajamento no EAD).
                </Text>
            </Alert>
        );
    }

    if (addonPlans.length === 0) {
        return null;
    }

    return (
        <Stack gap="md">
            <Group gap="xs">
                <ThemeIcon size="md" radius="md" variant="light" color="grape">
                    <IconPuzzle size={16} />
                </ThemeIcon>
                <div>
                    <Text fw={700} size="md">Módulos extras</Text>
                    <Text size="xs" c="dimmed">
                        Complementos recorrentes das ferramentas que você já contratou
                        {isFullAccess ? ' — inclusos na sua conta' : ''}.
                    </Text>
                </div>
            </Group>

            {products.map(product => {
                const plans = addonPlans.filter(p => p.product_id === product.id);
                if (plans.length === 0) return null;
                const color = product.brand_color || '#7048e8';

                return (
                    <Card key={product.id} withBorder radius="md" padding="md">
                        <Text fw={600} size="sm" mb="sm">{product.name}</Text>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            {plans.map(plan => {
                                const isActive = activePlanIds.has(plan.id);
                                const loadingThis = activatingSlug === `${product.id}:${plan.slug}`;
                                return (
                                    <Card key={plan.id} withBorder radius="md" padding="sm" bg="var(--mantine-color-gray-0)">
                                        <Group justify="space-between" align="flex-start" wrap="nowrap" mb={6}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <Group gap={6}>
                                                    <Text fw={700} size="sm">{plan.name}</Text>
                                                    {plan.is_popular && (
                                                        <Badge size="xs" variant="light" color="yellow">Popular</Badge>
                                                    )}
                                                </Group>
                                                {plan.description && (
                                                    <Text size="xs" c="dimmed" mt={2} lineClamp={2}>{plan.description}</Text>
                                                )}
                                            </div>
                                            {isActive ? (
                                                <Badge color="green" leftSection={<IconCheck size={10} />}>Ativo</Badge>
                                            ) : (
                                                <Text fw={700} size="sm" style={{ flexShrink: 0 }}>
                                                    {plan.price_monthly > 0 ? `${fmt(plan.price_monthly)}/mês` : 'Grátis'}
                                                </Text>
                                            )}
                                        </Group>
                                        {plan.features?.length > 0 && (
                                            <Text size="xs" c="dimmed" lineClamp={2} mb="sm">
                                                {plan.features.slice(0, 3).join(' · ')}
                                            </Text>
                                        )}
                                        {!isActive && (
                                            <Button
                                                size="xs"
                                                variant="light"
                                                fullWidth
                                                loading={loadingThis}
                                                leftSection={<IconPlus size={14} />}
                                                style={{ color }}
                                                onClick={() => handleActivate(product.id, plan)}
                                            >
                                                {billingEnabled || isFullAccess ? 'Contratar módulo' : 'Ativar módulo'}
                                            </Button>
                                        )}
                                    </Card>
                                );
                            })}
                        </SimpleGrid>
                    </Card>
                );
            })}

            {activeAddons.length > 0 && (
                <Group gap="xs">
                    <IconRocket size={14} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed">
                        {activeAddons.length} módulo{activeAddons.length !== 1 ? 's' : ''} ativo{activeAddons.length !== 1 ? 's' : ''} — recursos liberados na ferramenta correspondente.
                    </Text>
                </Group>
            )}
        </Stack>
    );
}
