/**
 * ConsumptionDashboard — Painel de recursos (IA, storage, notificações).
 * Com billing desligado, mostra uso sem CTAs de compra.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card, Text, Group, Stack, SimpleGrid, Progress, Badge,
    ThemeIcon, Skeleton, Button, Modal, Slider, Divider,
    Table, SegmentedControl, Alert, Box, Paper,
    Tabs, Switch, Select, Loader,
} from '@mantine/core';
import { notifications as mantineNotifications } from '@mantine/notifications';
import {
    IconBrain, IconCloud, IconMail, IconBrandWhatsapp,
    IconBell, IconShoppingCart, IconSparkles, IconRefresh,
    IconTrendingUp, IconAlertCircle, IconHistory, IconPlus,
    IconCoin, IconDatabase, IconVideo, IconFile,
} from '@tabler/icons-react';
import { supabase } from '../../../shared/lib/supabase';
import { getCompanyEmailSettings, type CompanyEmailSettings } from '../../../shared/services/emailSettingsService';

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
    auto_expand: boolean;
    auto_expand_cap_bytes: number;
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

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtNum = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
        n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toString();

const fmtBytes = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
};

const toolLabels: Record<string, string> = { hub: 'Hub', rh: 'RH', ead: 'EAD', agenda: 'Agenda', crm: 'CRM' };

const serviceConfig: Record<string, { label: string; icon: typeof IconBrain; color: string; gradient: string }> = {
    ai: { label: 'IA', icon: IconBrain, color: 'violet', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    notification_email: { label: 'Emails', icon: IconMail, color: 'blue', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    notification_whatsapp: { label: 'WhatsApp', icon: IconBrandWhatsapp, color: 'green', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    notification_push: { label: 'Push', icon: IconBell, color: 'orange', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
};

// Token slider marks (escala em milhões)
const TOKEN_MARKS = [
    { value: 5, label: '5M' },
    { value: 10, label: '10M' },
    { value: 30, label: '30M' },
    { value: 50, label: '50M' },
    { value: 100, label: '100M' },
];

const progressColor = (pct: number) =>
    pct >= 90 ? 'red' : pct >= 70 ? 'orange' : pct >= 40 ? 'yellow' : 'green';

// ==============================
// Component
// ==============================

interface Props {
    companyId: string;
    billingEnabled?: boolean;
}

export function ConsumptionDashboard({ companyId, billingEnabled = false }: Props) {
    const navigate = useNavigate();
    const [credits, setCredits] = useState<CompanyCredits[]>([]);
    const [storage, setStorage] = useState<StorageQuota | null>(null);
    const [recentUsage, setRecentUsage] = useState<UsageLog[]>([]);
    const [pricing, setPricing] = useState<ServicePricing[]>([]);
    const [loading, setLoading] = useState(true);
    const [emailSettings, setEmailSettings] = useState<CompanyEmailSettings | null>(null);

    // Modais
    const [buyModalOpen, setBuyModalOpen] = useState(false);
    const [buyService, setBuyService] = useState<ServicePricing | null>(null);
    const [buyTokensM, setBuyTokensM] = useState(5); // Em milhões
    const [buyQuantity, setBuyQuantity] = useState(1); // Para não-IA

    const [storageModalOpen, setStorageModalOpen] = useState(false);
    const [storagePackGb, setStoragePackGb] = useState(10);
    const [storageType, setStorageType] = useState<'storage' | 'stream'>('storage');

    // Auto-expansão
    const [autoExpandSaving, setAutoExpandSaving] = useState(false);

    const saveAutoExpand = async (enabled: boolean, capGb: number) => {
        if (!storage) return;
        setAutoExpandSaving(true);
        const prev = { auto_expand: storage.auto_expand, auto_expand_cap_bytes: storage.auto_expand_cap_bytes };
        setStorage({ ...storage, auto_expand: enabled, auto_expand_cap_bytes: capGb * 1073741824 });
        try {
            const { error } = await supabase.rpc('set_storage_auto_expand', {
                p_company_id: companyId, p_enabled: enabled, p_cap_gb: capGb,
            });
            if (error) throw error;
            mantineNotifications.show({
                color: 'teal',
                title: enabled ? 'Auto-expansão ativada' : 'Auto-expansão desativada',
                message: enabled
                    ? `Ao esgotar, ampliamos automaticamente até +${capGb} GB/mês e cobramos no cartão da assinatura.`
                    : 'Os uploads que excederem a cota voltarão a ser bloqueados.',
            });
        } catch (err: any) {
            setStorage({ ...storage, ...prev });
            mantineNotifications.show({ color: 'red', title: 'Não foi possível salvar', message: err?.message || 'Tente novamente.' });
        } finally {
            setAutoExpandSaving(false);
        }
    };

    // Histórico
    const [historyFilter, setHistoryFilter] = useState('all');

    useEffect(() => {
        if (companyId) loadAll();
    }, [companyId]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [creditsRes, storageRes, usageRes, pricingRes, emailRes] = await Promise.all([
                supabase.from('company_credits').select('*').eq('company_id', companyId),
                supabase.from('storage_quotas').select('*').eq('company_id', companyId).single(),
                supabase.from('service_usage_log')
                    .select('id, service_type, sub_type, tool_id, quantity, total_resale_brl, created_at')
                    .eq('company_id', companyId)
                    .order('created_at', { ascending: false }).limit(20),
                supabase.from('service_pricing').select('*').eq('is_active', true).order('sort_order'),
                getCompanyEmailSettings(companyId),
            ]);
            setCredits(creditsRes.data || []);
            setStorage(storageRes.data);
            setRecentUsage(usageRes.data || []);
            setPricing(pricingRes.data || []);
            setEmailSettings(emailRes);
        } catch (err) {
            console.error('[Consumption] Error:', err);
        } finally { setLoading(false); }
    };

    const getCredit = (type: string) => credits.find(c => c.service_type === type);

    const handleOpenBuyAI = () => {
        const p = pricing.find(p => p.service_type === 'ai');
        if (p) {
            setBuyService(p);
            setBuyTokensM(5);
            setBuyModalOpen(true);
        }
    };

    const handleOpenBuy = (svcType: string) => {
        if (svcType === 'ai') { handleOpenBuyAI(); return; }
        const p = pricing.find(p => p.service_type === svcType);
        if (p) { setBuyService(p); setBuyQuantity(1); setBuyModalOpen(true); }
    };

    // Cálculo de preço para IA (escala em milhões)
    const calcAIPrice = () => {
        if (!buyService) return 0;
        // price_brl é por unit_amount (1M tokens), buyTokensM é em M
        return buyService.price_brl * buyTokensM;
    };

    const calcPrice = () => {
        if (!buyService) return 0;
        if (buyService.service_type === 'ai') return calcAIPrice();
        const base = buyService.price_brl * buyQuantity;
        const steps = Math.floor(buyQuantity / buyService.volume_discount_threshold);
        const disc = Math.min(steps * buyService.volume_discount_percent, buyService.max_discount_percent);
        return base * (1 - disc / 100);
    };

    const isAIBuy = buyService?.service_type === 'ai';

    // ── Loading ──
    if (loading) {
        return (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {[1, 2, 3].map(i => <Skeleton key={i} height={180} radius="md" />)}
            </SimpleGrid>
        );
    }

    if (credits.length === 0 && !storage) {
        return (
            <Card withBorder radius="md" p="xl" style={{ textAlign: 'center' }}>
                <ThemeIcon size={60} radius="xl" variant="light" color="violet" mx="auto"><IconSparkles size={30} /></ThemeIcon>
                <Text fw={600} size="lg" mt="md">Recursos ainda não configurados</Text>
                <Text c="dimmed" size="sm" mt="xs">
                    Quando IA ou armazenamento forem habilitados para sua empresa, o uso aparecerá aqui.
                </Text>
            </Card>
        );
    }

    const aiCredits = getCredit('ai');
    const emailCredits = getCredit('notification_email');
    const whatsappCredits = getCredit('notification_whatsapp');
    const emailStatusLabel = emailSettings?.smtp_verified
        ? 'SMTP da empresa verificado'
        : emailSettings?.custom_smtp_host
            ? 'SMTP configurado — aguardando teste'
            : 'Envio pelo sistema Sincla (MailGrid)';
    const emailStatusColor = emailSettings?.smtp_verified ? 'green' : emailSettings?.custom_smtp_host ? 'orange' : 'blue';
    const filteredUsage = historyFilter === 'all'
        ? recentUsage
        : recentUsage.filter(u => u.service_type === historyFilter);

    const usagePercent = (used: number, total: number) => total > 0 ? Math.min((used / total) * 100, 100) : 0;
    const bytesPercent = (used: number, quota: number) => quota > 0 ? Math.min((used / quota) * 100, 100) : 0;

    // Total de tokens disponíveis
    const aiTotal = aiCredits ? (aiCredits.monthly_allowance + aiCredits.monthly_bonus) : 0;
    const aiUsedPct = aiCredits ? usagePercent(aiCredits.period_usage, aiTotal) : 0;

    return (
        <Stack gap="lg">
            {/* ═══ Seção: Créditos de Inteligência Artificial ═══ */}
            <Group gap="xs" mb={-4}>
                <ThemeIcon size="md" radius="md" variant="light" color="violet">
                    <IconBrain size={16} />
                </ThemeIcon>
                <Text fw={700} size="md">{billingEnabled ? 'Créditos de Inteligência Artificial' : 'Uso de Inteligência Artificial'}</Text>
            </Group>

            <Card withBorder radius="lg" padding={0} style={{ overflow: 'hidden' }}>
                <Box style={{ background: serviceConfig.ai.gradient, padding: '18px 24px' }}>
                    <Group justify="space-between" align="center">
                        <Group gap="sm">
                            <IconBrain size={24} color="#fff" />
                            <div>
                                <Text size="xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Saldo Disponível</Text>
                                <Text fw={800} size="28px" c="white" style={{ lineHeight: 1.1 }}>
                                    {fmtNum(aiCredits?.balance ?? 0)} tokens
                                </Text>
                                <Text size="xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                    Incluso no plano: {fmtNum(aiCredits?.monthly_allowance ?? 0)}/mês
                                </Text>
                            </div>
                        </Group>
                        {billingEnabled && (
                            <Button variant="white" size="sm" leftSection={<IconShoppingCart size={16} />}
                                onClick={handleOpenBuyAI}
                                style={{ fontWeight: 600 }}>
                                Comprar Créditos
                            </Button>
                        )}
                    </Group>
                </Box>
                <Box p="md">
                    <Group justify="space-between" mb={6}>
                        <Text size="xs" c="dimmed">Consumido este período</Text>
                        <Text size="xs" fw={500}>{fmtNum(aiCredits?.period_usage ?? 0)} / {fmtNum(aiTotal)} tokens</Text>
                    </Group>
                    <Progress
                        value={aiUsedPct}
                        color={progressColor(aiUsedPct)}
                        size="lg" radius="xl"
                        style={{ transition: 'all 0.3s ease' }}
                    />
                    <Group justify="space-between" mt="sm">
                        <Text size="xs" c="dimmed">
                            Renova em: {aiCredits?.next_reset_at ? new Date(aiCredits.next_reset_at).toLocaleDateString('pt-BR') : '—'}
                        </Text>
                        {(aiCredits?.monthly_bonus ?? 0) > 0 && (
                            <Badge variant="light" color="violet" size="xs">
                                +{fmtNum(aiCredits!.monthly_bonus)} bônus mensal
                            </Badge>
                        )}
                    </Group>
                    {(aiCredits?.balance ?? 0) <= 0 && (
                        <Alert variant="light" color="red" icon={<IconAlertCircle size={14} />} mt="xs" p="xs">
                            <Text size="xs">Créditos esgotados — recursos de IA desabilitados</Text>
                        </Alert>
                    )}
                </Box>
                <Box px="md" pb="md">
                    <Alert variant="light" color="violet" icon={<IconSparkles size={16} />} p="sm" radius="md"
                        style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }}>
                        <Text size="xs" c="dark">
                            {billingEnabled ? (
                                <>
                                    <strong>Potencialize seu negócio com IA</strong> — Os créditos alimentam classificação de dados,
                                    atendimento automatizado, análise de conteúdo e geração de textos nas ferramentas Sincla.
                                </>
                            ) : (
                                <>
                                    <strong>IA integrada ao Sincla</strong> — Resumos, classificação e geração de texto
                                    nas ferramentas usam o motor central de IA. O uso do período aparece acima.
                                </>
                            )}
                        </Text>
                    </Alert>
                </Box>
            </Card>

            {!billingEnabled && (
                <Alert variant="light" color={emailStatusColor} icon={<IconMail size={18} />} radius="md">
                    <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                        <div>
                            <Text size="sm" fw={600}>E-mails da empresa</Text>
                            <Text size="xs" c="dimmed" mt={4}>
                                {emailStatusLabel}. Notificações das ferramentas usam este canal — não há compra de créditos de e-mail.
                            </Text>
                            {emailSettings?.custom_smtp_from && (
                                <Badge variant="dot" size="sm" color={emailStatusColor} mt={8}>
                                    Remetente: {emailSettings.custom_smtp_from_name || emailSettings.custom_smtp_from}
                                </Badge>
                            )}
                        </div>
                        <Button variant="light" size="xs" leftSection={<IconMail size={14} />}
                            onClick={() => navigate('/painel/configuracoes?aba=notificacoes')}>
                            Configurar notificações
                        </Button>
                    </Group>
                </Alert>
            )}

            {billingEnabled && (emailCredits || whatsappCredits) && (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {emailCredits && (
                        <Card withBorder radius="md" padding={0} style={{ overflow: 'hidden' }}>
                            <Box style={{ background: serviceConfig.notification_email.gradient, padding: '14px 16px' }}>
                                <Group justify="space-between">
                                    <Group gap="xs">
                                        <IconMail size={20} color="#fff" />
                                        <Text fw={700} c="white" size="sm">Emails</Text>
                                    </Group>
                                    <Badge variant="white" size="xs" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                                        {fmtNum(emailCredits.balance)} restantes
                                    </Badge>
                                </Group>
                            </Box>
                            <Box p="md">
                                <Group justify="space-between" mb={6}>
                                    <Text size="xs" c="dimmed">Enviados este mês</Text>
                                    <Text size="xs" fw={500}>{fmtNum(emailCredits.period_usage)}</Text>
                                </Group>
                                <Progress value={usagePercent(emailCredits.period_usage, emailCredits.monthly_allowance)} color="blue" size="md" radius="xl" />
                                <Group justify="flex-end" mt="sm">
                                    <Button variant="light" size="xs" color="blue" leftSection={<IconPlus size={14} />}
                                        onClick={() => handleOpenBuy('notification_email')}>
                                        Comprar
                                    </Button>
                                </Group>
                            </Box>
                        </Card>
                    )}

                    {whatsappCredits && (
                        <Card withBorder radius="md" padding={0} style={{ overflow: 'hidden' }}>
                            <Box style={{ background: serviceConfig.notification_whatsapp.gradient, padding: '14px 16px' }}>
                                <Group justify="space-between">
                                    <Group gap="xs">
                                        <IconBrandWhatsapp size={20} color="#fff" />
                                        <Text fw={700} c="white" size="sm">WhatsApp</Text>
                                    </Group>
                                    <Badge variant="white" size="xs" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                                        {fmtNum(whatsappCredits.balance)} restantes
                                    </Badge>
                                </Group>
                            </Box>
                            <Box p="md">
                                <Group justify="space-between" mb={6}>
                                    <Text size="xs" c="dimmed">Enviados este mês</Text>
                                    <Text size="xs" fw={500}>{fmtNum(whatsappCredits.period_usage)}</Text>
                                </Group>
                                <Progress value={usagePercent(whatsappCredits.period_usage, whatsappCredits.monthly_allowance)} color="green" size="md" radius="xl" />
                                <Group justify="flex-end" mt="sm">
                                    <Button variant="light" size="xs" color="green" leftSection={<IconPlus size={14} />}
                                        onClick={() => handleOpenBuy('notification_whatsapp')}>
                                        Comprar
                                    </Button>
                                </Group>
                            </Box>
                        </Card>
                    )}
                </SimpleGrid>
            )}

            {/* ═══ Storage ═══ */}
            {storage && (
                <Card withBorder radius="md" padding={0} style={{ overflow: 'hidden' }}>
                    <Box style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)', padding: '14px 20px' }}>
                        <Group justify="space-between">
                            <Group gap="sm">
                                <IconCloud size={22} color="#fff" />
                                <div>
                                    <Text fw={700} c="white" size="sm">Armazenamento</Text>
                                    <Text size="xs" style={{ color: 'rgba(255,255,255,0.6)' }}>CDN (arquivos) + Stream (vídeos)</Text>
                                </div>
                            </Group>
                            {billingEnabled && (
                                <Button variant="white" size="xs" leftSection={<IconPlus size={14} />}
                                    onClick={() => setStorageModalOpen(true)}>
                                    Expandir Storage
                                </Button>
                            )}
                        </Group>
                    </Box>
                    <Box p="md">
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            {/* CDN */}
                            <Paper withBorder radius="md" p="md">
                                <Group gap="sm" mb="sm">
                                    <ThemeIcon size="sm" variant="light" color="teal"><IconFile size={14} /></ThemeIcon>
                                    <Text size="sm" fw={600}>Arquivos (CDN)</Text>
                                    <Badge variant="light" size="xs" ml="auto">{storage.storage_files_count} arquivos</Badge>
                                </Group>
                                <Group gap="xs" align="baseline" mb={6}>
                                    <Text size="lg" fw={700}>{fmtBytes(storage.storage_bytes)}</Text>
                                    <Text size="xs" c="dimmed">/ {fmtBytes(storage.storage_quota_bytes)}</Text>
                                </Group>
                                <Progress
                                    value={bytesPercent(storage.storage_bytes, storage.storage_quota_bytes)}
                                    color={storage.storage_bytes > storage.storage_quota_bytes * 0.9 ? 'red' : 'teal'}
                                    size="md" radius="xl"
                                />
                                {Object.keys(storage.storage_by_tool || {}).length > 0 && (
                                    <Group gap="xs" mt="xs" wrap="wrap">
                                        {Object.entries(storage.storage_by_tool).map(([tool, bytes]) => (
                                            <Badge key={tool} variant="dot" size="xs">{toolLabels[tool] || tool}: {fmtBytes(bytes as number)}</Badge>
                                        ))}
                                    </Group>
                                )}
                            </Paper>

                            {/* Stream */}
                            <Paper withBorder radius="md" p="md">
                                <Group gap="sm" mb="sm">
                                    <ThemeIcon size="sm" variant="light" color="blue"><IconVideo size={14} /></ThemeIcon>
                                    <Text size="sm" fw={600}>Vídeos (Stream)</Text>
                                    <Badge variant="light" size="xs" ml="auto">{storage.stream_files_count} vídeos</Badge>
                                </Group>
                                <Group gap="xs" align="baseline" mb={6}>
                                    <Text size="lg" fw={700}>{fmtBytes(storage.stream_bytes)}</Text>
                                    <Text size="xs" c="dimmed">/ {fmtBytes(storage.stream_quota_bytes)}</Text>
                                </Group>
                                <Progress
                                    value={bytesPercent(storage.stream_bytes, storage.stream_quota_bytes)}
                                    color={storage.stream_bytes > storage.stream_quota_bytes * 0.9 ? 'red' : 'blue'}
                                    size="md" radius="xl"
                                />
                                {Object.keys(storage.stream_by_tool || {}).length > 0 && (
                                    <Group gap="xs" mt="xs" wrap="wrap">
                                        {Object.entries(storage.stream_by_tool).map(([tool, bytes]) => (
                                            <Badge key={tool} variant="dot" size="xs">{toolLabels[tool] || tool}: {fmtBytes(bytes as number)}</Badge>
                                        ))}
                                    </Group>
                                )}
                            </Paper>
                        </SimpleGrid>

                        {billingEnabled && (
                        <Paper withBorder radius="md" p="md" mt="md" bg="var(--mantine-color-gray-0)">
                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                                <Group gap="sm" align="flex-start" wrap="nowrap">
                                    <ThemeIcon size="sm" variant="light" color="indigo" mt={2}><IconRefresh size={14} /></ThemeIcon>
                                    <div>
                                        <Group gap={6}>
                                            <Text size="sm" fw={600}>Expandir automaticamente</Text>
                                            {autoExpandSaving && <Loader size={12} />}
                                        </Group>
                                        <Text size="xs" c="dimmed" maw={460}>
                                            Ao esgotar o espaço de vídeo, ampliamos sozinhos (menor pacote que cobrir) e cobramos no
                                            cartão da assinatura. Sem cartão salvo ou se a cobrança falhar, o upload é bloqueado.
                                        </Text>
                                    </div>
                                </Group>
                                <Switch
                                    checked={!!storage.auto_expand}
                                    disabled={autoExpandSaving}
                                    onChange={(e) => saveAutoExpand(e.currentTarget.checked, Math.round((storage.auto_expand_cap_bytes || 214748364800) / 1073741824) || 200)}
                                />
                            </Group>
                            {storage.auto_expand && (
                                <Group gap="sm" mt="sm" align="center">
                                    <Text size="xs" c="dimmed">Teto automático por mês:</Text>
                                    <Select
                                        size="xs"
                                        w={130}
                                        allowDeselect={false}
                                        disabled={autoExpandSaving}
                                        value={String(Math.round((storage.auto_expand_cap_bytes || 214748364800) / 1073741824) || 200)}
                                        onChange={(v) => v && saveAutoExpand(true, Number(v))}
                                        data={[
                                            { value: '50', label: 'até +50 GB' },
                                            { value: '100', label: 'até +100 GB' },
                                            { value: '200', label: 'até +200 GB' },
                                        ]}
                                    />
                                    <Text size="xs" c="dimmed">Acima do teto, pedimos confirmação.</Text>
                                </Group>
                            )}
                        </Paper>
                        )}
                    </Box>
                </Card>
            )}

            {/* ═══ Histórico ═══ */}
            {recentUsage.length > 0 && (
                <Card withBorder radius="md" p="md">
                    <Group justify="space-between" mb="md">
                        <Group gap="sm">
                            <ThemeIcon size="md" radius="md" variant="light" color="gray"><IconHistory size={18} /></ThemeIcon>
                            <Text fw={600}>Histórico de Consumo</Text>
                        </Group>
                        <SegmentedControl size="xs" value={historyFilter} onChange={setHistoryFilter}
                            data={[
                                { label: 'Todos', value: 'all' },
                                { label: '🧠 IA', value: 'ai' },
                                { label: '📁 Storage', value: 'storage' },
                                ...(billingEnabled ? [
                                    { label: '📧 Email', value: 'notification_email' },
                                    { label: '💬 WhatsApp', value: 'notification_whatsapp' },
                                ] : []),
                            ]}
                        />
                    </Group>
                    <Box style={{ overflowX: 'auto' }}>
                        <Table striped highlightOnHover withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Serviço</Table.Th>
                                    <Table.Th>Ferramenta</Table.Th>
                                    <Table.Th ta="right">Qtd</Table.Th>
                                    <Table.Th ta="right">Valor</Table.Th>
                                    <Table.Th ta="right">Data</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filteredUsage.map(log => {
                                    const meta = serviceConfig[log.service_type];
                                    const IconComp = meta?.icon || IconTrendingUp;
                                    return (
                                        <Table.Tr key={log.id}>
                                            <Table.Td>
                                                <Group gap="xs">
                                                    <IconComp size={14} color={`var(--mantine-color-${meta?.color || 'gray'}-6)`} />
                                                    <Text size="sm">{meta?.label || log.service_type}</Text>
                                                    {log.sub_type && log.sub_type !== log.service_type && <Badge variant="dot" size="xs">{log.sub_type}</Badge>}
                                                </Group>
                                            </Table.Td>
                                            <Table.Td><Badge variant="light" size="xs">{toolLabels[log.tool_id] || log.tool_id}</Badge></Table.Td>
                                            <Table.Td ta="right"><Text size="sm">{fmtNum(log.quantity)}</Text></Table.Td>
                                            <Table.Td ta="right"><Text size="sm" fw={500}>{log.total_resale_brl > 0 ? fmt(log.total_resale_brl) : '—'}</Text></Table.Td>
                                            <Table.Td ta="right">
                                                <Text size="xs" c="dimmed">{new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    </Box>
                </Card>
            )}

            {billingEnabled && (
            <Modal opened={buyModalOpen && isAIBuy} onClose={() => setBuyModalOpen(false)} centered size="md"
                title={<Group gap="xs"><Text size="lg">🧠</Text><Text fw={700} c="violet">Comprar Créditos de IA</Text></Group>}
            >
                <Stack gap="md">
                    <Alert variant="light" color="violet" icon={<IconSparkles size={16} />} p="sm" radius="md">
                        <Text size="xs">
                            <strong>💡 Mais tokens = mais inteligência para o seu negócio.</strong> Automatize atendimento, classifique pedidos, gere campanhas e muito mais. Compre avulso ou adicione como crédito recorrente na sua assinatura.
                        </Text>
                    </Alert>

                    <div>
                        <Text size="sm" fw={500} mb={4} c="dimmed">Quantidade de tokens</Text>
                        <Text size="28px" fw={800} c="violet" ta="center" my="sm" style={{ lineHeight: 1 }}>
                            {buyTokensM}M tokens
                        </Text>
                        <Slider
                            value={buyTokensM}
                            onChange={setBuyTokensM}
                            min={5}
                            max={100}
                            step={5}
                            color="violet"
                            size="lg"
                            marks={TOKEN_MARKS}
                            styles={{ markLabel: { fontSize: 11 } }}
                        />
                    </div>

                    <Card withBorder radius="md" p="sm" mt="xs">
                        <Group justify="space-between">
                            <Text size="xs" c="dimmed">Preço base ({buyTokensM}M × {fmt(buyService?.price_brl ?? 15)})</Text>
                            <Text size="sm">{fmt(calcAIPrice())}</Text>
                        </Group>
                        <Divider my="xs" />
                        <Group justify="space-between">
                            <Text fw={700}>Total</Text>
                            <Text size="lg" fw={800} c="violet">{fmt(calcAIPrice())}</Text>
                        </Group>
                        <Text size="xs" c="dimmed" ta="center" mt={2}>
                            {fmt(buyService?.price_brl ?? 15)}/milhão de tokens
                        </Text>
                    </Card>

                    <Button fullWidth size="md" color="violet" leftSection={<IconShoppingCart size={18} />}
                        onClick={() => {
                            setBuyModalOpen(false);
                            navigate(`/checkout?tipo=creditos&servico=ai&quantidade=${buyTokensM}&ciclo=avulso&valor=${calcAIPrice().toFixed(2)}`);
                        }}>
                        Comprar {buyTokensM}M tokens por {fmt(calcAIPrice())}
                    </Button>

                    <Button fullWidth size="md" variant="light" color="violet" leftSection={<IconRefresh size={18} />}
                        onClick={() => {
                            setBuyModalOpen(false);
                            navigate(`/checkout?tipo=creditos&servico=ai&quantidade=${buyTokensM}&ciclo=recorrente&valor=${calcAIPrice().toFixed(2)}`);
                        }}>
                        📈 Ou adicionar +{fmt(calcAIPrice())}/mês na assinatura
                    </Button>

                    <Text size="xs" c="dimmed" ta="center">
                        O botão principal compra créditos avulsos (sem renovação). A opção mensal adiciona recarga automática à sua assinatura.
                    </Text>
                </Stack>
            </Modal>
            )}

            {billingEnabled && (
            <Modal opened={buyModalOpen && !isAIBuy} onClose={() => setBuyModalOpen(false)} centered size="md"
                title={<Group gap="xs"><IconCoin size={20} /><Text fw={600}>Comprar {buyService?.name}</Text></Group>}
            >
                {buyService && (
                    <Stack gap="md">
                        <Tabs defaultValue="avulso">
                            <Tabs.List grow>
                                <Tabs.Tab value="avulso" leftSection={<IconShoppingCart size={14} />}>Créditos Avulsos</Tabs.Tab>
                                <Tabs.Tab value="recorrente" leftSection={<IconRefresh size={14} />}>Recorrente (+/mês)</Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel value="avulso" pt="md">
                                <Stack gap="sm">
                                    <Alert variant="light" color="orange" icon={<IconAlertCircle size={16} />} p="xs">
                                        <Text size="xs">Créditos avulsos expiram em <strong>30 dias</strong> após a compra.</Text>
                                    </Alert>
                                    <div>
                                        <Text size="sm" fw={500} mb={4}>Quantidade: <strong>{buyQuantity}x {buyService.unit_label}</strong></Text>
                                        <Slider value={buyQuantity} onChange={setBuyQuantity} min={1} max={100} step={1} color="violet"
                                            marks={[{ value: 1, label: '1' }, { value: 25, label: '25' }, { value: 50, label: '50' }, { value: 100, label: '100' }]}
                                        />
                                    </div>
                                    <Card withBorder radius="md" p="sm" mt="xs">
                                        <Group justify="space-between">
                                            <Text fw={700}>Total</Text>
                                            <Text size="lg" fw={800} c="violet">{fmt(calcPrice())}</Text>
                                        </Group>
                                    </Card>
                                    <Button fullWidth size="md" color="violet" leftSection={<IconShoppingCart size={18} />}
                                        onClick={() => {
                                            setBuyModalOpen(false);
                                            navigate(`/checkout?tipo=creditos&servico=${buyService.service_type}&quantidade=${buyQuantity}&ciclo=avulso&valor=${calcPrice().toFixed(2)}`);
                                        }}>
                                        Comprar por {fmt(calcPrice())}
                                    </Button>
                                </Stack>
                            </Tabs.Panel>

                            <Tabs.Panel value="recorrente" pt="md">
                                <Stack gap="sm">
                                    <Alert variant="light" color="violet" icon={<IconSparkles size={16} />} p="xs">
                                        <Text size="xs">Créditos recorrentes são renovados <strong>automaticamente todo mês</strong> junto com sua assinatura.</Text>
                                    </Alert>
                                    <div>
                                        <Text size="sm" fw={500} mb={4}>Quantidade mensal: <strong>{buyQuantity}x {buyService.unit_label}</strong></Text>
                                        <Slider value={buyQuantity} onChange={setBuyQuantity} min={1} max={100} step={1} color="violet"
                                            marks={[{ value: 1, label: '1' }, { value: 25, label: '25' }, { value: 50, label: '50' }, { value: 100, label: '100' }]}
                                        />
                                    </div>
                                    <Card withBorder radius="md" p="sm" mt="xs" style={{ background: 'var(--mantine-color-violet-0)' }}>
                                        <Group justify="space-between">
                                            <Text fw={700}>Acréscimo mensal</Text>
                                            <Text size="lg" fw={800} c="violet">+{fmt(calcPrice())}/mês</Text>
                                        </Group>
                                        <Text size="xs" c="dimmed" mt={2}>Será adicionado à sua próxima fatura</Text>
                                    </Card>
                                    <Button fullWidth size="md" variant="filled" color="violet" leftSection={<IconRefresh size={18} />}
                                        onClick={() => {
                                            setBuyModalOpen(false);
                                            navigate(`/checkout?tipo=creditos&servico=${buyService.service_type}&quantidade=${buyQuantity}&ciclo=recorrente&valor=${calcPrice().toFixed(2)}`);
                                        }}>
                                        Adicionar +{fmt(calcPrice())}/mês
                                    </Button>
                                </Stack>
                            </Tabs.Panel>
                        </Tabs>
                    </Stack>
                )}
            </Modal>
            )}

            {billingEnabled && (
            <Modal opened={storageModalOpen} onClose={() => setStorageModalOpen(false)} centered size="md"
                title={<Group gap="xs"><IconDatabase size={20} /><Text fw={600}>Expandir Armazenamento</Text></Group>}
            >
                <Stack gap="md">
                    <SegmentedControl fullWidth value={storageType} onChange={(v) => setStorageType(v as 'storage' | 'stream')}
                        data={[
                            { label: '📁 Arquivos (CDN)', value: 'storage' },
                            { label: '🎬 Vídeos (Stream)', value: 'stream' },
                        ]}
                    />

                    {storage && (
                        <Card withBorder radius="md" p="sm" bg="var(--mantine-color-gray-0)">
                            <Text size="xs" c="dimmed" mb={4}>Uso atual ({storageType === 'stream' ? 'Stream' : 'CDN'})</Text>
                            <Group gap="xs" align="baseline">
                                <Text size="md" fw={700}>
                                    {fmtBytes(storageType === 'stream' ? storage.stream_bytes : storage.storage_bytes)}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    / {fmtBytes(storageType === 'stream' ? storage.stream_quota_bytes : storage.storage_quota_bytes)}
                                </Text>
                            </Group>
                            <Progress
                                value={bytesPercent(
                                    storageType === 'stream' ? storage.stream_bytes : storage.storage_bytes,
                                    storageType === 'stream' ? storage.stream_quota_bytes : storage.storage_quota_bytes
                                )}
                                color={storageType === 'stream' ? 'blue' : 'teal'}
                                size="sm" radius="xl" mt={4}
                            />
                        </Card>
                    )}

                    {(() => {
                        const packs = pricing
                            .filter(p => p.service_type === 'storage' && p.unit_amount >= 10 * 1073741824)
                            .sort((a, b) => a.unit_amount - b.unit_amount);
                        if (packs.length === 0) {
                            return <Alert variant="light" color="gray" p="xs"><Text size="xs">Pacotes indisponíveis no momento.</Text></Alert>;
                        }
                        const selected = packs.find(p => Math.round(p.unit_amount / 1073741824) === storagePackGb) || packs[0];
                        const selectedGb = Math.round(selected.unit_amount / 1073741824);
                        const perGb = selected.price_brl / selectedGb;
                        return (
                            <>
                                <SimpleGrid cols={packs.length >= 3 ? 3 : packs.length} spacing="sm">
                                    {packs.map(p => {
                                        const gb = Math.round(p.unit_amount / 1073741824);
                                        const active = gb === selectedGb;
                                        return (
                                            <Card key={p.unit_amount} withBorder radius="md" p="sm"
                                                onClick={() => setStoragePackGb(gb)}
                                                style={{
                                                    cursor: 'pointer', textAlign: 'center',
                                                    borderColor: active ? 'var(--mantine-color-teal-6)' : undefined,
                                                    borderWidth: active ? 2 : 1,
                                                    background: active ? 'var(--mantine-color-teal-0)' : undefined,
                                                }}>
                                                <Text fw={800} size="lg" c={active ? 'teal' : undefined}>+{gb} GB</Text>
                                                <Text size="sm" fw={600}>{fmt(p.price_brl)}/mês</Text>
                                                <Text size="xs" c="dimmed">{fmt(p.price_brl / gb)}/GB</Text>
                                            </Card>
                                        );
                                    })}
                                </SimpleGrid>

                                <Card withBorder radius="md" p="sm" bg="var(--mantine-color-teal-0)">
                                    <Group justify="space-between">
                                        <div>
                                            <Text size="xs" c="dimmed">Pacote selecionado ({storageType === 'stream' ? 'Vídeos' : 'Arquivos'})</Text>
                                            <Text size="sm" fw={500}>+{selectedGb} GB · {fmt(perGb)}/GB</Text>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <Text size="xs" c="dimmed">Acréscimo mensal</Text>
                                            <Text size="lg" fw={800} c="teal">+{fmt(selected.price_brl)}/mês</Text>
                                        </div>
                                    </Group>
                                </Card>

                                <Button fullWidth size="md" color="teal" leftSection={<IconDatabase size={18} />}
                                    onClick={() => {
                                        setStorageModalOpen(false);
                                        navigate(`/checkout?tipo=storage&subtipo=${storageType}&gb=${selectedGb}&ciclo=recorrente&valor=${selected.price_brl.toFixed(2)}`);
                                    }}>
                                    Adicionar +{selectedGb} GB por +{fmt(selected.price_brl)}/mês
                                </Button>

                                <Text size="xs" c="dimmed" ta="center">
                                    Cobrança recorrente somada à sua assinatura. Ou ative a expansão automática para nunca travar um upload.
                                </Text>
                            </>
                        );
                    })()}
                </Stack>
            </Modal>
            )}
        </Stack>
    );
}
