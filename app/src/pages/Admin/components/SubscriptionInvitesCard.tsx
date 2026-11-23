import { useState } from 'react';
import {
    ActionIcon, Alert, Badge, Button, Card, CopyButton, Group, Modal, Skeleton, Stack, Table,
    Text, Title, Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconAlertCircle, IconCheck, IconCopy, IconMailForward, IconX } from '@tabler/icons-react';
import { supabase } from '../../../shared/lib/supabase';
import { formatCurrency } from '../../../shared/services/asaasService';
import { subscriptionInviteService } from '../../../shared/services/subscriptionInviteService';

interface InviteRow {
    id: string;
    token: string;
    status: 'pending' | 'processing' | 'accepted' | 'canceled';
    contact_name: string;
    company_name: string;
    email: string;
    billing_cycle: 'monthly' | 'yearly';
    due_date: string;
    total_amount: number;
    items: { product_name: string; plan_name: string }[];
    last_error: string | null;
    last_sent_at: string | null;
    expires_at: string;
    accepted_at: string | null;
    created_at: string;
}

export const SUBSCRIPTION_INVITES_QUERY_KEY = ['admin', 'subscription-invites'];

const statusBadge = (invite: InviteRow) => {
    if (invite.status === 'pending' && new Date(invite.expires_at).getTime() < Date.now()) {
        return <Badge color="gray" variant="light" size="sm">Expirado</Badge>;
    }
    const map: Record<InviteRow['status'], { label: string; color: string }> = {
        pending: { label: 'Aguardando aceite', color: 'yellow' },
        processing: { label: 'Processando', color: 'blue' },
        accepted: { label: 'Aceito', color: 'green' },
        canceled: { label: 'Cancelado', color: 'red' },
    };
    const s = map[invite.status];
    return <Badge color={s.color} variant="light" size="sm">{s.label}</Badge>;
};

const formatDate = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
};

const inviteLink = (token: string) => `${window.location.origin}/convite/${token}`;

export function SubscriptionInvitesCard() {
    const queryClient = useQueryClient();
    const [cancelTarget, setCancelTarget] = useState<InviteRow | null>(null);

    const invites = useQuery({
        queryKey: SUBSCRIPTION_INVITES_QUERY_KEY,
        staleTime: 30 * 1000,
        queryFn: async () => {
            const since = new Date(Date.now() - 30 * 86400000).toISOString();
            const { data, error } = await supabase
                .from('subscription_invites')
                .select('id, token, status, contact_name, company_name, email, billing_cycle, due_date, total_amount, items, last_error, last_sent_at, expires_at, accepted_at, created_at')
                .or(`status.in.(pending,processing),created_at.gte."${since}"`)
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return (data || []) as InviteRow[];
        },
    });

    const resend = useMutation({
        mutationFn: (id: string) => subscriptionInviteService.resend(id),
        onSuccess: () => {
            notifications.show({ color: 'green', title: 'Convite reenviado', message: 'O e-mail foi enviado novamente e a validade renovada por 30 dias.' });
            queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_INVITES_QUERY_KEY });
        },
        onError: (error: Error) => notifications.show({ color: 'red', title: 'Falha ao reenviar', message: error.message }),
    });

    const cancel = useMutation({
        mutationFn: (id: string) => subscriptionInviteService.cancel(id),
        onSuccess: () => {
            notifications.show({ color: 'green', title: 'Convite cancelado', message: 'O link deixou de funcionar.' });
            setCancelTarget(null);
            queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_INVITES_QUERY_KEY });
        },
        onError: (error: Error) => notifications.show({ color: 'red', title: 'Falha ao cancelar', message: error.message }),
    });

    if (invites.isLoading) {
        return <Skeleton height={80} radius="md" />;
    }

    if (invites.isError) {
        return (
            <Alert color="red" icon={<IconAlertCircle size={16} />} title="Erro ao carregar convites">
                <Group justify="space-between">
                    <Text size="sm">{(invites.error as Error).message}</Text>
                    <Button size="xs" variant="light" onClick={() => invites.refetch()}>Tentar novamente</Button>
                </Group>
            </Alert>
        );
    }

    const rows = invites.data || [];
    if (rows.length === 0) return null;

    return (
        <Card withBorder radius="md" padding={0}>
            <Group justify="space-between" p="md" pb="xs">
                <div>
                    <Title order={5}>Convites de assinatura</Title>
                    <Text size="xs" c="dimmed">Pendentes e criados nos últimos 30 dias</Text>
                </div>
            </Group>
            <Table.ScrollContainer minWidth={820}>
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Cliente</Table.Th>
                            <Table.Th>Planos</Table.Th>
                            <Table.Th>Total</Table.Th>
                            <Table.Th>Vencimento</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th style={{ width: 110 }}>Ações</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows.map(invite => {
                            const isPending = invite.status === 'pending';
                            return (
                                <Table.Tr key={invite.id}>
                                    <Table.Td>
                                        <Text size="sm" fw={500}>{invite.company_name}</Text>
                                        <Text size="xs" c="dimmed">{invite.contact_name} · {invite.email}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Stack gap={2}>
                                            {(Array.isArray(invite.items) ? invite.items : []).map((item, i) => (
                                                <Text key={i} size="xs">{item.product_name} — {item.plan_name}</Text>
                                            ))}
                                        </Stack>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm" fw={600}>
                                            {Number(invite.total_amount) > 0 ? formatCurrency(Number(invite.total_amount)) : 'Cortesia'}
                                        </Text>
                                        <Text size="xs" c="dimmed">{invite.billing_cycle === 'yearly' ? 'Anual' : 'Mensal'}</Text>
                                    </Table.Td>
                                    <Table.Td><Text size="sm">{formatDate(invite.due_date)}</Text></Table.Td>
                                    <Table.Td>
                                        {statusBadge(invite)}
                                        {invite.last_error && invite.status === 'pending' && (
                                            <Tooltip label={invite.last_error} multiline w={280}>
                                                <Text size="xs" c="red" mt={2} style={{ cursor: 'help' }}>Falha no último aceite</Text>
                                            </Tooltip>
                                        )}
                                        {invite.status === 'pending' && (
                                            <Text size="xs" c="dimmed" mt={2}>
                                                {invite.last_sent_at ? `Enviado em ${formatDate(invite.last_sent_at)}` : 'Não enviado por e-mail'}
                                            </Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap={4} wrap="nowrap">
                                            {isPending && (
                                                <CopyButton value={inviteLink(invite.token)}>
                                                    {({ copied, copy }) => (
                                                        <Tooltip label={copied ? 'Link copiado' : 'Copiar link do convite'}>
                                                            <ActionIcon size="sm" variant="subtle" color={copied ? 'teal' : 'blue'} onClick={copy}>
                                                                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                </CopyButton>
                                            )}
                                            {isPending && (
                                                <Tooltip label="Reenviar e-mail">
                                                    <ActionIcon
                                                        size="sm"
                                                        variant="subtle"
                                                        loading={resend.isPending && resend.variables === invite.id}
                                                        onClick={() => resend.mutate(invite.id)}
                                                    >
                                                        <IconMailForward size={14} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                            {isPending && (
                                                <Tooltip label="Cancelar convite">
                                                    <ActionIcon size="sm" variant="subtle" color="red" onClick={() => setCancelTarget(invite)}>
                                                        <IconX size={14} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            );
                        })}
                    </Table.Tbody>
                </Table>
            </Table.ScrollContainer>

            <Modal
                opened={!!cancelTarget}
                onClose={() => !cancel.isPending && setCancelTarget(null)}
                title={<Title order={4}>Cancelar convite</Title>}
                centered
            >
                <Stack gap="md">
                    <Text size="sm">
                        Cancelar o convite de <strong>{cancelTarget?.company_name}</strong>? O link deixa de funcionar e nenhuma cobrança será gerada.
                    </Text>
                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={() => setCancelTarget(null)} disabled={cancel.isPending}>Voltar</Button>
                        <Button color="red" loading={cancel.isPending} onClick={() => cancelTarget && cancel.mutate(cancelTarget.id)}>
                            Cancelar convite
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Card>
    );
}
