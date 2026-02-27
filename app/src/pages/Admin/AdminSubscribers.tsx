import { useEffect, useState, useCallback } from 'react';
import {
    Container, Title, Text, Card, Group, Badge, Stack, Skeleton,
    Table, Avatar, TextInput, SimpleGrid, ThemeIcon, Collapse, Box,
} from '@mantine/core';
import {
    IconSearch, IconUsers, IconBuilding, IconUserPlus,
    IconChevronDown, IconChevronRight, IconPhone,
} from '@tabler/icons-react';
import { supabase } from '../../shared/lib/supabase';

// ============================
// Types
// ============================

interface SubscriberRow {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    cpf_cnpj: string | null;
    avatar_url: string | null;
    created_at: string;
    companies?: { id: string; name: string; slug: string; status: string }[];
}

interface OverviewStats {
    total: number;
    thisMonth: number;
    withCompany: number;
    withoutCompany: number;
}

// ============================
// Helpers
// ============================

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR');

// ============================
// Component
// ============================

export function AdminSubscribers() {
    const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

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

            // Load companies for all subscribers
            const subIds = subs.map(s => s.id);
            let companiesMap: Record<string, { id: string; name: string; slug: string; status: string }[]> = {};

            if (subIds.length > 0) {
                const { data: comps } = await supabase
                    .from('companies')
                    .select('id, name, slug, status, subscriber_id')
                    .in('subscriber_id', subIds);

                (comps || []).forEach((c: any) => {
                    if (!companiesMap[c.subscriber_id]) companiesMap[c.subscriber_id] = [];
                    companiesMap[c.subscriber_id].push({ id: c.id, name: c.name, slug: c.slug, status: c.status });
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

    useEffect(() => {
        loadData();
    }, []);

    const handleSearch = () => {
        loadData();
    };

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <div>
                    <Title order={2}>Assinantes</Title>
                    <Text c="dimmed">Todos os usuários cadastrados na plataforma Sincla Hub</Text>
                </div>

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
                                    <Table.Th>Cadastro</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {subscribers.map(sub => (
                                    <>
                                        <Table.Tr
                                            key={sub.id}
                                            style={{ cursor: (sub.companies?.length || 0) > 0 ? 'pointer' : 'default' }}
                                            onClick={() => {
                                                if ((sub.companies?.length || 0) > 0) {
                                                    setExpandedId(expandedId === sub.id ? null : sub.id);
                                                }
                                            }}
                                        >
                                            <Table.Td>
                                                {(sub.companies?.length || 0) > 0 && (
                                                    expandedId === sub.id
                                                        ? <IconChevronDown size={14} />
                                                        : <IconChevronRight size={14} />
                                                )}
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
                                                <Text size="sm">{formatDate(sub.created_at)}</Text>
                                            </Table.Td>
                                        </Table.Tr>
                                        {(sub.companies?.length || 0) > 0 && (
                                            <Table.Tr key={`${sub.id}-details`}>
                                                <Table.Td colSpan={6} p={0}>
                                                    <Collapse in={expandedId === sub.id}>
                                                        <Box px="xl" py="sm" bg="var(--mantine-color-gray-0)">
                                                            <Text size="xs" fw={600} mb="xs" c="dimmed">
                                                                Empresas de {sub.name || sub.email}:
                                                            </Text>
                                                            <Group gap="sm">
                                                                {sub.companies!.map(c => (
                                                                    <Badge
                                                                        key={c.id}
                                                                        variant="light"
                                                                        color={c.status === 'active' ? 'green' : 'red'}
                                                                        size="md"
                                                                    >
                                                                        <IconBuilding size={10} style={{ marginRight: 4 }} />
                                                                        {c.name}
                                                                    </Badge>
                                                                ))}
                                                            </Group>
                                                        </Box>
                                                    </Collapse>
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
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
        </Container>
    );
}
