import { useEffect, useState, useMemo } from 'react';
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
    Stack,
    ActionIcon,
    Switch,
    Card,
    SimpleGrid,
    ThemeIcon,
    Skeleton,
    ColorInput,
    Box,
    Image,
    FileButton,
    Tooltip,
    ScrollArea,
    Paper,
    NumberInput,
    UnstyledButton,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
    IconPlus, IconEdit, IconTrash, IconExternalLink,
    IconChartBar, IconCreditCard, IconTrendingUp,
    IconChevronDown, IconChevronUp, IconUpload,
    IconX, IconSearch, IconGripVertical,
    // Icon library for picker
    IconUsers, IconSchool, IconTarget, IconCalendar,
    IconBuildingCommunity, IconShoppingCart, IconMessage,
    IconChartLine, IconBriefcase, IconCode, IconDatabase,
    IconRocket, IconBolt, IconHeart, IconStar,
    IconBook, IconCamera, IconCloud, IconCpu,
    IconDevices, IconFileText, IconGlobe, IconHeadphones,
    IconHome, IconLock, IconMail, IconMap,
    IconMicrophone, IconMusic, IconPalette, IconPhone,
    IconPhoto, IconPuzzle, IconSettings, IconShield,
    IconSpeakerphone, IconVideo, IconWallet, IconZoomIn,
    IconBrain, IconGavel, IconReceipt, IconClipboard,
    IconBuildingStore, IconUserCog, IconReportAnalytics,
    IconCertificate, IconPresentation, IconDashboard,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../shared/lib/supabase';
import { uploadEmpresaAsset } from '../../shared/services/storage';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============================
// Types
// ============================

interface Product {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    base_url: string;
    brand_color: string | null;
    landing_url: string | null;
    banner_url: string | null;
    favicon_url: string | null;
    logo_url: string | null;
    logo_negative_url: string | null;
    is_active: boolean;
    sort_order?: number;
    created_at: string;
    plans_count?: number;
    total_subscriptions?: number;
    active_subscriptions?: number;
    mrr?: number;
    plan_distribution?: { plan: string; count: number }[];
    plan: string;
    count: number;
}

// ============================
// Icon Picker Data
// ============================

const ICON_MAP: Record<string, React.ComponentType<any>> = {
    IconUsers, IconSchool, IconTarget, IconCalendar,
    IconBuildingCommunity, IconShoppingCart, IconMessage,
    IconChartLine, IconBriefcase, IconCode, IconDatabase,
    IconRocket, IconBolt, IconHeart, IconStar,
    IconBook, IconCamera, IconCloud, IconCpu,
    IconDevices, IconFileText, IconGlobe, IconHeadphones,
    IconHome, IconLock, IconMail, IconMap,
    IconMicrophone, IconMusic, IconPalette, IconPhone,
    IconPhoto, IconPuzzle, IconSettings, IconShield,
    IconSpeakerphone, IconVideo, IconWallet, IconZoomIn,
    IconBrain, IconGavel, IconReceipt, IconClipboard,
    IconBuildingStore, IconUserCog, IconReportAnalytics,
    IconCertificate, IconPresentation, IconDashboard,
    IconChartBar,
};

const ICON_LABELS: Record<string, string> = {
    IconUsers: 'Usuários', IconSchool: 'Escola', IconTarget: 'Alvo', IconCalendar: 'Calendário',
    IconBuildingCommunity: 'Comunidade', IconShoppingCart: 'Loja', IconMessage: 'Chat',
    IconChartLine: 'Gráfico', IconBriefcase: 'Negócios', IconCode: 'Código', IconDatabase: 'Banco',
    IconRocket: 'Foguete', IconBolt: 'Raio', IconHeart: 'Coração', IconStar: 'Estrela',
    IconBook: 'Livro', IconCamera: 'Câmera', IconCloud: 'Nuvem', IconCpu: 'Chip',
    IconDevices: 'Dispositivos', IconFileText: 'Documento', IconGlobe: 'Globo', IconHeadphones: 'Suporte',
    IconHome: 'Casa', IconLock: 'Cadeado', IconMail: 'E-mail', IconMap: 'Mapa',
    IconMicrophone: 'Microfone', IconMusic: 'Música', IconPalette: 'Design', IconPhone: 'Telefone',
    IconPhoto: 'Imagem', IconPuzzle: 'Puzzle', IconSettings: 'Config', IconShield: 'Escudo',
    IconSpeakerphone: 'Marketing', IconVideo: 'Vídeo', IconWallet: 'Carteira', IconZoomIn: 'Busca',
    IconBrain: 'IA', IconGavel: 'Jurídico', IconReceipt: 'Recibo', IconClipboard: 'Tarefas',
    IconBuildingStore: 'Loja', IconUserCog: 'Gestão', IconReportAnalytics: 'Relatórios',
    IconCertificate: 'Certificado', IconPresentation: 'Slides', IconDashboard: 'Dashboard',
    IconChartBar: 'Barras',
};

// ============================
// Helpers
// ============================

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const planLabels: Record<string, string> = {
    starter: 'Starter', pro: 'Pro', business: 'Business',
    enterprise: 'Enterprise', free: 'Free', team: 'Team',
};

function renderIcon(iconName: string, size = 20, color?: string) {
    const IconComp = ICON_MAP[iconName] || IconRocket;
    return <IconComp size={size} color={color} />;
}

// ============================
// Icon Picker Component
// ============================

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [opened, setOpened] = useState(false);
    const [search, setSearch] = useState('');

    const filteredIcons = useMemo(() => {
        const q = search.toLowerCase();
        return Object.entries(ICON_LABELS).filter(
            ([key, label]) => label.toLowerCase().includes(q) || key.toLowerCase().includes(q)
        );
    }, [search]);

    const SelectedIcon = ICON_MAP[value] || IconRocket;

    return (
        <Box>
            <Text size="sm" fw={500} mb={4}>Ícone</Text>
            <UnstyledButton
                onClick={() => setOpened(true)}
                style={{
                    border: '1px solid var(--mantine-color-gray-4)',
                    borderRadius: 'var(--mantine-radius-md)',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    cursor: 'pointer',
                }}
            >
                <SelectedIcon size={20} />
                <Text size="sm">{ICON_LABELS[value] || value}</Text>
            </UnstyledButton>

            <Modal
                opened={opened}
                onClose={() => setOpened(false)}
                title="Escolher Ícone"
                size="lg"
            >
                <Stack gap="md">
                    <TextInput
                        placeholder="Buscar ícone..."
                        leftSection={<IconSearch size={16} />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <ScrollArea h={350}>
                        <SimpleGrid cols={6} spacing="xs">
                            {filteredIcons.map(([key, label]) => {
                                const Icon = ICON_MAP[key];
                                const isSelected = value === key;
                                return (
                                    <Tooltip key={key} label={label} withArrow>
                                        <UnstyledButton
                                            onClick={() => { onChange(key); setOpened(false); }}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: 8,
                                                borderRadius: 'var(--mantine-radius-md)',
                                                border: isSelected
                                                    ? '2px solid var(--mantine-color-blue-5)'
                                                    : '1px solid var(--mantine-color-gray-2)',
                                                backgroundColor: isSelected
                                                    ? 'var(--mantine-color-blue-light)'
                                                    : 'transparent',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <Icon size={24} />
                                            <Text size="xs" ta="center" lineClamp={1}>{label}</Text>
                                        </UnstyledButton>
                                    </Tooltip>
                                );
                            })}
                        </SimpleGrid>
                    </ScrollArea>
                </Stack>
            </Modal>
        </Box>
    );
}

// ============================
// Image Upload Component
// ============================

function ImageUpload({
    label,
    description,
    value,
    onChange,
    aspectLabel,
}: {
    label: string;
    description: string;
    value: string | null;
    onChange: (url: string | null, file?: File) => void;
    aspectLabel: string;
}) {
    return (
        <Box>
            <Text size="sm" fw={500} mb={2}>{label}</Text>
            <Text size="xs" c="dimmed" mb={6}>{description} — {aspectLabel}</Text>
            <Group gap="sm" align="flex-start">
                {value ? (
                    <Box pos="relative">
                        <Image
                            src={value}
                            alt={label}
                            w={80}
                            h={80}
                            radius="md"
                            fit="contain"
                            style={{ border: '1px solid var(--mantine-color-gray-3)' }}
                        />
                        <ActionIcon
                            color="red" variant="filled" size="xs" radius="xl"
                            style={{ position: 'absolute', top: -6, right: -6 }}
                            onClick={() => onChange(null)}
                        >
                            <IconX size={10} />
                        </ActionIcon>
                    </Box>
                ) : (
                    <Box
                        w={80} h={80}
                        style={{
                            border: '2px dashed var(--mantine-color-gray-3)',
                            borderRadius: 'var(--mantine-radius-md)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <IconPhoto size={24} color="var(--mantine-color-gray-4)" />
                    </Box>
                )}
                <FileButton onChange={(file) => {
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                        notifications.show({ title: 'Erro', message: 'Máximo 2MB', color: 'red' });
                        return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => onChange(reader.result as string, file);
                    reader.readAsDataURL(file);
                }} accept="image/*">
                    {(props) => (
                        <Button variant="light" size="xs" leftSection={<IconUpload size={14} />} {...props}>
                            Enviar
                        </Button>
                    )}
                </FileButton>
            </Group>
        </Box>
    );
}

// ============================
// Sortable Product Row (DnD)
// ============================

interface SortableProductRowProps {
    product: Product;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onNavigatePlans: () => void;
}

function SortableProductRow({ product, isExpanded, onToggleExpand, onEdit, onDelete, onNavigatePlans }: SortableProductRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: product.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isDragging ? 'var(--mantine-color-blue-0)' : undefined,
    };

    return (
        <>
            <Table.Tr ref={setNodeRef} style={{ ...style, cursor: 'pointer' }} onClick={onToggleExpand}>
                <Table.Td onClick={(e) => e.stopPropagation()} style={{ cursor: 'grab', width: 40 }} {...attributes} {...listeners}>
                    <IconGripVertical size={16} color="var(--mantine-color-gray-5)" />
                </Table.Td>
                <Table.Td>
                    <ActionIcon variant="subtle" size="sm">
                        {isExpanded
                            ? <IconChevronUp size={14} />
                            : <IconChevronDown size={14} />
                        }
                    </ActionIcon>
                </Table.Td>
                <Table.Td>
                    <Group gap="xs">
                        <ThemeIcon
                            size="sm" radius="xl" variant="light"
                            color={product.brand_color || 'blue'}
                        >
                            {renderIcon(product.icon, 14)}
                        </ThemeIcon>
                        <Text size="sm" ff="monospace">{product.id}</Text>
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Text fw={500}>{product.name}</Text>
                </Table.Td>
                <Table.Td>
                    <Group gap="xs">
                        <Badge variant="light" color="green" size="sm">
                            {product.active_subscriptions} ativos
                        </Badge>
                        {(product.total_subscriptions || 0) > (product.active_subscriptions || 0) && (
                            <Badge variant="light" color="gray" size="sm">
                                {product.total_subscriptions} total
                            </Badge>
                        )}
                    </Group>
                </Table.Td>
                <Table.Td>
                    <Text size="sm" fw={600} c="teal">
                        {formatCurrency(product.mrr || 0)}
                    </Text>
                </Table.Td>
                <Table.Td>
                    <Badge variant="light" size="sm"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onNavigatePlans();
                        }}
                    >
                        {product.plans_count} planos
                    </Badge>
                </Table.Td>
                <Table.Td>
                    <Badge color={product.is_active ? 'green' : 'red'} size="sm">
                        {product.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                </Table.Td>
                <Table.Td>
                    <Group gap="xs" onClick={(e) => e.stopPropagation()}>
                        <ActionIcon variant="subtle" onClick={onEdit}>
                            <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                            variant="subtle"
                            component="a"
                            href={product.base_url}
                            target="_blank"
                        >
                            <IconExternalLink size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={onDelete}>
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Group>
                </Table.Td>
            </Table.Tr>

            {/* Expanded Analytics Row */}
            {isExpanded && (
                <Table.Tr>
                    <Table.Td colSpan={9} style={{ backgroundColor: 'var(--mantine-color-gray-0)', padding: '16px 24px' }}>
                        <Text fw={600} size="sm" mb="sm">📊 Relatório — {product.name}</Text>
                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                            <div>
                                <Text size="xs" c="dimmed">URL Base</Text>
                                <Text size="sm">{product.base_url}</Text>
                                {product.description && (
                                    <>
                                        <Text size="xs" c="dimmed" mt="sm">Descrição</Text>
                                        <Text size="sm">{product.description}</Text>
                                    </>
                                )}
                            </div>

                            <div>
                                <Text size="xs" c="dimmed" mb="xs">Distribuição por Plano</Text>
                                {(product.plan_distribution || []).length === 0 ? (
                                    <Text size="sm" c="dimmed">Nenhuma assinatura</Text>
                                ) : (
                                    <Stack gap={4}>
                                        {(product.plan_distribution || []).map((pd: { plan: string; count: number }) => (
                                            <Group key={pd.plan} justify="space-between" gap="xs">
                                                <Badge size="xs" variant="light">
                                                    {planLabels[pd.plan] || pd.plan}
                                                </Badge>
                                                <Text size="xs" fw={600}>{pd.count}</Text>
                                            </Group>
                                        ))}
                                    </Stack>
                                )}
                            </div>

                            <div>
                                <Text size="xs" c="dimmed" mb="xs">Receita</Text>
                                <Group gap="xl">
                                    <div>
                                        <Text size="xs" c="dimmed">MRR</Text>
                                        <Text size="lg" fw={700} c="teal">{formatCurrency(product.mrr || 0)}</Text>
                                    </div>
                                    <div>
                                        <Text size="xs" c="dimmed">ARR</Text>
                                        <Text size="lg" fw={700} c="blue">{formatCurrency((product.mrr || 0) * 12)}</Text>
                                    </div>
                                </Group>
                            </div>
                        </SimpleGrid>
                    </Table.Td>
                </Table.Tr>
            )}
        </>
    );
}

// ============================
// Main Component
// ============================

export function AdminProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    // Pending file uploads
    const [pendingFiles, setPendingFiles] = useState<{
        banner?: File; favicon?: File; logo?: File; logo_negative?: File;
    }>({});

    const form = useForm({
        initialValues: {
            id: '',
            name: '',
            description: '',
            icon: 'IconRocket',
            base_url: '',
            brand_color: '#0087ff',
            landing_url: '',
            banner_url: '',
            favicon_url: '',
            logo_url: '',
            logo_negative_url: '',
            commission_percent: 10,
            is_active: true,
        },
    });

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('sort_order');

            if (error) throw error;

            const enriched = await Promise.all(
                (data || []).map(async (product) => {
                    const [plansRes, subsRes] = await Promise.all([
                        supabase
                            .from('product_plans')
                            .select('*', { count: 'exact', head: true })
                            .eq('product_id', product.id),
                        supabase
                            .from('subscriptions')
                            .select('plan, status, monthly_amount')
                            .eq('product_id', product.id),
                    ]);

                    const subs = subsRes.data || [];
                    const activeSubs = subs.filter(s => s.status === 'active' || s.status === 'trial');
                    const mrr = activeSubs.reduce((sum, s) => sum + (s.monthly_amount || 0), 0);

                    const planCounts: Record<string, number> = {};
                    subs.forEach(s => {
                        const plan = s.plan || 'starter';
                        planCounts[plan] = (planCounts[plan] || 0) + 1;
                    });
                    const plan_distribution = Object.entries(planCounts).map(([plan, count]) => ({ plan, count }));

                    return {
                        ...product,
                        plans_count: plansRes.count || 0,
                        total_subscriptions: subs.length,
                        active_subscriptions: activeSubs.length,
                        mrr,
                        plan_distribution,
                    };
                })
            );

            setProducts(enriched);
        } catch (error) {
            console.error('Error loading products:', error);
            notifications.show({
                title: 'Erro',
                message: 'Não foi possível carregar os produtos',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        setPendingFiles({});
        form.reset();
        setModalOpen(true);
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setPendingFiles({});
        form.setValues({
            id: product.id,
            name: product.name,
            description: product.description || '',
            icon: product.icon,
            base_url: product.base_url,
            brand_color: product.brand_color || '#0087ff',
            landing_url: product.landing_url || '',
            banner_url: product.banner_url || '',
            favicon_url: product.favicon_url || '',
            logo_url: product.logo_url || '',
            logo_negative_url: product.logo_negative_url || '',
            commission_percent: (product as any).commission_percent ?? 10,
            is_active: product.is_active,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (values: typeof form.values) => {
        setSaving(true);
        try {
            const productId = editingProduct?.id || values.id.toLowerCase().replace(/\s+/g, '_');

            // Upload pending files
            const uploadedUrls: Record<string, string> = {};
            const uploadTasks: [string, string, File][] = [];

            if (pendingFiles.banner) uploadTasks.push(['banner_url', 'banner', pendingFiles.banner]);
            if (pendingFiles.favicon) uploadTasks.push(['favicon_url', 'favicon', pendingFiles.favicon]);
            if (pendingFiles.logo) uploadTasks.push(['logo_url', 'logo', pendingFiles.logo]);
            if (pendingFiles.logo_negative) uploadTasks.push(['logo_negative_url', 'logo-negativo', pendingFiles.logo_negative]);

            for (const [field, tipo, file] of uploadTasks) {
                try {
                    const result = await uploadEmpresaAsset(`product-${productId}`, tipo, file);
                    if (result.url) uploadedUrls[field] = result.url;
                } catch (err) {
                    console.warn(`Failed to upload ${tipo}:`, err);
                }
            }

            const payload = {
                name: values.name,
                description: values.description || null,
                icon: values.icon,
                base_url: values.base_url,
                brand_color: values.brand_color || '#0087ff',
                landing_url: values.landing_url || null,
                banner_url: uploadedUrls.banner_url || values.banner_url || null,
                favicon_url: uploadedUrls.favicon_url || values.favicon_url || null,
                logo_url: uploadedUrls.logo_url || values.logo_url || null,
                logo_negative_url: uploadedUrls.logo_negative_url || values.logo_negative_url || null,
                commission_percent: values.commission_percent,
                is_active: values.is_active,
            };

            if (editingProduct) {
                const { error } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', editingProduct.id);

                if (error) throw error;

                notifications.show({ title: 'Sucesso', message: 'Produto atualizado!', color: 'green' });
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert({ id: productId, ...payload });

                if (error) throw error;

                notifications.show({ title: 'Sucesso', message: 'Produto criado!', color: 'green' });
            }

            setModalOpen(false);
            setPendingFiles({});
            loadProducts();
        } catch (error: any) {
            console.error('Error saving product:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível salvar o produto',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (product: Product) => {
        if (!confirm(`Deseja realmente excluir "${product.name}"? Esta ação não pode ser desfeita.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', product.id);

            if (error) throw error;
            notifications.show({ title: 'Sucesso', message: 'Produto excluído!', color: 'green' });
            loadProducts();
        } catch (error: any) {
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível excluir o produto',
                color: 'red',
            });
        }
    };

    const toggleExpand = (productId: string) => {
        setExpandedProduct(expandedProduct === productId ? null : productId);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor),
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = products.findIndex(p => p.id === active.id);
        const newIndex = products.findIndex(p => p.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(products, oldIndex, newIndex);
        setProducts(reordered);

        // Save new order to DB
        try {
            await Promise.all(
                reordered.map((p, i) =>
                    supabase.from('products').update({ sort_order: i }).eq('id', p.id)
                )
            );
        } catch (err) {
            console.error('Reorder error:', err);
            notifications.show({ title: 'Erro', message: 'Falha ao salvar ordem', color: 'red' });
            loadProducts();
        }
    };

    const totalMRR = products.reduce((sum, p) => sum + (p.mrr || 0), 0);
    const totalActiveSubs = products.reduce((sum, p) => sum + (p.active_subscriptions || 0), 0);

    return (
        <Container size="xl" py="md">
            {/* Header */}
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2}>Produtos & Ferramentas</Title>
                    <Text c="dimmed">Gerencie produtos e acompanhe métricas de inteligência</Text>
                </div>
                <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
                    Novo Produto
                </Button>
            </Group>

            {/* Summary KPIs */}
            {!loading && (
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
                    <Card withBorder padding="md" radius="md">
                        <Group gap="xs">
                            <ThemeIcon size="md" radius="md" variant="light" color="blue">
                                <IconChartBar size={16} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed">Total Produtos</Text>
                        </Group>
                        <Text size="xl" fw={700} mt="xs">{products.length}</Text>
                    </Card>
                    <Card withBorder padding="md" radius="md">
                        <Group gap="xs">
                            <ThemeIcon size="md" radius="md" variant="light" color="green">
                                <IconCreditCard size={16} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed">Assinaturas Ativas</Text>
                        </Group>
                        <Text size="xl" fw={700} mt="xs">{totalActiveSubs}</Text>
                    </Card>
                    <Card withBorder padding="md" radius="md">
                        <Group gap="xs">
                            <ThemeIcon size="md" radius="md" variant="light" color="teal">
                                <IconTrendingUp size={16} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed">MRR Total</Text>
                        </Group>
                        <Text size="xl" fw={700} mt="xs" c="teal">{formatCurrency(totalMRR)}</Text>
                    </Card>
                    <Card withBorder padding="md" radius="md">
                        <Group gap="xs">
                            <ThemeIcon size="md" radius="md" variant="light" color="violet">
                                <IconUsers size={16} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed">Produtos Ativos</Text>
                        </Group>
                        <Text size="xl" fw={700} mt="xs">{products.filter(p => p.is_active).length}</Text>
                    </Card>
                </SimpleGrid>
            )}

            {/* Products table */}
            {loading ? (
                <Stack gap="sm">
                    {Array(5).fill(0).map((_, i) => <Skeleton key={i} height={50} radius="md" />)}
                </Stack>
            ) : (
                <Card shadow="sm" padding={0} radius="md" withBorder>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ width: 40 }}></Table.Th>
                                <Table.Th style={{ width: 40 }}></Table.Th>
                                <Table.Th>ID</Table.Th>
                                <Table.Th>Nome</Table.Th>
                                <Table.Th>Assinaturas</Table.Th>
                                <Table.Th>MRR</Table.Th>
                                <Table.Th>Planos</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Ações</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={products.map(p => p.id)} strategy={verticalListSortingStrategy}>
                                <Table.Tbody>
                                    {products.map((product) => (
                                        <SortableProductRow
                                            key={product.id}
                                            product={product}
                                            isExpanded={expandedProduct === product.id}
                                            onToggleExpand={() => toggleExpand(product.id)}
                                            onEdit={() => openEditModal(product)}
                                            onDelete={() => handleDelete(product)}
                                            onNavigatePlans={() => navigate(`/painel/admin/produtos/${product.id}/planos`)}
                                        />
                                    ))}
                                </Table.Tbody>
                            </SortableContext>
                        </DndContext>
                    </Table>
                </Card>
            )}

            {/* Modal de Criação/Edição */}
            <Modal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
                size="xl"
            >
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">
                        {!editingProduct && (
                            <TextInput
                                label="ID do Produto"
                                placeholder="ex: crm, vendas, suporte"
                                description="Identificador único (lowercase, sem espaços)"
                                required
                                {...form.getInputProps('id')}
                            />
                        )}

                        <TextInput
                            label="Nome"
                            placeholder="ex: Sincla CRM"
                            required
                            {...form.getInputProps('name')}
                        />

                        <Textarea
                            label="Descrição"
                            placeholder="Descreva o produto..."
                            rows={3}
                            {...form.getInputProps('description')}
                        />

                        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                            <IconPicker
                                value={form.values.icon}
                                onChange={(v) => form.setFieldValue('icon', v)}
                            />

                            <ColorInput
                                label="Cor da Marca"
                                description="Cor usada no grid e dashboard"
                                format="hex"
                                swatches={['#0087ff', '#ff8c00', '#00c853', '#6200ea', '#e91e63', '#00bcd4', '#ff5722', '#607d8b']}
                                {...form.getInputProps('brand_color')}
                            />
                        </SimpleGrid>

                        <TextInput
                            label="URL Base"
                            placeholder="https://produto.sincla.com.br"
                            required
                            {...form.getInputProps('base_url')}
                        />

                        <TextInput
                            label="URL da Página (Site)"
                            placeholder="https://sincla.com.br/produtos/rh"
                            description="Link para a página 'Saiba Mais' no site institucional"
                            {...form.getInputProps('landing_url')}
                        />

                        <NumberInput
                            label="Comissão de Parceiro (%)"
                            description="Percentual de comissão sobre assinaturas indicadas por parceiros"
                            placeholder="10"
                            min={0}
                            max={50}
                            step={0.5}
                            decimalScale={2}
                            suffix="%"
                            {...form.getInputProps('commission_percent')}
                        />

                        {/* Imagens do Produto */}
                        <Paper p="md" radius="md" withBorder>
                            <Text size="sm" fw={600} mb="md">Imagens do Produto</Text>
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                <ImageUpload
                                    label="Logo Padrão"
                                    description="Para fundos claros"
                                    aspectLabel="PNG transparente"
                                    value={form.values.logo_url || null}
                                    onChange={(url, file) => {
                                        form.setFieldValue('logo_url', url || '');
                                        if (file) setPendingFiles(p => ({ ...p, logo: file }));
                                    }}
                                />
                                <ImageUpload
                                    label="Logo Negativo"
                                    description="Para fundos escuros"
                                    aspectLabel="PNG transparente"
                                    value={form.values.logo_negative_url || null}
                                    onChange={(url, file) => {
                                        form.setFieldValue('logo_negative_url', url || '');
                                        if (file) setPendingFiles(p => ({ ...p, logo_negative: file }));
                                    }}
                                />
                                <ImageUpload
                                    label="Favicon"
                                    description="Ícone da aba do navegador"
                                    aspectLabel="200×200px"
                                    value={form.values.favicon_url || null}
                                    onChange={(url, file) => {
                                        form.setFieldValue('favicon_url', url || '');
                                        if (file) setPendingFiles(p => ({ ...p, favicon: file }));
                                    }}
                                />
                                <ImageUpload
                                    label="Banner"
                                    description="Imagem promocional"
                                    aspectLabel="400×600px"
                                    value={form.values.banner_url || null}
                                    onChange={(url, file) => {
                                        form.setFieldValue('banner_url', url || '');
                                        if (file) setPendingFiles(p => ({ ...p, banner: file }));
                                    }}
                                />
                            </SimpleGrid>
                        </Paper>

                        <Switch
                            label="Produto ativo"
                            {...form.getInputProps('is_active', { type: 'checkbox' })}
                        />

                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={() => setModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" loading={saving}>
                                {editingProduct ? 'Salvar' : 'Criar'}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container >
    );
}
