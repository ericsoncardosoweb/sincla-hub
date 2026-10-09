import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Alert, Badge, Button, Card, Group, SimpleGrid, Skeleton, Stack, Switch, Table, Text, ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconRefresh, IconUsersGroup } from '@tabler/icons-react';
import { supabase } from '../../../shared/lib/supabase';

interface SyncRule {
    id: string;
    enabled: boolean;
    revoke_on_inactive: boolean;
}

interface PendingPerson {
    person_id: string;
    name: string | null;
    job_title: string | null;
    team_name: string | null;
}

interface PeopleSyncState {
    rule: SyncRule | null;
    people: number;
    linkedEad: number;
    queued: number;
    errors: number;
    lastError: string | null;
    pending: PendingPerson[];
    pendingTotal: number;
}

const SOURCE = 'rh';
const TARGET = 'ead';

async function loadPeopleSync(companyId: string): Promise<PeopleSyncState> {
    const { data: rule, error: ruleError } = await supabase
        .from('company_people_sync_rules')
        .select('id, enabled, revoke_on_inactive')
        .eq('company_id', companyId)
        .eq('source_product', SOURCE)
        .eq('target_product', TARGET)
        .maybeSingle();
    if (ruleError) throw ruleError;

    if (!rule) {
        return { rule: null, people: 0, linkedEad: 0, queued: 0, errors: 0, lastError: null, pending: [], pendingTotal: 0 };
    }

    const [people, linkedEad, queued, errors, lastError, pending] = await Promise.all([
        supabase.from('company_people').select('id', { count: 'exact', head: true })
            .eq('company_id', companyId).eq('status', 'active'),
        supabase.from('company_person_links').select('id', { count: 'exact', head: true })
            .eq('company_id', companyId).eq('product_id', TARGET),
        supabase.from('people_sync_outbox').select('id', { count: 'exact', head: true })
            .eq('company_id', companyId).in('status', ['pending', 'processing']),
        supabase.from('people_sync_outbox').select('id', { count: 'exact', head: true })
            .eq('company_id', companyId).eq('status', 'error'),
        supabase.from('people_sync_outbox').select('last_error')
            .eq('company_id', companyId).eq('status', 'error')
            .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('company_people_sync_pending').select('person_id, name, job_title, team_name', { count: 'exact' })
            .eq('company_id', companyId).eq('target_product', TARGET)
            .order('name').limit(10),
    ]);

    const failed = [people, linkedEad, queued, errors, lastError, pending].find((r) => r.error);
    if (failed?.error) throw failed.error;

    return {
        rule: rule as SyncRule,
        people: people.count ?? 0,
        linkedEad: linkedEad.count ?? 0,
        queued: queued.count ?? 0,
        errors: errors.count ?? 0,
        lastError: (lastError.data as { last_error: string | null } | null)?.last_error ?? null,
        pending: (pending.data ?? []) as PendingPerson[],
        pendingTotal: pending.count ?? 0,
    };
}

export function PeopleSyncCard({ companyId }: { companyId: string }) {
    const queryClient = useQueryClient();
    const queryKey = ['people-sync', companyId];

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey,
        queryFn: () => loadPeopleSync(companyId),
        refetchInterval: (query) => ((query.state.data?.queued ?? 0) > 0 ? 5000 : false),
    });

    const updateRule = useMutation({
        mutationFn: async (patch: Partial<Pick<SyncRule, 'enabled' | 'revoke_on_inactive'>>) => {
            if (!data?.rule) return;
            const { error } = await supabase.from('company_people_sync_rules').update(patch).eq('id', data.rule.id);
            if (error) throw error;
        },
        onSuccess: () => {
            notifications.show({ title: 'Sincla RH → Sincla EAD', message: 'Configuração salva', color: 'green' });
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (err: Error) => notifications.show({ title: 'Erro', message: err.message, color: 'red' }),
    });

    const resync = useMutation({
        mutationFn: async () => {
            const { data: count, error } = await supabase.rpc('queue_company_people_sync', {
                p_company_id: companyId, p_source: SOURCE, p_target: TARGET,
            });
            if (error) throw error;
            return count as number;
        },
        onSuccess: (count) => {
            notifications.show({
                title: 'Sincronização agendada',
                message: `${count} colaborador(es) serão conferidos no EAD.`,
                color: 'green',
            });
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (err: Error) => notifications.show({ title: 'Erro', message: err.message, color: 'red' }),
    });

    const rule = data?.rule;

    return (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" align="flex-start" wrap="wrap" mb="md">
                <Group gap="md" align="flex-start" wrap="nowrap">
                    <ThemeIcon size={40} radius="md" variant="light" color="blue">
                        <IconUsersGroup size={20} />
                    </ThemeIcon>
                    <div>
                        <Group gap="xs">
                            <Text fw={600}>Sincla RH → Sincla EAD</Text>
                            {rule?.enabled && <Badge color="green" variant="light" size="sm">Automática</Badge>}
                        </Group>
                        <Text size="sm" c="dimmed" mt={4}>
                            Colaboradores do RH viram alunos no EAD automaticamente. Nome, e-mail, CPF, WhatsApp,
                            cargo e equipe ficam iguais nas duas ferramentas.
                        </Text>
                    </div>
                </Group>
                {isLoading ? (
                    <Skeleton height={24} width={48} />
                ) : rule ? (
                    <Switch
                        checked={rule.enabled}
                        disabled={updateRule.isPending}
                        onChange={(e) => updateRule.mutate({ enabled: e.currentTarget.checked })}
                        aria-label="Sincronização automática RH → EAD"
                    />
                ) : null}
            </Group>

            {isLoading ? (
                <Skeleton height={80} radius="md" />
            ) : isError ? (
                <Alert color="red" icon={<IconAlertCircle size={16} />}>
                    <Group justify="space-between" wrap="wrap">
                        <Text size="sm">Não foi possível carregar a sincronização.</Text>
                        <Button size="xs" variant="light" color="red" onClick={() => refetch()}>Tentar de novo</Button>
                    </Group>
                </Alert>
            ) : !rule ? (
                <Text size="sm" c="dimmed">
                    Disponível para empresas com assinaturas ativas de <strong>Sincla RH</strong> e{' '}
                    <strong>Sincla EAD</strong>. Ao contratar as duas, a sincronização já começa ligada.
                </Text>
            ) : (
                <Stack gap="md">
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                        <Stat label="Colaboradores ativos" value={data.people} />
                        <Stat label="No EAD" value={data.linkedEad} />
                        <Stat label="Na fila" value={data.queued} color={data.queued ? 'blue' : undefined} />
                        <Stat label="Com erro" value={data.errors} color={data.errors ? 'red' : undefined} />
                    </SimpleGrid>

                    <Switch
                        label="Remover o acesso ao EAD quando o colaborador for desligado no RH"
                        description="Histórico, matrículas e certificados continuam guardados."
                        checked={rule.revoke_on_inactive}
                        disabled={updateRule.isPending || !rule.enabled}
                        onChange={(e) => updateRule.mutate({ revoke_on_inactive: e.currentTarget.checked })}
                    />

                    {data.errors > 0 && data.lastError && (
                        <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />} title="Último erro">
                            <Text size="sm">{data.lastError}</Text>
                            <Text size="xs" c="dimmed" mt={4}>Tentamos de novo automaticamente.</Text>
                        </Alert>
                    )}

                    {data.pendingTotal > 0 && (
                        <Alert color="yellow" variant="light" icon={<IconAlertCircle size={16} />}
                            title={`${data.pendingTotal} colaborador(es) sem e-mail não foram para o EAD`}>
                            <Text size="sm" mb="xs">
                                Cadastre o e-mail no Sincla RH e a pessoa entra no EAD sozinha.
                            </Text>
                            <Table fz="sm" verticalSpacing={4}>
                                <Table.Tbody>
                                    {data.pending.map((p) => (
                                        <Table.Tr key={p.person_id}>
                                            <Table.Td>{p.name || 'Sem nome'}</Table.Td>
                                            <Table.Td c="dimmed" visibleFrom="sm">
                                                {[p.job_title, p.team_name].filter(Boolean).join(' · ')}
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                            {data.pendingTotal > data.pending.length && (
                                <Text size="xs" c="dimmed" mt={4}>
                                    e mais {data.pendingTotal - data.pending.length}.
                                </Text>
                            )}
                        </Alert>
                    )}

                    <Group>
                        <Button
                            variant="light"
                            size="xs"
                            leftSection={<IconRefresh size={14} />}
                            loading={resync.isPending}
                            disabled={!rule.enabled}
                            onClick={() => resync.mutate()}
                        >
                            Conferir todos agora
                        </Button>
                    </Group>
                </Stack>
            )}
        </Card>
    );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
    return (
        <Card withBorder padding="sm" radius="md">
            <Text size="xs" c="dimmed">{label}</Text>
            <Text size="lg" fw={700} c={color}>{value}</Text>
        </Card>
    );
}
