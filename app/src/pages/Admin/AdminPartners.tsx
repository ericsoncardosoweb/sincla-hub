import { useEffect, useState } from 'react';
import {
    Container, Title, Text, Card, Group, Badge, Button, Stack, Skeleton,
    Table, Avatar, TextInput, Modal, NumberInput, Tabs, SimpleGrid,
    ThemeIcon,
} from '@mantine/core';
import {
    IconSearch, IconHeartHandshake, IconCash, IconCheck, IconX,
    IconEdit, IconChartBar, IconUsersGroup, IconCoin,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';

// ============================
// Types
// ============================

interface PartnerFull {
    id: string;
    user_id: string;
    affiliate_code: string;
    commission_percent: number;
    status: string;
    type: string;
    pix_key: string | null;
    pix_key_type: string | null;
    company_name: string | null;
    cnpj: string | null;
    created_at: string;
    subscriber: {
        name: string | null;
        email: string;
    };
}

interface WithdrawalFull {
    id: string;
    partner_id: string;
    amount: number;
    status: string;
    pix_key: string;
    pix_key_type: string;
    reference_month: string;
    requested_at: string;
    processed_at: string | null;
    notes: string | null;
    partner: {
        affiliate_code: string;
        subscriber: {
            name: string | null;
            email: string;
        };
    };
}

interface PartnerOverview {
    totalPartners: number;
    activePartners: number;
    totalPendingWithdrawals: number;
    pendingAmount: number;
    totalPaid: number;
    totalReferredClients: number;
}

// ============================
// Helpers
// ============================

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR');

const statusLabels: Record<string, string> = {
    paid: 'Pago',
    rejected: 'Rejeitado',
    processing: 'Processando',
    pending: 'Pendente',
};

const statusColors: Record<string, string> = {
    paid: 'green',
    rejected: 'red',
    processing: 'blue',
    pending: 'orange',
};

const typeLabels: Record<string, string> = {
    consultant: 'Consultor',
    agency: 'Agência',
    reseller: 'Revendedor',
};

// ============================
// Component
// ============================

export function AdminPartners() {
    const { subscriber } = useAuth();
    const [partners, setPartners] = useState<PartnerFull[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalFull[]>([]);
    const [overview, setOverview] = useState<PartnerOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingPartner, setEditingPartner] = useState<PartnerFull | null>(null);
    const [newCommission, setNewCommission] = useState<number | string>(10);
    const [savingCommission, setSavingCommission] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadPartners(),
                loadWithdrawals(),
                loadOverview(),
            ]);
        } catch (error) {
            console.error('Error loading admin partners data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPartners = async () => {
        const { data } = await supabase
            .from('partners')
            .select(`
                *,
                subscriber:subscribers!user_id (name, email)
            `)
            .order('created_at', { ascending: false });

        const formattedPartners = (data || []).map((p: any) => ({
            ...p,
            subscriber: Array.isArray(p.subscriber) ? p.subscriber[0] : p.subscriber
        }));

        setPartners(formattedPartners);
    };

    const loadWithdrawals = async () => {
        const { data } = await supabase
            .from('partner_withdrawals')
            .select(`
                *,
                partner:partners (
                    affiliate_code,
                    subscriber:subscribers!user_id (name, email)
                )
            `)
            .order('requested_at', { ascending: false })
            .limit(50);

        const formattedWithdrawals = (data || []).map((w: any) => {
            const partner = Array.isArray(w.partner) ? w.partner[0] : w.partner;
            if (partner && partner.subscriber) {
                partner.subscriber = Array.isArray(partner.subscriber) ? partner.subscriber[0] : partner.subscriber;
            }
            return {
                ...w,
                partner
            };
        });

        setWithdrawals(formattedWithdrawals);
    };

    const loadOverview = async () => {
        const [partnersRes, withdrawalsRes, referredRes] = await Promise.all([
            supabase.from('partners').select('id, status', { count: 'exact' }),
            supabase.from('partner_withdrawals').select('amount, status'),
            supabase.from('subscribers').select('id', { count: 'exact' }).not('referred_by', 'is', null),
        ]);

        const allPartners = partnersRes.data || [];
        const allWithdrawals = withdrawalsRes.data || [];
        const pendingW = allWithdrawals.filter(w => w.status === 'pending' || w.status === 'processing');
        const paidW = allWithdrawals.filter(w => w.status === 'paid');

        setOverview({
            totalPartners: allPartners.length,
            activePartners: allPartners.filter(p => p.status === 'active').length,
            totalPendingWithdrawals: pendingW.length,
            pendingAmount: pendingW.reduce((sum, w) => sum + (w.amount || 0), 0),
            totalPaid: paidW.reduce((sum, w) => sum + (w.amount || 0), 0),
            totalReferredClients: referredRes.count || 0,
        });
    };

    const handleSaveCommission = async () => {
        if (!editingPartner) return;
        setSavingCommission(true);
        try {
            const { error } = await supabase
                .from('partners')
                .update({ commission_percent: Number(newCommission) })
                .eq('id', editingPartner.id);

            if (error) throw error;

            notifications.show({
                title: 'Comissão atualizada',
                message: `${editingPartner.subscriber?.name || editingPartner.subscriber?.email} agora tem ${newCommission}% de comissão.`,
                color: 'green',
            });

            setEditingPartner(null);
            loadData();
        } catch (error) {
            console.error('Error saving commission:', error);
            notifications.show({
                title: 'Erro',
                message: 'Não foi possível salvar a comissão',
                color: 'red',
            });
        } finally {
            setSavingCommission(false);
        }
    };

    const handleWithdrawalAction = async (withdrawalId: string, action: 'paid' | 'rejected') => {
        setProcessingId(withdrawalId);
        try {
            const { error } = await supabase
                .from('partner_withdrawals')
                .update({
                    status: action,
                    processed_at: new Date().toISOString(),
                    processed_by: subscriber?.id,
                })
                .eq('id', withdrawalId);

            if (error) throw error;

            notifications.show({
                title: action === 'paid' ? 'Saque aprovado' : 'Saque rejeitado',
                message: action === 'paid'
                    ? 'O saque foi marcado como pago.'
                    : 'O saque foi rejeitado.',
                color: action === 'paid' ? 'green' : 'red',
            });

            loadData();
        } catch (error) {
            console.error('Error processing withdrawal:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredPartners = partners.filter(p =>
        (p.subscriber?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.subscriber?.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.affiliate_code || '').toLowerCase().includes(search.toLowerCase())
    );

    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <Group justify="space-between">
                    <div>
                        <Title order={2}>Gerenciar Parceiros</Title>
                        <Text c="dimmed">Programa de parceiros e comissões do Sincla Hub</Text>
                    </div>
                    {pendingWithdrawals.length > 0 && (
                        <Badge color="orange" size="lg" variant="light">
                            {pendingWithdrawals.length} saque{pendingWithdrawals.length !== 1 ? 's' : ''} pendente{pendingWithdrawals.length !== 1 ? 's' : ''}
                        </Badge>
                    )}
                </Group>

                <Tabs defaultValue="overview">
                    <Tabs.List>
                        <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>
                            Visão Geral
                        </Tabs.Tab>
                        <Tabs.Tab value="partners" leftSection={<IconHeartHandshake size={16} />}>
                            Parceiros ({partners.length})
                        </Tabs.Tab>
                        <Tabs.Tab
                            value="withdrawals"
                            leftSection={<IconCash size={16} />}
                            rightSection={pendingWithdrawals.length > 0
                                ? <Badge color="orange" size="xs" variant="filled">{pendingWithdrawals.length}</Badge>
                                : null}
                        >
                            Saques
                        </Tabs.Tab>
                    </Tabs.List>

                    {/* Overview Tab */}
                    <Tabs.Panel value="overview" pt="md">
                        {loading ? (
                            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
                                {Array(6).fill(0).map((_, i) => <Skeleton key={i} height={100} />)}
                            </SimpleGrid>
                        ) : overview && (
                            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
                                <Card withBorder padding="md" radius="md">
                                    <Group gap="xs">
                                        <ThemeIcon size="md" radius="md" variant="light" color="green">
                                            <IconUsersGroup size={16} />
                                        </ThemeIcon>
                                        <Text size="xs" c="dimmed">Total Parceiros</Text>
                                    </Group>
                                    <Text size="xl" fw={700} mt="xs">{overview.totalPartners}</Text>
                                    <Text size="xs" c="dimmed">{overview.activePartners} ativos</Text>
                                </Card>

                                <Card withBorder padding="md" radius="md">
                                    <Group gap="xs">
                                        <ThemeIcon size="md" radius="md" variant="light" color="blue">
                                            <IconUsersGroup size={16} />
                                        </ThemeIcon>
                                        <Text size="xs" c="dimmed">Clientes Indicados</Text>
                                    </Group>
                                    <Text size="xl" fw={700} mt="xs">{overview.totalReferredClients}</Text>
                                </Card>

                                <Card withBorder padding="md" radius="md">
                                    <Group gap="xs">
                                        <ThemeIcon size="md" radius="md" variant="light" color="orange">
                                            <IconCoin size={16} />
                                        </ThemeIcon>
                                        <Text size="xs" c="dimmed">Saques Pendentes</Text>
                                    </Group>
                                    <Text size="xl" fw={700} mt="xs" c="orange">{formatCurrency(overview.pendingAmount)}</Text>
                                    <Text size="xs" c="dimmed">{overview.totalPendingWithdrawals} solicitações</Text>
                                </Card>

                                <Card withBorder padding="md" radius="md">
                                    <Group gap="xs">
                                        <ThemeIcon size="md" radius="md" variant="light" color="teal">
                                            <IconCash size={16} />
                                        </ThemeIcon>
                                        <Text size="xs" c="dimmed">Total Pago</Text>
                                    </Group>
                                    <Text size="xl" fw={700} mt="xs" c="teal">{formatCurrency(overview.totalPaid)}</Text>
                                </Card>
                            </SimpleGrid>
                        )}
                    </Tabs.Panel>

                    {/* Partners Tab */}
                    <Tabs.Panel value="partners" pt="md">
                        <Stack gap="md">
                            <TextInput
                                placeholder="Buscar por nome, email ou código..."
                                leftSection={<IconSearch size={16} />}
                                value={search}
                                onChange={(e) => setSearch(e.currentTarget.value)}
                            />

                            {loading ? (
                                <Stack gap="sm">
                                    {[1, 2, 3].map(i => <Skeleton key={i} height={55} radius="md" />)}
                                </Stack>
                            ) : filteredPartners.length === 0 ? (
                                <Card shadow="sm" padding="xl" radius="md" withBorder>
                                    <Text ta="center" c="dimmed">Nenhum parceiro encontrado.</Text>
                                </Card>
                            ) : (
                                <Card shadow="sm" padding={0} radius="md" withBorder>
                                    <Table striped highlightOnHover>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Parceiro</Table.Th>
                                                <Table.Th>Tipo</Table.Th>
                                                <Table.Th>Código</Table.Th>
                                                <Table.Th>Comissão</Table.Th>
                                                <Table.Th>PIX</Table.Th>
                                                <Table.Th>Status</Table.Th>
                                                <Table.Th>Desde</Table.Th>
                                                <Table.Th>Ações</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {filteredPartners.map(p => (
                                                <Table.Tr key={p.id}>
                                                    <Table.Td>
                                                        <Group gap="sm">
                                                            <Avatar radius="xl" size="sm" color="green">
                                                                {(p.subscriber?.name || p.subscriber?.email || '?').charAt(0).toUpperCase()}
                                                            </Avatar>
                                                            <div>
                                                                <Text size="sm" fw={500}>{p.subscriber?.name || 'Sem nome'}</Text>
                                                                <Text size="xs" c="dimmed">{p.subscriber?.email}</Text>
                                                            </div>
                                                        </Group>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge variant="light" color="violet" size="sm">
                                                            {typeLabels[p.type] || p.type}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge variant="light" color="blue" size="sm">{p.affiliate_code}</Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm" fw={600}>{p.commission_percent}%</Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge
                                                            variant="light"
                                                            color={p.pix_key ? 'green' : 'gray'}
                                                            size="sm"
                                                        >
                                                            {p.pix_key ? 'Configurado' : 'Sem PIX'}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge
                                                            color={p.status === 'active' ? 'green' : p.status === 'suspended' ? 'red' : 'gray'}
                                                            size="sm"
                                                        >
                                                            {p.status === 'active' ? 'Ativo' : p.status === 'suspended' ? 'Suspenso' : 'Inativo'}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm">{formatDate(p.created_at)}</Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Button
                                                            variant="subtle"
                                                            size="xs"
                                                            leftSection={<IconEdit size={14} />}
                                                            onClick={() => {
                                                                setEditingPartner(p);
                                                                setNewCommission(p.commission_percent);
                                                            }}
                                                        >
                                                            Editar
                                                        </Button>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </Card>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    {/* Withdrawals Tab */}
                    <Tabs.Panel value="withdrawals" pt="md">
                        {loading ? (
                            <Stack gap="sm">
                                {[1, 2].map(i => <Skeleton key={i} height={55} radius="md" />)}
                            </Stack>
                        ) : withdrawals.length === 0 ? (
                            <Card shadow="sm" padding="xl" radius="md" withBorder>
                                <Text ta="center" c="dimmed">Nenhum saque registrado.</Text>
                            </Card>
                        ) : (
                            <Card shadow="sm" padding={0} radius="md" withBorder>
                                <Table striped highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Parceiro</Table.Th>
                                            <Table.Th>Valor</Table.Th>
                                            <Table.Th>PIX</Table.Th>
                                            <Table.Th>Mês Ref.</Table.Th>
                                            <Table.Th>Solicitado</Table.Th>
                                            <Table.Th>Status</Table.Th>
                                            <Table.Th>Ações</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {withdrawals.map(w => (
                                            <Table.Tr key={w.id}>
                                                <Table.Td>
                                                    <div>
                                                        <Text size="sm" fw={500}>
                                                            {w.partner?.subscriber?.name || 'Sem nome'}
                                                        </Text>
                                                        <Text size="xs" c="dimmed">
                                                            {w.partner?.affiliate_code}
                                                        </Text>
                                                    </div>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm" fw={600}>{formatCurrency(w.amount)}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="xs">{w.pix_key_type}: {w.pix_key}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm">{w.reference_month ? formatDate(w.reference_month) : '—'}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm">{formatDate(w.requested_at)}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge
                                                        color={statusColors[w.status] || 'gray'}
                                                        variant="light"
                                                        size="sm"
                                                    >
                                                        {statusLabels[w.status] || w.status}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    {w.status === 'pending' && (
                                                        <Group gap="xs">
                                                            <Button
                                                                variant="filled"
                                                                color="green"
                                                                size="xs"
                                                                leftSection={<IconCheck size={14} />}
                                                                loading={processingId === w.id}
                                                                onClick={() => handleWithdrawalAction(w.id, 'paid')}
                                                            >
                                                                Aprovar
                                                            </Button>
                                                            <Button
                                                                variant="light"
                                                                color="red"
                                                                size="xs"
                                                                leftSection={<IconX size={14} />}
                                                                loading={processingId === w.id}
                                                                onClick={() => handleWithdrawalAction(w.id, 'rejected')}
                                                            >
                                                                Rejeitar
                                                            </Button>
                                                        </Group>
                                                    )}
                                                    {w.status !== 'pending' && w.processed_at && (
                                                        <Text size="xs" c="dimmed">
                                                            Processado em {formatDate(w.processed_at)}
                                                        </Text>
                                                    )}
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </Card>
                        )}
                    </Tabs.Panel>
                </Tabs>

                {/* Edit Commission Modal */}
                <Modal
                    opened={!!editingPartner}
                    onClose={() => setEditingPartner(null)}
                    title="Editar Comissão"
                    centered
                >
                    {editingPartner && (
                        <Stack gap="md">
                            <Text size="sm">
                                Parceiro: <strong>{editingPartner.subscriber?.name || editingPartner.subscriber?.email}</strong>
                            </Text>
                            <Text size="xs" c="dimmed">
                                Código: {editingPartner.affiliate_code} · Tipo: {typeLabels[editingPartner.type] || editingPartner.type}
                            </Text>
                            <NumberInput
                                label="Taxa de Comissão (%)"
                                value={newCommission}
                                onChange={setNewCommission}
                                min={0}
                                max={50}
                                step={0.5}
                                suffix="%"
                            />
                            <Button
                                fullWidth
                                onClick={handleSaveCommission}
                                loading={savingCommission}
                            >
                                Salvar Comissão
                            </Button>
                        </Stack>
                    )}
                </Modal>
            </Stack>
        </Container>
    );
}
