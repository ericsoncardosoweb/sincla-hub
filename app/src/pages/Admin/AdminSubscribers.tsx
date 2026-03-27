import { useEffect, useState, useCallback } from 'react';
import {
    Container, Title, Text, Card, Group, Badge, Stack, Skeleton,
    Table, Avatar, TextInput, SimpleGrid, ThemeIcon, Collapse, Box,
    Button, Modal, Select, ActionIcon, Tooltip, Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
    IconSearch, IconUsers, IconBuilding, IconUserPlus,
    IconChevronDown, IconChevronRight, IconPhone,
    IconPlus, IconTrash, IconCheck, IconX, IconEdit, IconDeviceFloppy,
    IconCrown,
} from '@tabler/icons-react';
import { supabase } from '../../shared/lib/supabase';

// ============================
// Types
// ============================

interface CompanySubscription {
    id: string;
    product_id: string;
    plan: string;
    status: string;
    current_period_end: string | null;
    monthly_amount?: number | null;
}

interface CompanyRow {
    id: string;
    name: string;
    slug: string;
    status: string;
    subscriptions?: CompanySubscription[];
}

interface SubscriberRow {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    cpf_cnpj: string | null;
    avatar_url: string | null;
    created_at: string;
    companies?: CompanyRow[];
}

interface OverviewStats {
    total: number;
    thisMonth: number;
    withCompany: number;
    withoutCompany: number;
}

interface ProductOption {
    value: string;
    label: string;
}

interface PlanOption {
    value: string;
    label: string;
    productId: string;
    slug: string;
}

interface ToolAssignment {
    productId: string | null;
    planSlug: string | null;
    duration: string;
}

// ============================
// Helpers
// ============================

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR');

const DURATION_OPTIONS = [
    { value: '0', label: 'Vitalício' },
    { value: '30', label: '30 dias' },
    { value: '60', label: '60 dias' },
    { value: '90', label: '90 dias' },
];

// ============================
// Component
// ============================

export function AdminSubscribers() {
    const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ name: string; phone: string; cpf_cnpj: string }>({ name: '', phone: '', cpf_cnpj: '' });
    const [editLoading, setEditLoading] = useState(false);

    // Create modal state
    const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newCompanyName, setNewCompanyName] = useState('');
    const [toolAssignments, setToolAssignments] = useState<ToolAssignment[]>([
        { productId: null, planSlug: null, duration: '0' },
    ]);

    // Product & Plan options for the repeater
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [allPlans, setAllPlans] = useState<PlanOption[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('subscribers')
                .select('id, email, name, phone, cpf_cnpj, avatar_url, created_at')
                .order('created_at', { ascending: false })
                .limit(200);

            if (search.trim()) {
                query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
            }

            const { data: subsData } = await query;
            const subs = subsData || [];

            // Load companies + subscriptions for all subscribers
            const subIds = subs.map(s => s.id);
            let companiesMap: Record<string, CompanyRow[]> = {};

            if (subIds.length > 0) {
                const { data: comps } = await supabase
                    .from('companies')
                    .select('id, name, slug, status, subscriber_id')
                    .in('subscriber_id', subIds);

                const companyIds = (comps || []).map(c => c.id);
                let subsMap: Record<string, CompanySubscription[]> = {};

                if (companyIds.length > 0) {
                    const { data: subscriptions } = await supabase
                        .from('subscriptions')
                        .select('id, company_id, product_id, plan, status, current_period_end, monthly_amount')
                        .in('company_id', companyIds);

                    (subscriptions || []).forEach((s: any) => {
                        if (!subsMap[s.company_id]) subsMap[s.company_id] = [];
                        subsMap[s.company_id].push(s);
                    });
                }

                (comps || []).forEach((c: any) => {
                    if (!companiesMap[c.subscriber_id]) companiesMap[c.subscriber_id] = [];
                    companiesMap[c.subscriber_id].push({
                        id: c.id, name: c.name, slug: c.slug, status: c.status,
                        subscriptions: subsMap[c.id] || [],
                    });
                });
            }

            setSubscribers(subs.map(s => ({
                ...s,
                companies: companiesMap[s.id] || [],
            })));

            // Stats
            const now = new Date();
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const [totalRes, monthRes] = await Promise.all([
                supabase.from('subscribers').select('id', { count: 'exact', head: true }),
                supabase.from('subscribers').select('id', { count: 'exact', head: true })
                    .gte('created_at', firstOfMonth),
            ]);

            const withCompany = Object.keys(companiesMap).length;

            setStats({
                total: totalRes.count || 0,
                thisMonth: monthRes.count || 0,
                withCompany,
                withoutCompany: (totalRes.count || 0) - withCompany,
            });
        } catch (error) {
            console.error('Error loading subscribers:', error);
        } finally {
            setLoading(false);
        }
    }, [search]);

    const loadProductsAndPlans = useCallback(async () => {
        try {
            const { data: prods, error: prodsErr } = await supabase
                .from('products')
                .select('id, name')
                .eq('is_active', true)
                .order('name');
            if (prodsErr) console.error('Erro ao carregar produtos:', prodsErr);
            setProducts((prods || []).map(p => ({ value: p.id, label: p.name })));

            const { data: plans, error: plansErr } = await supabase
                .from('product_plans')
                .select('id, name, slug, product_id')
                .eq('is_active', true)
                .order('sort_order');
            if (plansErr) console.error('Erro ao carregar planos:', plansErr);
            setAllPlans((plans || []).map(p => ({
                value: p.slug,
                label: p.name,
                productId: p.product_id,
                slug: p.slug,
            })));
        } catch (err) {
            console.error('Erro geral ao carregar produtos/planos:', err);
        }
    }, []);

    // Carrega produtos/planos quando o modal abre
    useEffect(() => {
        if (createOpened) {
            loadProductsAndPlans();
        }
    }, [createOpened]);

    useEffect(() => {
        loadData();
    }, []);

    const handleSearch = () => {
        loadData();
    };

    // ============================
    // Tool Assignment Repeater
    // ============================
    const addToolRow = () => {
        setToolAssignments(prev => [...prev, { productId: null, planSlug: null, duration: '0' }]);
    };

    const removeToolRow = (index: number) => {
        setToolAssignments(prev => prev.filter((_, i) => i !== index));
    };

    const updateToolRow = (index: number, field: keyof ToolAssignment, value: string | null) => {
        setToolAssignments(prev => prev.map((row, i) => {
            if (i !== index) return row;
            const updated = { ...row, [field]: value };
            // Reset plan when product changes
            if (field === 'productId') updated.planSlug = null;
            return updated;
        }));
    };

    const getPlansForProduct = (productId: string | null) => {
        if (!productId) return [];
        return allPlans
            .filter(p => p.productId === productId)
            .map(p => ({ value: p.slug, label: p.label }));
    };

    // Get products already selected (to avoid duplicates)
    const getAvailableProducts = (currentIndex: number) => {
        const selectedIds = toolAssignments
            .filter((_, i) => i !== currentIndex)
            .map(t => t.productId)
            .filter(Boolean);
        return products.filter(p => !selectedIds.includes(p.value));
    };

    // ============================
    // Create Subscriber Handler
    // ============================
    const handleCreateSubscriber = async () => {
        if (!newEmail.trim() || !newName.trim() || !newCompanyName.trim()) {
            notifications.show({
                title: 'Campos obrigatórios',
                message: 'Preencha email, nome e nome da empresa.',
                color: 'red',
            });
            return;
        }

        const validTools = toolAssignments.filter(t => t.productId);
        if (validTools.length === 0) {
            notifications.show({
                title: 'Selecione ao menos uma ferramenta',
                message: 'Adicione pelo menos uma ferramenta com plano para o assinante.',
                color: 'red',
            });
            return;
        }

        setCreateLoading(true);
        try {
            // Provisão completa via Edge Function (user + company + subscriptions + email)
            const { data, error } = await supabase.functions.invoke('admin-provision-subscriber', {
                body: {
                    email: newEmail.trim(),
                    name: newName.trim(),
                    companyName: newCompanyName.trim(),
                    tools: validTools.map(t => ({
                        productId: t.productId,
                        planSlug: t.planSlug || 'enterprise',
                        durationDays: parseInt(t.duration) || 0,
                    })),
                },
            });

            if (error || data?.error) {
                throw new Error(error?.message || data?.error || 'Falha desconhecida');
            }

            // Check for subscription-specific errors
            if (data?.subscription_errors?.length > 0) {
                notifications.show({
                    title: '⚠️ Assinante criado, mas erro na assinatura',
                    message: `Empresa criada, porém falha ao atribuir ferramentas: ${data.subscription_errors.join('; ')}`,
                    color: 'orange',
                    autoClose: 10000,
                });
            }

            notifications.show({
                title: 'Assinante criado com sucesso! ✅',
                message: data?.already_existed
                    ? `Usuário já existia. Empresa "${newCompanyName}" criada e ferramentas atribuídas.`
                    : `Conta criada para ${newEmail}. Email com credenciais enviado.`,
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            // Reset form
            setNewEmail('');
            setNewName('');
            setNewCompanyName('');
            setToolAssignments([{ productId: null, planSlug: null, duration: '0' }]);
            closeCreate();
            loadData();

        } catch (error: any) {
            console.error('Error creating subscriber:', error);
            notifications.show({
                title: 'Erro ao criar assinante',
                message: error.message || 'Falha desconhecida.',
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setCreateLoading(false);
        }
    };

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <Group justify="space-between">
                    <div>
                        <Title order={2}>Assinantes</Title>
                        <Text c="dimmed">Todos os usuários cadastrados na plataforma Sincla Hub</Text>
                    </div>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        color="violet"
                        onClick={openCreate}
                    >
                        Novo Assinante
                    </Button>
                </Group>

                {/* KPIs */}
                {loading ? (
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                        {Array(4).fill(0).map((_, i) => <Skeleton key={i} height={90} radius="md" />)}
                    </SimpleGrid>
                ) : stats && (
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="blue">
                                    <IconUsers size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Total Assinantes</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs">{stats.total.toLocaleString('pt-BR')}</Text>
                        </Card>
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="green">
                                    <IconUserPlus size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Novos este mês</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs" c="green">{stats.thisMonth}</Text>
                        </Card>
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="violet">
                                    <IconBuilding size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Com empresa</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs">{stats.withCompany}</Text>
                        </Card>
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="orange">
                                    <IconUsers size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Sem empresa</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs" c="orange">{stats.withoutCompany}</Text>
                        </Card>
                    </SimpleGrid>
                )}

                {/* Search */}
                <TextInput
                    placeholder="Buscar por nome, email ou telefone..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />

                {/* Table */}
                {loading ? (
                    <Stack gap="sm">
                        {[1, 2, 3].map(i => <Skeleton key={i} height={55} radius="md" />)}
                    </Stack>
                ) : subscribers.length === 0 ? (
                    <Card shadow="sm" padding="xl" radius="md" withBorder>
                        <Text ta="center" c="dimmed">Nenhum assinante encontrado.</Text>
                    </Card>
                ) : (
                    <Card shadow="sm" padding={0} radius="md" withBorder>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th style={{ width: 30 }}></Table.Th>
                                    <Table.Th>Assinante</Table.Th>
                                    <Table.Th>Telefone</Table.Th>
                                    <Table.Th>CPF/CNPJ</Table.Th>
                                    <Table.Th>Empresas</Table.Th>
                                    <Table.Th>Plano</Table.Th>
                                    <Table.Th>Cadastro</Table.Th>
                                    <Table.Th style={{ width: 50 }}></Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {subscribers.map(sub => (
                                    <>
                                        <Table.Tr
                                            key={sub.id}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                setExpandedId(expandedId === sub.id ? null : sub.id);
                                            }}
                                        >
                                            <Table.Td>
                                                {expandedId === sub.id
                                                    ? <IconChevronDown size={14} />
                                                    : <IconChevronRight size={14} />
                                                }
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap="sm">
                                                    <Avatar
                                                        radius="xl"
                                                        size="sm"
                                                        src={sub.avatar_url}
                                                        color="blue"
                                                    >
                                                        {(sub.name || sub.email || '?').charAt(0).toUpperCase()}
                                                    </Avatar>
                                                    <div>
                                                        <Text size="sm" fw={500}>{sub.name || 'Sem nome'}</Text>
                                                        <Text size="xs" c="dimmed">{sub.email}</Text>
                                                    </div>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                {sub.phone ? (
                                                    <Group gap={4}>
                                                        <IconPhone size={12} />
                                                        <Text size="sm">{sub.phone}</Text>
                                                    </Group>
                                                ) : (
                                                    <Text size="sm" c="dimmed">—</Text>
                                                )}
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{sub.cpf_cnpj || '—'}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge
                                                    variant="light"
                                                    color={(sub.companies?.length || 0) > 0 ? 'violet' : 'gray'}
                                                    size="sm"
                                                >
                                                    {sub.companies?.length || 0}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                {(() => {
                                                    const allSubs = sub.companies?.flatMap(c => c.subscriptions || []) || [];
                                                    const activeSub = allSubs.find(s => s.status === 'active');
                                                    if (!activeSub) return <Text size="sm" c="dimmed">—</Text>;
                                                    return (
                                                        <Badge variant="light" color="blue" size="sm">
                                                            {activeSub.plan}
                                                        </Badge>
                                                    );
                                                })()}
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{formatDate(sub.created_at)}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                {editingId === sub.id ? (
                                                    <Group gap={4}>
                                                        <ActionIcon
                                                            size="sm" variant="light" color="green"
                                                            loading={editLoading}
                                                            onClick={async (e: React.MouseEvent) => {
                                                                e.stopPropagation();
                                                                setEditLoading(true);
                                                                try {
                                                                    const { error } = await supabase
                                                                        .from('subscribers')
                                                                        .update({
                                                                            name: editForm.name || null,
                                                                            phone: editForm.phone || null,
                                                                            cpf_cnpj: editForm.cpf_cnpj || null,
                                                                        })
                                                                        .eq('id', sub.id);
                                                                    if (error) throw error;
                                                                    notifications.show({ title: 'Salvo ✅', message: 'Dados atualizados.', color: 'green' });
                                                                    setEditingId(null);
                                                                    loadData();
                                                                } catch (err: any) {
                                                                    notifications.show({ title: 'Erro', message: err.message, color: 'red' });
                                                                } finally {
                                                                    setEditLoading(false);
                                                                }
                                                            }}
                                                        >
                                                            <IconDeviceFloppy size={14} />
                                                        </ActionIcon>
                                                        <ActionIcon
                                                            size="sm" variant="light" color="gray"
                                                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditingId(null); }}
                                                        >
                                                            <IconX size={14} />
                                                        </ActionIcon>
                                                    </Group>
                                                ) : (
                                                    <Tooltip label="Editar">
                                                        <ActionIcon
                                                            size="sm" variant="subtle" color="gray"
                                                            onClick={(e: React.MouseEvent) => {
                                                                e.stopPropagation();
                                                                setEditingId(sub.id);
                                                                setEditForm({
                                                                    name: sub.name || '',
                                                                    phone: sub.phone || '',
                                                                    cpf_cnpj: sub.cpf_cnpj || '',
                                                                });
                                                            }}
                                                        >
                                                            <IconEdit size={14} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                        {/* Expanded details + Edit form */}
                                        <Table.Tr key={`${sub.id}-details`}>
                                            <Table.Td colSpan={8} p={0}>
                                                <Collapse in={expandedId === sub.id}>
                                                    <Box px="xl" py="sm" bg="var(--mantine-color-gray-0)">
                                                        {/* Edit form */}
                                                        {editingId === sub.id && (
                                                            <Box mb="md">
                                                                <Text size="xs" fw={600} mb="xs" c="dimmed">Editar dados:</Text>
                                                                <Group gap="sm">
                                                                    <TextInput
                                                                        size="xs" label="Nome" style={{ flex: 1 }}
                                                                        value={editForm.name}
                                                                        onChange={(e) => setEditForm(f => ({ ...f, name: e.currentTarget.value }))}
                                                                    />
                                                                    <TextInput
                                                                        size="xs" label="Telefone" style={{ flex: 1 }}
                                                                        value={editForm.phone}
                                                                        onChange={(e) => setEditForm(f => ({ ...f, phone: e.currentTarget.value }))}
                                                                    />
                                                                    <TextInput
                                                                        size="xs" label="CPF/CNPJ" style={{ flex: 1 }}
                                                                        value={editForm.cpf_cnpj}
                                                                        onChange={(e) => setEditForm(f => ({ ...f, cpf_cnpj: e.currentTarget.value }))}
                                                                    />
                                                                </Group>
                                                                <Divider my="sm" />
                                                            </Box>
                                                        )}

                                                        {/* Companies + Subscriptions */}
                                                        {(sub.companies?.length || 0) > 0 ? (
                                                            <Stack gap="sm">
                                                                <Text size="xs" fw={600} c="dimmed">
                                                                    Empresas e Assinaturas de {sub.name || sub.email}:
                                                                </Text>
                                                                {sub.companies!.map(c => (
                                                                    <Card key={c.id} withBorder padding="xs" radius="sm">
                                                                        <Group justify="space-between" mb={4}>
                                                                            <Group gap="xs">
                                                                                <IconBuilding size={14} color="var(--mantine-color-violet-6)" />
                                                                                <Text size="sm" fw={600}>{c.name}</Text>
                                                                                <Badge size="xs" variant="dot" color={c.status === 'active' ? 'green' : 'red'}>
                                                                                    {c.status}
                                                                                </Badge>
                                                                            </Group>
                                                                            <Text size="xs" c="dimmed">slug: {c.slug}</Text>
                                                                        </Group>
                                                                        {(c.subscriptions?.length || 0) > 0 ? (
                                                                            <Group gap="xs" mt={4}>
                                                                                {c.subscriptions!.map(s => (
                                                                                    <Badge
                                                                                        key={s.id}
                                                                                        variant="light"
                                                                                        size="sm"
                                                                                        color={s.status === 'active' ? 'blue' : s.status === 'trial' ? 'teal' : 'gray'}
                                                                                        leftSection={<IconCrown size={10} />}
                                                                                    >
                                                                                        {s.product_id.toUpperCase()} • {s.plan}
                                                                                        {s.monthly_amount ? ` • R$ ${Number(s.monthly_amount).toFixed(2)}` : ''}
                                                                                        {s.current_period_end ? ` • até ${formatDate(s.current_period_end)}` : ''}
                                                                                    </Badge>
                                                                                ))}
                                                                            </Group>
                                                                        ) : (
                                                                            <Text size="xs" c="dimmed" fs="italic">Sem assinaturas ativas</Text>
                                                                        )}
                                                                    </Card>
                                                                ))}
                                                            </Stack>
                                                        ) : (
                                                            <Text size="xs" c="dimmed" fs="italic">Nenhuma empresa vinculada</Text>
                                                        )}
                                                    </Box>
                                                </Collapse>
                                            </Table.Td>
                                        </Table.Tr>
                                    </>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                )}

                <Text size="xs" c="dimmed" ta="right">
                    Exibindo {subscribers.length} assinantes (máx. 200)
                </Text>
            </Stack>

            {/* ============================
                Modal: Criar Novo Assinante
            ============================ */}
            <Modal
                opened={createOpened}
                onClose={() => !createLoading && closeCreate()}
                title={
                    <Group gap="xs">
                        <IconUserPlus size={20} color="var(--mantine-color-violet-6)" />
                        <Title order={4}>Novo Assinante</Title>
                    </Group>
                }
                centered
                size="lg"
                radius="md"
            >
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Crie uma conta de assinante com empresa e atribua ferramentas com seus respectivos planos.
                        O usuário receberá um email com seus dados de acesso e a senha <strong>!Sincla1000</strong>.
                    </Text>

                    <Divider label="Dados do Assinante" labelPosition="left" />

                    <TextInput
                        label="Email"
                        placeholder="usuario@empresa.com"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.currentTarget.value)}
                        disabled={createLoading}
                    />

                    <TextInput
                        label="Nome completo"
                        placeholder="João da Silva"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.currentTarget.value)}
                        disabled={createLoading}
                    />

                    <Divider label="Empresa" labelPosition="left" />

                    <TextInput
                        label="Nome da empresa"
                        placeholder="Empresa XYZ"
                        required
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.currentTarget.value)}
                        disabled={createLoading}
                        description="O slug será gerado automaticamente a partir do nome."
                    />

                    <Divider label="Ferramentas & Planos" labelPosition="left" />

                    <Stack gap="sm">
                        {toolAssignments.map((assignment, index) => (
                            <Group key={index} gap="xs" align="flex-end" wrap="nowrap">
                                <Select
                                    label={index === 0 ? 'Produto' : undefined}
                                    placeholder="Selecione..."
                                    data={getAvailableProducts(index)}
                                    value={assignment.productId}
                                    onChange={(val) => updateToolRow(index, 'productId', val)}
                                    searchable
                                    disabled={createLoading}
                                    style={{ flex: 2 }}
                                    comboboxProps={{ zIndex: 1000 }}
                                />
                                <Select
                                    label={index === 0 ? 'Plano' : undefined}
                                    placeholder="Plano..."
                                    data={getPlansForProduct(assignment.productId)}
                                    value={assignment.planSlug}
                                    onChange={(val) => updateToolRow(index, 'planSlug', val)}
                                    disabled={!assignment.productId || createLoading}
                                    style={{ flex: 1.5 }}
                                    comboboxProps={{ zIndex: 1000 }}
                                />
                                <Select
                                    label={index === 0 ? 'Duração' : undefined}
                                    data={DURATION_OPTIONS}
                                    value={assignment.duration}
                                    onChange={(val) => updateToolRow(index, 'duration', val || '0')}
                                    disabled={createLoading}
                                    style={{ flex: 1 }}
                                    comboboxProps={{ zIndex: 1000 }}
                                />
                                {toolAssignments.length > 1 && (
                                    <Tooltip label="Remover" withArrow>
                                        <ActionIcon
                                            variant="subtle"
                                            color="red"
                                            onClick={() => removeToolRow(index)}
                                            disabled={createLoading}
                                            size="lg"
                                        >
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </Group>
                        ))}

                        <Button
                            variant="light"
                            size="xs"
                            leftSection={<IconPlus size={14} />}
                            onClick={addToolRow}
                            disabled={createLoading || toolAssignments.length >= products.length}
                        >
                            Adicionar Ferramenta
                        </Button>
                    </Stack>

                    <Divider />

                    <Group justify="flex-end" gap="sm">
                        <Button variant="subtle" onClick={closeCreate} disabled={createLoading}>
                            Cancelar
                        </Button>
                        <Button
                            color="violet"
                            onClick={handleCreateSubscriber}
                            loading={createLoading}
                            leftSection={<IconCheck size={16} />}
                        >
                            Criar Assinante
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}
