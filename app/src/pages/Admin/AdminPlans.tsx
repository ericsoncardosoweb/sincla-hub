import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    Table,
    Button,
    Group,
    Badge,
    Modal,
    TextInput,
    Textarea,
    NumberInput,
    Stack,
    ActionIcon,
    Switch,
    Card,
    SimpleGrid,
    Divider,
    Tabs,
    Select,
    Paper,
    Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconTrash, IconArrowLeft, IconStar, IconX, IconGripVertical, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { supabase } from '../../shared/lib/supabase';

interface ProductOption {
    id: string;
    name: string;
}

interface Plan {
    id: string;
    product_id: string;
    name: string;
    slug: string;
    description: string | null;
    features: string[];
    limits: Record<string, number>;
    price_monthly: number;
    price_yearly: number;
    price_setup: number;
    discount_yearly_percent: number;
    is_active: boolean;
    is_popular: boolean;
    sort_order: number;
    trial_days: number;
    subscriptions_count?: number;
}

export function AdminPlans() {
    const { productId: paramProductId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(paramProductId || null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [_loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

    // Visual state for features & limits
    const [featuresList, setFeaturesList] = useState<string[]>(['']);
    const [limitsList, setLimitsList] = useState<{ key: string; label: string; value: number }[]>([
        { key: 'seats', label: 'Usuários', value: 5 },
        { key: 'storage_gb', label: 'Armazenamento (GB)', value: 5 },
    ]);

    const LIMIT_PRESETS = [
        { key: 'seats', label: 'Usuários' },
        { key: 'storage_gb', label: 'Armazenamento (GB)' },
        { key: 'projects', label: 'Projetos' },
        { key: 'reports', label: 'Relatórios/mês' },
        { key: 'api_calls', label: 'Chamadas de API' },
        { key: 'integrations', label: 'Integrações' },
        { key: 'custom_domains', label: 'Domínios personalizados' },
        { key: 'email_sends', label: 'Envios de e-mail/mês' },
    ];

    const form = useForm({
        initialValues: {
            name: '',
            slug: '',
            description: '',
            price_monthly: 0,
            price_yearly: 0,
            price_setup: 0,
            discount_yearly_percent: 17,
            is_active: true,
            is_popular: false,
            sort_order: 0,
            trial_days: 14,
        },
    });

    useEffect(() => {
        loadAllProducts();
    }, []);

    useEffect(() => {
        if (selectedProductId) {
            loadPlans();
        } else {
            setPlans([]);
        }
    }, [selectedProductId]);

    const loadAllProducts = async () => {
        const { data } = await supabase
            .from('products')
            .select('id, name')
            .eq('is_active', true)
            .order('name');

        setAllProducts(data || []);

        // If no product selected and we have products, select first
        if (!selectedProductId && data && data.length > 0) {
            setSelectedProductId(data[0].id);
        }
    };

    const loadPlans = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('product_plans')
                .select('*')
                .eq('product_id', selectedProductId)
                .order('sort_order');

            if (error) throw error;

            const { data: subs } = await supabase
                .from('subscriptions')
                .select('plan')
                .eq('product_id', selectedProductId!)
                .in('status', ['active', 'trial']);

            const planCounts: Record<string, number> = {};
            (subs || []).forEach(s => {
                const slug = s.plan || 'starter';
                planCounts[slug] = (planCounts[slug] || 0) + 1;
            });

            setPlans((data || []).map((p: Plan) => ({
                ...p,
                subscriptions_count: planCounts[p.slug] || 0,
            })));
        } catch (error) {
            console.error('Error loading plans:', error);
            notifications.show({
                title: 'Erro',
                message: 'Não foi possível carregar os planos',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingPlan(null);
        form.reset();
        form.setFieldValue('sort_order', plans.length + 1);
        setFeaturesList(['']);
        setLimitsList([
            { key: 'seats', label: 'Usuários', value: 5 },
            { key: 'storage_gb', label: 'Armazenamento (GB)', value: 5 },
        ]);
        setModalOpen(true);
    };

    const openEditModal = (plan: Plan) => {
        setEditingPlan(plan);
        form.setValues({
            name: plan.name,
            slug: plan.slug,
            description: plan.description || '',
            price_monthly: plan.price_monthly,
            price_yearly: plan.price_yearly,
            price_setup: plan.price_setup,
            discount_yearly_percent: plan.discount_yearly_percent,
            is_active: plan.is_active,
            is_popular: plan.is_popular,
            sort_order: plan.sort_order,
            trial_days: plan.trial_days,
        });

        // Populate features list
        const feats = Array.isArray(plan.features) ? plan.features : [];
        setFeaturesList(feats.length > 0 ? feats : ['']);

        // Populate limits list
        const limitsObj = plan.limits || {};
        const limitsArr = Object.entries(limitsObj).map(([key, value]) => {
            const preset = LIMIT_PRESETS.find(p => p.key === key);
            return { key, label: preset?.label || key, value: value as number };
        });
        setLimitsList(limitsArr.length > 0 ? limitsArr : []);

        setModalOpen(true);
    };

    const handleSubmit = async (values: typeof form.values) => {
        try {
            // Build features and limits from visual state
            const features = featuresList.filter(f => f.trim() !== '');
            const limits: Record<string, number> = {};
            limitsList.forEach(l => {
                if (l.key.trim()) limits[l.key.trim()] = l.value;
            });

            const planData = {
                product_id: selectedProductId,
                name: values.name,
                slug: values.slug.toLowerCase().replace(/\s+/g, '_'),
                description: values.description || null,
                features,
                limits,
                price_monthly: values.price_monthly,
                price_yearly: values.price_yearly,
                price_setup: values.price_setup,
                discount_yearly_percent: values.discount_yearly_percent,
                is_active: values.is_active,
                is_popular: values.is_popular,
                sort_order: values.sort_order,
                trial_days: values.trial_days,
            };

            if (editingPlan) {
                const { error } = await supabase
                    .from('product_plans')
                    .update(planData)
                    .eq('id', editingPlan.id);

                if (error) throw error;

                notifications.show({
                    title: 'Sucesso',
                    message: 'Plano atualizado com sucesso',
                    color: 'green',
                });
            } else {
                const { error } = await supabase
                    .from('product_plans')
                    .insert(planData);

                if (error) throw error;

                notifications.show({
                    title: 'Sucesso',
                    message: 'Plano criado com sucesso',
                    color: 'green',
                });
            }

            setModalOpen(false);
            loadPlans();
        } catch (error: any) {
            console.error('Error saving plan:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível salvar o plano',
                color: 'red',
            });
        }
    };

    const handleDelete = async (plan: Plan) => {
        if (!confirm(`Deseja realmente excluir o plano "${plan.name}"?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('product_plans')
                .delete()
                .eq('id', plan.id);

            if (error) throw error;

            notifications.show({
                title: 'Sucesso',
                message: 'Plano excluído com sucesso',
                color: 'green',
            });

            loadPlans();
        } catch (error: any) {
            console.error('Error deleting plan:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível excluir o plano',
                color: 'red',
            });
        }
    };

    const handleReorder = async (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= plans.length) return;

        const current = plans[index];
        const target = plans[targetIndex];

        try {
            await Promise.all([
                supabase.from('product_plans').update({ sort_order: target.sort_order }).eq('id', current.id),
                supabase.from('product_plans').update({ sort_order: current.sort_order }).eq('id', target.id),
            ]);
            loadPlans();
        } catch (err) {
            console.error('Reorder error:', err);
            notifications.show({ title: 'Erro', message: 'Falha ao reordenar', color: 'red' });
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    return (
        <Container size="xl" py="md">
            <Group justify="space-between" mb="lg">
                <Group>
                    {paramProductId && (
                        <ActionIcon variant="subtle" onClick={() => navigate('/painel/admin/produtos')}>
                            <IconArrowLeft size={20} />
                        </ActionIcon>
                    )}
                    <div>
                        <Title order={2}>Planos</Title>
                        <Text c="dimmed">Gerencie os planos e preços dos produtos</Text>
                    </div>
                </Group>
                <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={openCreateModal}
                    disabled={!selectedProductId}
                >
                    Novo Plano
                </Button>
            </Group>

            {/* Product Selector */}
            <Select
                label="Produto"
                data={allProducts.map(p => ({ value: p.id, label: p.name }))}
                value={selectedProductId}
                onChange={(val: string | null) => setSelectedProductId(val)}
                placeholder="Selecione um produto"
                mb="lg"
                maw={400}
                searchable
            />

            {/* Preview Cards */}
            <Title order={4} mb="md">Preview dos Planos</Title>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
                {plans.map((plan) => (
                    <Card
                        key={plan.id}
                        shadow="sm"
                        padding="lg"
                        radius="md"
                        withBorder
                        style={{
                            borderColor: plan.is_popular ? 'var(--mantine-color-blue-5)' : undefined,
                            opacity: plan.is_active ? 1 : 0.6,
                            cursor: 'pointer',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onClick={() => openEditModal(plan)}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                            (e.currentTarget as HTMLElement).style.boxShadow = '';
                        }}
                    >
                        {plan.is_popular && (
                            <Badge
                                color="blue"
                                variant="filled"
                                leftSection={<IconStar size={12} />}
                                mb="xs"
                            >
                                Mais Popular
                            </Badge>
                        )}
                        <Text fw={700} size="lg">{plan.name}</Text>
                        <Text size="sm" c="dimmed">{plan.description}</Text>
                        {(plan.subscriptions_count || 0) > 0 && (
                            <Badge variant="light" color="green" size="sm" mt="xs">
                                {plan.subscriptions_count} assinatura{plan.subscriptions_count !== 1 ? 's' : ''} ativa{plan.subscriptions_count !== 1 ? 's' : ''}
                            </Badge>
                        )}

                        <Group gap="xs" align="baseline">
                            <Text size="xl" fw={700}>{formatCurrency(plan.price_monthly)}</Text>
                            <Text size="sm" c="dimmed">/mês</Text>
                        </Group>

                        <Text size="xs" c="dimmed" mb="md">
                            ou {formatCurrency(plan.price_yearly)}/ano ({plan.discount_yearly_percent}% off)
                        </Text>

                        {plan.price_setup > 0 && (
                            <Badge variant="light" color="orange" size="sm" mb="xs">
                                + {formatCurrency(plan.price_setup)} setup
                            </Badge>
                        )}

                        <Divider my="sm" />

                        <Stack gap={4}>
                            {plan.features.slice(0, 4).map((feature, i) => (
                                <Text key={i} size="xs">✓ {feature}</Text>
                            ))}
                            {plan.features.length > 4 && (
                                <Text size="xs" c="dimmed">+{plan.features.length - 4} mais...</Text>
                            )}
                        </Stack>

                        <Text size="xs" c="dimmed" ta="center" mt="sm" style={{ opacity: 0.5 }}>
                            Clique para editar
                        </Text>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Table */}
            <Title order={4} mb="md">Todos os Planos</Title>

            <Table striped highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Ordem</Table.Th>
                        <Table.Th>Nome</Table.Th>
                        <Table.Th>Mensal</Table.Th>
                        <Table.Th>Anual</Table.Th>
                        <Table.Th>Setup</Table.Th>
                        <Table.Th>Trial</Table.Th>
                        <Table.Th>Assinantes</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Ações</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {plans.map((plan, index) => (
                        <Table.Tr key={plan.id}>
                            <Table.Td>
                                <Group gap={4}>
                                    <Tooltip label="Subir" withArrow>
                                        <ActionIcon
                                            variant="subtle"
                                            size="xs"
                                            disabled={index === 0}
                                            onClick={() => handleReorder(index, 'up')}
                                        >
                                            <IconArrowUp size={14} />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Text size="sm" fw={500} w={20} ta="center">{plan.sort_order}</Text>
                                    <Tooltip label="Descer" withArrow>
                                        <ActionIcon
                                            variant="subtle"
                                            size="xs"
                                            disabled={index === plans.length - 1}
                                            onClick={() => handleReorder(index, 'down')}
                                        >
                                            <IconArrowDown size={14} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            </Table.Td>
                            <Table.Td>
                                <Group gap="xs">
                                    <Text fw={500}>{plan.name}</Text>
                                    {plan.is_popular && <IconStar size={14} color="var(--mantine-color-yellow-5)" />}
                                </Group>
                            </Table.Td>
                            <Table.Td>{formatCurrency(plan.price_monthly)}</Table.Td>
                            <Table.Td>{formatCurrency(plan.price_yearly)}</Table.Td>
                            <Table.Td>{plan.price_setup > 0 ? formatCurrency(plan.price_setup) : '-'}</Table.Td>
                            <Table.Td>{plan.trial_days} dias</Table.Td>
                            <Table.Td>
                                <Badge variant="light" color={plan.subscriptions_count ? 'green' : 'gray'} size="sm">
                                    {plan.subscriptions_count || 0}
                                </Badge>
                            </Table.Td>
                            <Table.Td>
                                <Badge color={plan.is_active ? 'green' : 'red'}>
                                    {plan.is_active ? 'Ativo' : 'Inativo'}
                                </Badge>
                            </Table.Td>
                            <Table.Td>
                                <Group gap="xs">
                                    <ActionIcon variant="subtle" onClick={() => openEditModal(plan)}>
                                        <IconEdit size={16} />
                                    </ActionIcon>
                                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(plan)}>
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>

            {/* Modal */}
            <Modal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingPlan ? 'Editar Plano' : 'Novo Plano'}
                size="xl"
            >
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Tabs defaultValue="basic">
                        <Tabs.List mb="md">
                            <Tabs.Tab value="basic">Básico</Tabs.Tab>
                            <Tabs.Tab value="pricing">Preços</Tabs.Tab>
                            <Tabs.Tab value="features">Features & Limites</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="basic">
                            <Stack gap="md">
                                <TextInput
                                    label="Nome do Plano"
                                    placeholder="ex: Starter, Pro, Business"
                                    required
                                    {...form.getInputProps('name')}
                                />

                                <TextInput
                                    label="Slug"
                                    placeholder="ex: starter, pro, business"
                                    description="Identificador único (lowercase)"
                                    required
                                    {...form.getInputProps('slug')}
                                />

                                <Textarea
                                    label="Descrição"
                                    placeholder="Descreva o plano..."
                                    rows={2}
                                    {...form.getInputProps('description')}
                                />

                                <Group grow>
                                    <NumberInput
                                        label="Ordem de exibição"
                                        min={0}
                                        {...form.getInputProps('sort_order')}
                                    />

                                    <NumberInput
                                        label="Dias de trial"
                                        min={0}
                                        {...form.getInputProps('trial_days')}
                                    />
                                </Group>

                                <Group>
                                    <Switch
                                        label="Plano ativo"
                                        {...form.getInputProps('is_active', { type: 'checkbox' })}
                                    />
                                    <Switch
                                        label="Destacar como 'Mais Popular'"
                                        {...form.getInputProps('is_popular', { type: 'checkbox' })}
                                    />
                                </Group>
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="pricing">
                            <Stack gap="md">
                                <NumberInput
                                    label="Preço Mensal (R$)"
                                    placeholder="97.00"
                                    decimalScale={2}
                                    fixedDecimalScale
                                    prefix="R$ "
                                    {...form.getInputProps('price_monthly')}
                                />

                                <NumberInput
                                    label="Preço Anual Total (R$)"
                                    placeholder="970.00"
                                    description="Valor total do ano (não mensal)"
                                    decimalScale={2}
                                    fixedDecimalScale
                                    prefix="R$ "
                                    {...form.getInputProps('price_yearly')}
                                />

                                <NumberInput
                                    label="Desconto Anual (%)"
                                    placeholder="17"
                                    suffix="%"
                                    min={0}
                                    max={100}
                                    {...form.getInputProps('discount_yearly_percent')}
                                />

                                <NumberInput
                                    label="Taxa de Setup (R$)"
                                    placeholder="0.00"
                                    description="Taxa única de ativação (opcional)"
                                    decimalScale={2}
                                    fixedDecimalScale
                                    prefix="R$ "
                                    {...form.getInputProps('price_setup')}
                                />
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="features">
                            <Stack gap="lg">
                                {/* Features - Visual List */}
                                <Paper p="md" radius="md" withBorder>
                                    <Group justify="space-between" mb="sm">
                                        <div>
                                            <Text size="sm" fw={600}>Funcionalidades incluídas</Text>
                                            <Text size="xs" c="dimmed">Itens que aparecem como ✓ no card do plano</Text>
                                        </div>
                                        <Button
                                            variant="light"
                                            size="xs"
                                            leftSection={<IconPlus size={14} />}
                                            onClick={() => setFeaturesList([...featuresList, ''])}
                                        >
                                            Adicionar
                                        </Button>
                                    </Group>
                                    <Stack gap="xs">
                                        {featuresList.map((feature, index) => (
                                            <Group key={index} gap="xs">
                                                <IconGripVertical size={14} color="var(--mantine-color-gray-4)" />
                                                <TextInput
                                                    placeholder={`Ex: ${['Gestão de funcionários', 'Relatórios avançados', 'Suporte prioritário', 'API ilimitada'][index % 4]}`}
                                                    value={feature}
                                                    onChange={(e) => {
                                                        const updated = [...featuresList];
                                                        updated[index] = e.target.value;
                                                        setFeaturesList(updated);
                                                    }}
                                                    style={{ flex: 1 }}
                                                    size="sm"
                                                />
                                                <Tooltip label="Remover" withArrow>
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="red"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (featuresList.length <= 1) {
                                                                setFeaturesList(['']);
                                                            } else {
                                                                setFeaturesList(featuresList.filter((_, i) => i !== index));
                                                            }
                                                        }}
                                                    >
                                                        <IconX size={14} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        ))}
                                    </Stack>
                                </Paper>

                                {/* Limits - Named Fields */}
                                <Paper p="md" radius="md" withBorder>
                                    <Group justify="space-between" mb="sm">
                                        <div>
                                            <Text size="sm" fw={600}>Limites do plano</Text>
                                            <Text size="xs" c="dimmed">Use -1 para ilimitado</Text>
                                        </div>
                                        <Select
                                            placeholder="Adicionar limite..."
                                            data={LIMIT_PRESETS
                                                .filter(p => !limitsList.some(l => l.key === p.key))
                                                .map(p => ({ value: p.key, label: p.label }))}
                                            onChange={(val: string | null) => {
                                                if (!val) return;
                                                const preset = LIMIT_PRESETS.find(p => p.key === val);
                                                setLimitsList([...limitsList, { key: val, label: preset?.label || val, value: 5 }]);
                                            }}
                                            size="xs"
                                            w={200}
                                            clearable
                                            value={null}
                                        />
                                    </Group>
                                    {limitsList.length === 0 ? (
                                        <Text size="sm" c="dimmed" ta="center" py="md">
                                            Nenhum limite configurado. Use o seletor acima para adicionar.
                                        </Text>
                                    ) : (
                                        <Stack gap="xs">
                                            {limitsList.map((limit, index) => (
                                                <Group key={limit.key} gap="xs">
                                                    <Text size="sm" w={180} fw={500}>{limit.label}</Text>
                                                    <NumberInput
                                                        value={limit.value}
                                                        onChange={(val) => {
                                                            const updated = [...limitsList];
                                                            updated[index] = { ...updated[index], value: typeof val === 'number' ? val : 0 };
                                                            setLimitsList(updated);
                                                        }}
                                                        min={-1}
                                                        size="sm"
                                                        style={{ flex: 1 }}
                                                    />
                                                    {limit.value === -1 && (
                                                        <Badge variant="light" color="green" size="sm">Ilimitado</Badge>
                                                    )}
                                                    <Tooltip label="Remover limite" withArrow>
                                                        <ActionIcon
                                                            variant="subtle"
                                                            color="red"
                                                            size="sm"
                                                            onClick={() => setLimitsList(limitsList.filter((_, i) => i !== index))}
                                                        >
                                                            <IconX size={14} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Group>
                                            ))}
                                        </Stack>
                                    )}
                                </Paper>
                            </Stack>
                        </Tabs.Panel>
                    </Tabs>

                    <Group justify="flex-end" mt="xl">
                        <Button variant="subtle" onClick={() => setModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            {editingPlan ? 'Salvar' : 'Criar'}
                        </Button>
                    </Group>
                </form>
            </Modal>
        </Container>
    );
}
