import { useEffect, useState } from 'react';
import {
    Title, Text, Card, Group, Badge, Button, Stack, Skeleton,
    Table, Modal, Alert, Paper,
} from '@mantine/core';
import { IconCash, IconAlertCircle, IconCheck, IconClock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';

interface Withdrawal {
    id: string;
    amount: number;
    status: string;
    pix_key: string;
    pix_key_type: string;
    reference_month: string;
    requested_at: string;
    processed_at: string | null;
    notes: string | null;
}

interface PartnerInfo {
    id: string;
    pix_key: string | null;
    pix_key_type: string | null;
    commission_percent: number;
}

export function PartnerWithdrawals() {
    const { subscriber } = useAuth();
    const [partner, setPartner] = useState<PartnerInfo | null>(null);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const today = new Date();
    const isWithdrawalDay = today.getDate() === 25;

    useEffect(() => {
        loadData();
    }, [subscriber]);

    const loadData = async () => {
        if (!subscriber) return;
        setLoading(true);
        try {
            const { data: partnerData } = await supabase
                .from('partners')
                .select('id, pix_key, pix_key_type, commission_percent')
                .eq('user_id', subscriber.id)
                .single();

            if (!partnerData) return;
            setPartner(partnerData);

            // Get balance
            const { data: balanceData } = await supabase
                .rpc('calculate_partner_balance', { p_partner_id: partnerData.id });
            setBalance(balanceData || 0);

            // Get withdrawals
            const { data: withdrawalData } = await supabase
                .from('partner_withdrawals')
                .select('*')
                .eq('partner_id', partnerData.id)
                .order('requested_at', { ascending: false });

            setWithdrawals(withdrawalData || []);
        } catch (error) {
            console.error('Error loading withdrawal data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestWithdrawal = async () => {
        if (!partner || !partner.pix_key || balance <= 0) return;
        setRequesting(true);
        try {
            const referenceMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                .toISOString().split('T')[0];

            const { error } = await supabase
                .from('partner_withdrawals')
                .insert({
                    partner_id: partner.id,
                    amount: balance,
                    pix_key_type: partner.pix_key_type,
                    pix_key: partner.pix_key,
                    reference_month: referenceMonth,
                    status: 'pending',
                });

            if (error) throw error;

            notifications.show({
                title: 'Saque solicitado!',
                message: `Solicitação de ${formatCurrency(balance)} enviada. Aguarde processamento.`,
                color: 'green',
            });

            setShowConfirmModal(false);
            loadData();
        } catch (error) {
            console.error('Error requesting withdrawal:', error);
            notifications.show({
                title: 'Erro',
                message: 'Não foi possível solicitar o saque. Tente novamente.',
                color: 'red',
            });
        } finally {
            setRequesting(false);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('pt-BR');

    const getStatusBadge = (status: string) => {
        const config: Record<string, { color: string; label: string; icon: typeof IconCheck }> = {
            pending: { color: 'orange', label: 'Pendente', icon: IconClock },
            processing: { color: 'blue', label: 'Processando', icon: IconClock },
            paid: { color: 'green', label: 'Pago', icon: IconCheck },
            rejected: { color: 'red', label: 'Rejeitado', icon: IconAlertCircle },
        };
        const c = config[status] || { color: 'gray', label: status, icon: IconClock };
        return <Badge color={c.color} variant="light" leftSection={<c.icon size={12} />}>{c.label}</Badge>;
    };

    const canRequestWithdrawal = isWithdrawalDay && balance > 0 && partner?.pix_key;

    return (
        <Stack gap="lg">

            {/* Balance Card */}
            {loading ? (
                <Skeleton height={120} radius="md" />
            ) : (
                <Paper shadow="sm" p="lg" radius="md" withBorder>
                    <Group justify="space-between" align="flex-start">
                        <div>
                            <Text size="sm" c="dimmed" tt="uppercase">Saldo Disponível</Text>
                            <Text size="2rem" fw={700} c="green">{formatCurrency(balance)}</Text>
                            <Text size="xs" c="dimmed" mt="xs">
                                Comissão a receber (assinaturas ativas 30+ dias)
                            </Text>
                        </div>
                        <Button
                            size="md"
                            color="green"
                            leftSection={<IconCash size={18} />}
                            disabled={!canRequestWithdrawal}
                            onClick={() => setShowConfirmModal(true)}
                        >
                            Solicitar Saque
                        </Button>
                    </Group>
                </Paper>
            )}

            {/* Info alerts */}
            {!isWithdrawalDay && (
                <Alert color="blue" variant="light" icon={<IconAlertCircle size={18} />}>
                    Saques podem ser solicitados apenas no <strong>dia 25 de cada mês</strong>.
                    Próximo dia de saque: <strong>25/{today.getMonth() + (today.getDate() > 25 ? 2 : 1)}/{today.getFullYear()}</strong>
                </Alert>
            )}

            {partner && !partner.pix_key && (
                <Alert color="orange" variant="light" icon={<IconAlertCircle size={18} />}>
                    Você precisa cadastrar uma chave PIX nas <strong>Configurações</strong> para solicitar saques.
                </Alert>
            )}

            {/* Withdrawal History */}
            <div>
                <Title order={4} mb="md">Histórico de Saques</Title>
                {loading ? (
                    <Stack gap="sm">
                        {[1, 2].map(i => <Skeleton key={i} height={50} radius="md" />)}
                    </Stack>
                ) : withdrawals.length === 0 ? (
                    <Card shadow="sm" padding="xl" radius="md" withBorder>
                        <Text ta="center" c="dimmed">Nenhum saque solicitado ainda.</Text>
                    </Card>
                ) : (
                    <Card shadow="sm" padding={0} radius="md" withBorder>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Data</Table.Th>
                                    <Table.Th>Referência</Table.Th>
                                    <Table.Th>Valor</Table.Th>
                                    <Table.Th>PIX</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {withdrawals.map(w => (
                                    <Table.Tr key={w.id}>
                                        <Table.Td><Text size="sm">{formatDate(w.requested_at)}</Text></Table.Td>
                                        <Table.Td><Text size="sm">{formatDate(w.reference_month)}</Text></Table.Td>
                                        <Table.Td><Text size="sm" fw={600}>{formatCurrency(w.amount)}</Text></Table.Td>
                                        <Table.Td>
                                            <Text size="xs" c="dimmed">{w.pix_key_type}: {w.pix_key}</Text>
                                        </Table.Td>
                                        <Table.Td>{getStatusBadge(w.status)}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                )}
            </div>

            {/* Confirm Modal */}
            <Modal
                opened={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="Confirmar Solicitação de Saque"
                centered
            >
                <Stack gap="md">
                    <Card padding="md" withBorder>
                        <Group justify="space-between">
                            <Text size="sm">Valor do saque:</Text>
                            <Text size="lg" fw={700} c="green">{formatCurrency(balance)}</Text>
                        </Group>
                        <Group justify="space-between" mt="xs">
                            <Text size="sm">Chave PIX:</Text>
                            <Text size="sm">{partner?.pix_key_type}: {partner?.pix_key}</Text>
                        </Group>
                    </Card>
                    <Alert color="blue" variant="light">
                        O pagamento será processado pela equipe e enviado via PIX.
                    </Alert>
                    <Button
                        fullWidth
                        color="green"
                        onClick={handleRequestWithdrawal}
                        loading={requesting}
                    >
                        Confirmar Saque de {formatCurrency(balance)}
                    </Button>
                </Stack>
            </Modal>
        </Stack>
    );
}
