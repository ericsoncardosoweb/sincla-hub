/**
 * ConsumptionDashboard — Painel de Consumo de Serviços
 * 
 * Exibe consumo de IA, Storage e Notificações da empresa.
 * Integrado na página de Assinaturas do Hub.
 */

import { useEffect, useState } from 'react';
import {
    Card, Text, Group, Stack, SimpleGrid, Progress, Badge,
    ThemeIcon, Skeleton, Button, Modal, Slider, Divider,
    Table, SegmentedControl, Alert,
} from '@mantine/core';
import {
    IconBrain, IconCloud, IconMail, IconBrandWhatsapp,
    IconBell, IconShoppingCart, IconSparkles, IconRefresh,
    IconTrendingUp, IconAlertCircle, IconHistory, IconPlus,
} from '@tabler/icons-react';
import { supabase } from '../../../shared/lib/supabase';

// ==============================
// Types
// ==============================

interface CompanyCredits {
    service_type: string;
    balance: number;
    monthly_allowance: number;
    monthly_bonus: number;
    period_usage: number;
    next_reset_at: string | null;
}

interface StorageQuota {
    storage_bytes: number;
    storage_quota_bytes: number;
    storage_files_count: number;
    stream_bytes: number;
    stream_quota_bytes: number;
    stream_files_count: number;
    storage_by_tool: Record<string, number>;
    stream_by_tool: Record<string, number>;
}

interface UsageLog {
    id: string;
    service_type: string;
    sub_type: string;
    tool_id: string;
    quantity: number;
    total_resale_brl: number;
    created_at: string;
}

interface ServicePricing {
    service_type: string;
    name: string;
    unit_amount: number;
    unit_label: string;
    price_brl: number;
    volume_discount_percent: number;
    volume_discount_threshold: number;
    max_discount_percent: number;
}

// ==============================
// Helpers
// ==============================

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatNumber = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
        n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toString();

const formatBytes = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
};

const serviceLabels: Record<string, { label: string; icon: typeof IconBrain; color: string }> = {
    ai: { label: 'Créditos de IA', icon: IconBrain, color: 'violet' },
    notification_email: { label: 'Emails', icon: IconMail, color: 'blue' },
    notification_whatsapp: { label: 'WhatsApp', icon: IconBrandWhatsapp, color: 'green' },
    notification_push: { label: 'Push', icon: IconBell, color: 'orange' },
};

const toolLabels: Record<string, string> = {
    hub: 'Hub', rh: 'RH', ead: 'EAD', agenda: 'Agenda', crm: 'CRM',
};

// ==============================
// Component
// ==============================

interface ConsumptionDashboardProps {
    companyId: string;
}

export function ConsumptionDashboard({ companyId }: ConsumptionDashboardProps) {
    const [credits, setCredits] = useState<CompanyCredits[]>([]);
    const [storage, setStorage] = useState<StorageQuota | null>(null);
    const [recentUsage, setRecentUsage] = useState<UsageLog[]>([]);
    const [pricing, setPricing] = useState<ServicePricing[]>([]);
    const [loading, setLoading] = useState(true);

    // Buy credits modal
    const [buyModalOpen, setBuyModalOpen] = useState(false);
    const [buyService, setBuyService] = useState<ServicePricing | null>(null);
    const [buyQuantity, setBuyQuantity] = useState(1);
    const [buyType, setBuyType] = useState<'one_time' | 'recurring'>('one_time');

    // History filter
    const [historyFilter, setHistoryFilter] = useState('all');

    useEffect(() => {
        if (companyId) loadAll();
    }, [companyId]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [creditsRes, storageRes, usageRes, pricingRes] = await Promise.all([
                supabase.from('company_credits').select('*').eq('company_id', companyId),
                supabase.from('storage_quotas').select('*').eq('company_id', companyId).single(),
                supabase.from('service_usage_log')
                    .select('id, service_type, sub_type, tool_id, quantity, total_resale_brl, created_at')
                    .eq('company_id', companyId)
                    .order('created_at', { ascending: false })
                    .limit(20),
                supabase.from('service_pricing').select('*').eq('is_active', true).order('sort_order'),
            ]);

            setCredits(creditsRes.data || []);
            setStorage(storageRes.data);
            setRecentUsage(usageRes.data || []);
            setPricing(pricingRes.data || []);
        } catch (err) {
            console.error('[Consumption] Error loading:', err);
        } finally {
            setLoading(false);
        }
    };

    const getCredit = (type: string) => credits.find(c => c.service_type === type);

    const handleOpenBuy = (servicePricing: ServicePricing) => {
        setBuyService(servicePricing);
        setBuyQuantity(1);
        setBuyType('one_time');
        setBuyModalOpen(true);
    };

    const calculatePrice = () => {
        if (!buyService) return 0;
        const base = buyService.price_brl * buyQuantity;
        const discountSteps = Math.floor(buyQuantity / buyService.volume_discount_threshold);
        const discountPercent = Math.min(
            discountSteps * buyService.volume_discount_percent,
            buyService.max_discount_percent
        );
        return base * (1 - discountPercent / 100);
    };

    const getDiscountPercent = () => {
        if (!buyService) return 0;
        const discountSteps = Math.floor(buyQuantity / buyService.volume_discount_threshold);
        return Math.min(
            discountSteps * buyService.volume_discount_percent,
            buyService.max_discount_percent
        );
    };

    // ── Loading ──
    if (loading) {
        return (
            <Stack gap="md">
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                    {[1, 2, 3].map(i => <Skeleton key={i} height={160} radius="md" />)}
                </SimpleGrid>
            </Stack>
        );
    }

    // Se não tem créditos configurados, mostrar mensagem
    if (credits.length === 0 && !storage) {
        return (
            <Alert variant="light" color="blue" icon={<IconSparkles size={18} />}>
                Nenhum serviço de consumo configurado. Os créditos serão habilitados quando sua assinatura incluir serviços de IA, Storage ou Notificações.
            </Alert>
        );
    }

    const aiCredits = getCredit('ai');
    const emailCredits = getCredit('notification_email');
    const whatsappCredits = getCredit('notification_whatsapp');

    const filteredUsage = historyFilter === 'all'
        ? recentUsage
        : recentUsage.filter(u => u.service_type === historyFilter);

    return (
        <Stack gap="lg">
            {/* ═══ Seção: Créditos de IA ═══ */}
            {aiCredits && (
                <Card withBorder radius="md" padding="lg">
                    <Group justify="space-between" mb="md">
                        <Group gap="sm">
                            <ThemeIcon size="lg" radius="md" variant="light" color="violet">
                                <IconBrain size={20} />
                            </ThemeIcon>
                            <div>
                                <Text fw={600}>Créditos de Inteligência Artificial</Text>
                                <Text size="xs" c="dimmed">
                                    Alimenta IA em todas as ferramentas (RH, EAD, Agenda)
                                </Text>
                            </div>
                        </Group>
                        <Button
                            variant="light"
                            color="violet"
                            leftSection={<IconShoppingCart size={16} />}
                            size="sm"
                            onClick={() => {
                                const p = pricing.find(p => p.service_type === 'ai');
                                if (p) handleOpenBuy(p);
                            }}
                        >
                            Comprar Créditos
                        </Button>
                    </Group>

                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                        <div>
                            <Text size="xs" c="dimmed">Saldo Disponível</Text>
                            <Text size="xl" fw={700} c="violet">{formatNumber(aiCredits.balance)} tokens</Text>
                            <Text size="xs" c="dimmed">
                                Incluso no plano: {formatNumber(aiCredits.monthly_allowance)}
                                {aiCredits.monthly_bonus > 0 && ` + ${formatNumber(aiCredits.monthly_bonus)} recorrente`}
                            </Text>
                        </div>
                        <div>
                            <Text size="xs" c="dimmed">Consumido este mês</Text>
                            <Text size="xl" fw={700}>{formatNumber(aiCredits.period_usage)} tokens</Text>
                            <Progress
                                value={aiCredits.monthly_allowance > 0 ? (aiCredits.period_usage / (aiCredits.monthly_allowance + aiCredits.monthly_bonus)) * 100 : 0}
                                color="violet"
                                size="sm"
                                mt={4}
                            />
                        </div>
                        <div>
                            <Text size="xs" c="dimmed">Próximo Reset</Text>
                            <Text size="lg" fw={600}>
                                {aiCredits.next_reset_at
                                    ? new Date(aiCredits.next_reset_at).toLocaleDateString('pt-BR')
                                    : '—'}
                            </Text>
                        </div>
                    </SimpleGrid>

                    {aiCredits.balance <= 0 && (
                        <Alert variant="light" color="red" icon={<IconAlertCircle size={16} />} mt="sm">
                            Créditos esgotados! Recursos de IA estão desabilitados. Compre mais créditos para reativar.
                        </Alert>
                    )}
                </Card>
            )}

            {/* ═══ Seção: Storage ═══ */}
            {storage && (
                <Card withBorder radius="md" padding="lg">
                    <Group justify="space-between" mb="md">
                        <Group gap="sm">
                            <ThemeIcon size="lg" radius="md" variant="light" color="teal">
                                <IconCloud size={20} />
                            </ThemeIcon>
                            <div>
                                <Text fw={600}>Armazenamento</Text>
                                <Text size="xs" c="dimmed">CDN (arquivos, imagens) + Stream (vídeos)</Text>
                            </div>
                        </Group>
                        <Button
                            variant="light"
                            color="teal"
                            leftSection={<IconPlus size={16} />}
                            size="sm"
                            onClick={() => {
                                const p = pricing.find(p => p.service_type === 'storage');
                                if (p) handleOpenBuy(p);
                            }}
                        >
                            Comprar Storage
                        </Button>
                    </Group>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        {/* CDN Storage */}
                        <Card withBorder radius="md" padding="md" bg="var(--mantine-color-gray-0)">
                            <Group justify="space-between" mb="xs">
                                <Text size="sm" fw={600}>📁 Arquivos (CDN)</Text>
                                <Badge variant="light" size="sm">
                                    {storage.storage_files_count} arquivos
                                </Badge>
                            </Group>
                            <Group gap="xs" align="baseline">
                                <Text size="lg" fw={700}>{formatBytes(storage.storage_bytes)}</Text>
                                <Text size="xs" c="dimmed">/ {formatBytes(storage.storage_quota_bytes)}</Text>
                            </Group>
                            <Progress
                                value={storage.storage_quota_bytes > 0
                                    ? (storage.storage_bytes / storage.storage_quota_bytes) * 100 : 0}
                                color={storage.storage_bytes > storage.storage_quota_bytes * 0.9 ? 'red' : 'teal'}
                                size="sm"
                                mt={4}
                            />
                            {/* Breakdown por tool */}
                            {Object.keys(storage.storage_by_tool || {}).length > 0 && (
                                <Group gap="xs" mt="xs">
                                    {Object.entries(storage.storage_by_tool).map(([tool, bytes]) => (
                                        <Badge key={tool} variant="dot" size="xs">
                                            {toolLabels[tool] || tool}: {formatBytes(bytes as number)}
                                        </Badge>
                                    ))}
                                </Group>
                            )}
                        </Card>

                        {/* Stream Storage */}
                        <Card withBorder radius="md" padding="md" bg="var(--mantine-color-gray-0)">
                            <Group justify="space-between" mb="xs">
                                <Text size="sm" fw={600}>🎬 Vídeos (Stream)</Text>
                                <Badge variant="light" size="sm">
                                    {storage.stream_files_count} vídeos
                                </Badge>
                            </Group>
                            <Group gap="xs" align="baseline">
                                <Text size="lg" fw={700}>{formatBytes(storage.stream_bytes)}</Text>
                                <Text size="xs" c="dimmed">/ {formatBytes(storage.stream_quota_bytes)}</Text>
                            </Group>
                            <Progress
                                value={storage.stream_quota_bytes > 0
                                    ? (storage.stream_bytes / storage.stream_quota_bytes) * 100 : 0}
                                color={storage.stream_bytes > storage.stream_quota_bytes * 0.9 ? 'red' : 'blue'}
                                size="sm"
                                mt={4}
                            />
                            {Object.keys(storage.stream_by_tool || {}).length > 0 && (
                                <Group gap="xs" mt="xs">
                                    {Object.entries(storage.stream_by_tool).map(([tool, bytes]) => (
                                        <Badge key={tool} variant="dot" size="xs">
                                            {toolLabels[tool] || tool}: {formatBytes(bytes as number)}
                                        </Badge>
                                    ))}
                                </Group>
                            )}
                        </Card>
                    </SimpleGrid>
                </Card>
            )}

            {/* ═══ Seção: Notificações ═══ */}
            {(emailCredits || whatsappCredits) && (
                <Card withBorder radius="md" padding="lg">
                    <Group gap="sm" mb="md">
                        <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                            <IconBell size={20} />
                        </ThemeIcon>
                        <div>
                            <Text fw={600}>Notificações</Text>
                            <Text size="xs" c="dimmed">Envios de Email e WhatsApp</Text>
                        </div>
                    </Group>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        {emailCredits && (
                            <Card withBorder radius="md" padding="md" bg="var(--mantine-color-gray-0)">
                                <Group gap="sm" mb="xs">
                                    <IconMail size={16} color="var(--mantine-color-blue-6)" />
                                    <Text size="sm" fw={600}>Emails</Text>
                                </Group>
                                <Group gap="xs" align="baseline">
                                    <Text size="lg" fw={700}>{formatNumber(emailCredits.balance)}</Text>
                                    <Text size="xs" c="dimmed">restantes</Text>
                                </Group>
                                <Text size="xs" c="dimmed">
                                    Consumidos: {formatNumber(emailCredits.period_usage)} este mês
                                </Text>
                                <Progress
                                    value={emailCredits.monthly_allowance > 0 ? (emailCredits.period_usage / emailCredits.monthly_allowance) * 100 : 0}
                                    color="blue"
                                    size="xs"
                                    mt={4}
                                />
                            </Card>
                        )}

                        {whatsappCredits && (
                            <Card withBorder radius="md" padding="md" bg="var(--mantine-color-gray-0)">
                                <Group gap="sm" mb="xs">
                                    <IconBrandWhatsapp size={16} color="var(--mantine-color-green-6)" />
                                    <Text size="sm" fw={600}>WhatsApp</Text>
                                </Group>
                                <Group gap="xs" align="baseline">
                                    <Text size="lg" fw={700}>{formatNumber(whatsappCredits.balance)}</Text>
                                    <Text size="xs" c="dimmed">restantes</Text>
                                </Group>
                                <Text size="xs" c="dimmed">
                                    Consumidos: {formatNumber(whatsappCredits.period_usage)} este mês
                                </Text>
                                <Progress
                                    value={whatsappCredits.monthly_allowance > 0 ? (whatsappCredits.period_usage / whatsappCredits.monthly_allowance) * 100 : 0}
                                    color="green"
                                    size="xs"
                                    mt={4}
                                />
                            </Card>
                        )}
                    </SimpleGrid>
                </Card>
            )}

            {/* ═══ Seção: Histórico ═══ */}
            {recentUsage.length > 0 && (
                <Card withBorder radius="md" padding="lg">
                    <Group justify="space-between" mb="md">
                        <Group gap="sm">
                            <ThemeIcon size="lg" radius="md" variant="light" color="gray">
                                <IconHistory size={20} />
                            </ThemeIcon>
                            <Text fw={600}>Histórico de Consumo</Text>
                        </Group>
                        <SegmentedControl
                            size="xs"
                            value={historyFilter}
                            onChange={setHistoryFilter}
                            data={[
                                { label: 'Todos', value: 'all' },
                                { label: '🧠 IA', value: 'ai' },
                                { label: '📁 Storage', value: 'storage' },
                                { label: '📧 Email', value: 'notification_email' },
                                { label: '💬 WhatsApp', value: 'notification_whatsapp' },
                            ]}
                        />
                    </Group>

                    <Table striped highlightOnHover withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Serviço</Table.Th>
                                <Table.Th>Ferramenta</Table.Th>
                                <Table.Th ta="right">Quantidade</Table.Th>
                                <Table.Th ta="right">Valor</Table.Th>
                                <Table.Th ta="right">Data</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredUsage.map(log => {
                                const meta = serviceLabels[log.service_type];
                                const IconComp = meta?.icon || IconTrendingUp;
                                return (
                                    <Table.Tr key={log.id}>
                                        <Table.Td>
                                            <Group gap="xs">
                                                <IconComp size={14} color={`var(--mantine-color-${meta?.color || 'gray'}-6)`} />
                                                <Text size="sm">{meta?.label || log.service_type}</Text>
                                                {log.sub_type && (
                                                    <Badge variant="dot" size="xs">{log.sub_type}</Badge>
                                                )}
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge variant="light" size="xs">
                                                {toolLabels[log.tool_id] || log.tool_id}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td ta="right">
                                            <Text size="sm">{formatNumber(log.quantity)}</Text>
                                        </Table.Td>
                                        <Table.Td ta="right">
                                            <Text size="sm" fw={500}>
                                                {log.total_resale_brl > 0 ? formatCurrency(log.total_resale_brl) : '—'}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td ta="right">
                                            <Text size="xs" c="dimmed">
                                                {new Date(log.created_at).toLocaleString('pt-BR', {
                                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                </Card>
            )}

            {/* ═══ Modal: Comprar Créditos ═══ */}
            <Modal
                opened={buyModalOpen}
                onClose={() => setBuyModalOpen(false)}
                title={
                    <Group gap="xs">
                        <IconShoppingCart size={20} />
                        <Text fw={600}>Comprar {buyService?.name}</Text>
                    </Group>
                }
                centered
                size="md"
            >
                {buyService && (
                    <Stack gap="md">
                        <Alert variant="light" color="violet" icon={<IconSparkles size={16} />}>
                            <Text size="sm" fw={500}>
                                Mais recursos = mais inteligência para seu negócio.
                            </Text>
                            <Text size="xs" c="dimmed">
                                Compre avulso ou adicione como crédito recorrente na sua assinatura.
                            </Text>
                        </Alert>

                        <div>
                            <Text size="sm" fw={500} mb="xs">Quantidade</Text>
                            <Text size="xl" fw={700} ta="center" c="violet">
                                {buyQuantity}x {buyService.unit_label}
                            </Text>
                            <Slider
                                value={buyQuantity}
                                onChange={setBuyQuantity}
                                min={1}
                                max={100}
                                step={1}
                                marks={[
                                    { value: 1, label: '1' },
                                    { value: 10, label: '10' },
                                    { value: 30, label: '30' },
                                    { value: 50, label: '50' },
                                    { value: 100, label: '100' },
                                ]}
                                color="violet"
                                mt="sm"
                            />
                        </div>

                        <Card withBorder radius="md" padding="md">
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text size="sm" c="dimmed">
                                        Preço base ({buyQuantity}x {buyService.unit_label} × {formatCurrency(buyService.price_brl)})
                                    </Text>
                                    <Text size="sm">{formatCurrency(buyService.price_brl * buyQuantity)}</Text>
                                </Group>

                                {getDiscountPercent() > 0 && (
                                    <Group justify="space-between">
                                        <Badge variant="light" color="green" size="sm">
                                            -{getDiscountPercent()}% Desconto volume
                                        </Badge>
                                        <Text size="sm" c="green" fw={500}>
                                            -{formatCurrency(buyService.price_brl * buyQuantity - calculatePrice())}
                                        </Text>
                                    </Group>
                                )}

                                <Divider />

                                <Group justify="space-between">
                                    <Text fw={700}>Total</Text>
                                    <Text size="lg" fw={700} c="violet">{formatCurrency(calculatePrice())}</Text>
                                </Group>

                                <Text size="xs" c="dimmed" ta="center">
                                    {formatCurrency(calculatePrice() / buyQuantity)}/{buyService.unit_label}
                                </Text>
                            </Stack>
                        </Card>

                        <Button
                            fullWidth
                            size="md"
                            color="violet"
                            leftSection={<IconShoppingCart size={18} />}
                            onClick={() => {
                                // TODO: Integrar com gateway de pagamento
                                console.log('Comprar:', { service: buyService, quantity: buyQuantity, type: buyType, price: calculatePrice() });
                                setBuyModalOpen(false);
                            }}
                        >
                            Comprar {buyQuantity}x {buyService.unit_label} por {formatCurrency(calculatePrice())}
                        </Button>

                        <Button
                            fullWidth
                            variant="subtle"
                            color="violet"
                            leftSection={<IconRefresh size={16} />}
                            onClick={() => {
                                setBuyType('recurring');
                                // TODO: Adicionar à assinatura
                                console.log('Adicionar recorrente:', { service: buyService, quantity: buyQuantity, price: calculatePrice() });
                                setBuyModalOpen(false);
                            }}
                        >
                            Ou adicionar +{formatCurrency(calculatePrice())}/mês na assinatura
                        </Button>

                        <Text size="xs" c="dimmed" ta="center">
                            O botão principal compra créditos avulsos (expiram em 30 dias).
                            A opção mensal adiciona recarga automática à sua assinatura.
                        </Text>
                    </Stack>
                )}
            </Modal>
        </Stack>
    );
}
