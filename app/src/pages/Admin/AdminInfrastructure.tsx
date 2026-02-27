import { useEffect, useState, useCallback } from 'react';
import {
    Container, Title, Text, Card, Group, Badge, Button, Stack, Skeleton,
    Table, TextInput, Modal, NumberInput, Tabs, SimpleGrid, ThemeIcon,
    Select, Switch, ActionIcon, Menu, Paper, Center, Loader,
} from '@mantine/core';
import {
    IconSearch, IconServer, IconBuilding, IconUsers, IconBell,
    IconLayoutDashboard, IconPlus, IconEdit, IconTrash, IconDots,
    IconCreditCard, IconTrendingUp, IconCash,
    IconDatabase, IconWorld, IconCloud,
    IconEye, IconServerCog,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../shared/lib/supabase';

// ============================
// Types
// ============================

interface DashboardStats {
    totalProducts: number;
    totalSubscribers: number;
    totalCompanies: number;
    activeSubscriptions: number;
    mrr: number;
    arr: number;
    totalServers: number;
    totalSlots: number;
    externalCompanies: number;
}

interface Subscriber {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
    created_at: string;
}

interface Company {
    id: string;
    name: string;
    slug: string;
    status: string;
    external_mode: boolean;
    external_server_id: string | null;
    external_db_enabled: boolean;
    subscriber: { name: string | null; email: string } | null;
    created_at: string;
    server_name?: string;
}

interface ExternalServer {
    id: string;
    name: string;
    url: string;
    provider: string;
    region: string;
    status: string;
    max_companies: number;
    has_database: boolean;
    connected_companies: number;
    available_slots: number;
    companies_with_db: number;
    last_health_check: string | null;
    health_status: Record<string, unknown>;
    created_at: string;
    notes: string | null;
}

interface NewServer {
    name: string;
    url: string;
    provider: string;
    region: string;
    max_companies: number;
    has_database: boolean;
    db_host: string;
    db_port: number;
    db_name: string;
    notes: string;
}

// ============================
// Helpers
// ============================

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR');

const statusColors: Record<string, string> = {
    active: 'green',
    maintenance: 'yellow',
    offline: 'red',
    provisioning: 'blue',
    suspended: 'orange',
    canceled: 'red',
};

const statusLabels: Record<string, string> = {
    active: 'Ativo',
    maintenance: 'Manutenção',
    offline: 'Offline',
    provisioning: 'Provisionando',
    suspended: 'Suspenso',
    canceled: 'Cancelado',
};

// ============================
// Component
// ============================

export function AdminInfrastructure() {
    const [activeTab, setActiveTab] = useState<string | null>('overview');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);

    // Subscribers
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [subscriberSearch, setSubscriberSearch] = useState('');
    const [loadingSubscribers, setLoadingSubscribers] = useState(false);

    // Companies
    const [companies, setCompanies] = useState<Company[]>([]);
    const [companySearch, setCompanySearch] = useState('');
    const [loadingCompanies, setLoadingCompanies] = useState(false);

    // Servers
    const [servers, setServers] = useState<ExternalServer[]>([]);
    const [loadingServers, setLoadingServers] = useState(false);
    const [serverModalOpen, setServerModalOpen] = useState(false);
    const [editingServer, setEditingServer] = useState<ExternalServer | null>(null);
    const [newServer, setNewServer] = useState<NewServer>({
        name: '', url: '', provider: 'easypanel', region: 'br-south',
        max_companies: 50, has_database: false, db_host: '', db_port: 5432,
        db_name: '', notes: '',
    });

    // Company external mode modal
    const [externalModalOpen, setExternalModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

    // ============================
    // Data Loading
    // ============================

    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const [products, subs, comps, subscriptions, srvs, extComps] = await Promise.all([
                supabase.from('products').select('*', { count: 'exact', head: true }),
                supabase.from('subscribers').select('*', { count: 'exact', head: true }),
                supabase.from('companies').select('*', { count: 'exact', head: true }),
                supabase.from('subscriptions').select('monthly_amount').eq('status', 'active'),
                supabase.from('external_servers').select('id, max_companies', { count: 'exact' }),
                supabase.from('companies').select('*', { count: 'exact', head: true }).eq('external_mode', true),
            ]);

            const mrr = (subscriptions.data || []).reduce(
                (sum, sub) => sum + (sub.monthly_amount || 0), 0
            );

            const totalSlots = (srvs.data || []).reduce(
                (sum, s) => sum + (s.max_companies || 0), 0
            );

            setStats({
                totalProducts: products.count || 0,
                totalSubscribers: subs.count || 0,
                totalCompanies: comps.count || 0,
                activeSubscriptions: subscriptions.data?.length || 0,
                mrr,
                arr: mrr * 12,
                totalServers: srvs.count || 0,
                totalSlots,
                externalCompanies: extComps.count || 0,
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadSubscribers = useCallback(async () => {
        setLoadingSubscribers(true);
        try {
            let query = supabase
                .from('subscribers')
                .select('id, name, email, phone, role, created_at')
                .order('created_at', { ascending: false })
                .limit(100);

            if (subscriberSearch) {
                query = query.or(`name.ilike.%${subscriberSearch}%,email.ilike.%${subscriberSearch}%`);
            }

            const { data } = await query;
            setSubscribers(data || []);
        } catch (error) {
            console.error('Error loading subscribers:', error);
        } finally {
            setLoadingSubscribers(false);
        }
    }, [subscriberSearch]);

    const loadCompanies = useCallback(async () => {
        setLoadingCompanies(true);
        try {
            let query = supabase
                .from('companies')
                .select(`
                    id, name, slug, status, external_mode, external_server_id, 
                    external_db_enabled, created_at,
                    subscriber:subscribers!subscriber_id (name, email)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (companySearch) {
                query = query.or(`name.ilike.%${companySearch}%,slug.ilike.%${companySearch}%`);
            }

            const { data } = await query;

            // Flatten subscriber from array
            const mapped = (data || []).map((c: any) => ({
                ...c,
                subscriber: Array.isArray(c.subscriber) ? c.subscriber[0] : c.subscriber,
            }));

            setCompanies(mapped);
        } catch (error) {
            console.error('Error loading companies:', error);
        } finally {
            setLoadingCompanies(false);
        }
    }, [companySearch]);

    const loadServers = useCallback(async () => {
        setLoadingServers(true);
        try {
            const { data } = await supabase
                .from('admin_servers_overview')
                .select('*')
                .order('created_at', { ascending: false });

            setServers(data || []);
        } catch (error) {
            console.error('Error loading servers:', error);
            // Fallback if view doesn't exist yet
            const { data } = await supabase
                .from('external_servers')
                .select('*')
                .order('created_at', { ascending: false });
            setServers((data || []).map(s => ({
                ...s,
                connected_companies: 0,
                available_slots: s.max_companies,
                companies_with_db: 0,
            })));
        } finally {
            setLoadingServers(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        if (activeTab === 'users') loadSubscribers();
        if (activeTab === 'companies') loadCompanies();
        if (activeTab === 'servers') loadServers();
    }, [activeTab, loadSubscribers, loadCompanies, loadServers]);

    // ============================
    // Server CRUD
    // ============================

    const saveServer = async () => {
        try {
            const payload = {
                name: newServer.name,
                url: newServer.url,
                provider: newServer.provider,
                region: newServer.region,
                max_companies: newServer.max_companies,
                has_database: newServer.has_database,
                db_host: newServer.has_database ? newServer.db_host : null,
                db_port: newServer.has_database ? newServer.db_port : null,
                db_name: newServer.has_database ? newServer.db_name : null,
                notes: newServer.notes || null,
            };

            if (editingServer) {
                await supabase.from('external_servers').update(payload).eq('id', editingServer.id);
                notifications.show({ title: 'Sucesso', message: 'Servidor atualizado', color: 'green' });
            } else {
                await supabase.from('external_servers').insert(payload);
                notifications.show({ title: 'Sucesso', message: 'Servidor cadastrado', color: 'green' });
            }

            setServerModalOpen(false);
            setEditingServer(null);
            setNewServer({
                name: '', url: '', provider: 'easypanel', region: 'br-south',
                max_companies: 50, has_database: false, db_host: '', db_port: 5432,
                db_name: '', notes: '',
            });
            loadServers();
            loadStats();
        } catch (error) {
            console.error('Error saving server:', error);
            notifications.show({ title: 'Erro', message: 'Falha ao salvar servidor', color: 'red' });
        }
    };

    const deleteServer = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este servidor?')) return;
        try {
            await supabase.from('external_servers').delete().eq('id', id);
            notifications.show({ title: 'Sucesso', message: 'Servidor excluído', color: 'green' });
            loadServers();
            loadStats();
        } catch (error) {
            console.error('Error deleting server:', error);
        }
    };

    const openEditServer = (server: ExternalServer) => {
        setEditingServer(server);
        setNewServer({
            name: server.name,
            url: server.url,
            provider: server.provider,
            region: server.region,
            max_companies: server.max_companies,
            has_database: server.has_database,
            db_host: '',
            db_port: 5432,
            db_name: '',
            notes: server.notes || '',
        });
        setServerModalOpen(true);
    };

    // ============================
    // Company External Mode
    // ============================

    const openExternalModal = (company: Company) => {
        setSelectedCompany(company);
        setSelectedServerId(company.external_server_id);
        setExternalModalOpen(true);
    };

    const toggleExternalMode = async () => {
        if (!selectedCompany) return;
        try {
            await supabase.from('companies').update({
                external_mode: !selectedCompany.external_mode,
                external_server_id: !selectedCompany.external_mode ? selectedServerId : null,
            }).eq('id', selectedCompany.id);

            notifications.show({
                title: 'Sucesso',
                message: `Modo externo ${!selectedCompany.external_mode ? 'ativado' : 'desativado'}`,
                color: 'green',
            });
            setExternalModalOpen(false);
            loadCompanies();
            loadStats();
        } catch (error) {
            console.error('Error toggling external mode:', error);
        }
    };

    const toggleExternalDb = async (companyId: string, enabled: boolean) => {
        try {
            await supabase.from('companies').update({
                external_db_enabled: enabled,
            }).eq('id', companyId);

            notifications.show({
                title: 'Sucesso',
                message: `DB dedicado ${enabled ? 'ativado' : 'desativado'}`,
                color: 'green',
            });
            loadCompanies();
        } catch (error) {
            console.error('Error toggling external DB:', error);
        }
    };

    // ============================
    // Render: Stat Cards
    // ============================

    const renderOverview = () => {
        const statCards = [
            { icon: IconUsers, label: 'Assinantes', value: stats?.totalSubscribers, color: 'blue' },
            { icon: IconBuilding, label: 'Empresas', value: stats?.totalCompanies, color: 'violet' },
            { icon: IconCreditCard, label: 'Assinaturas Ativas', value: stats?.activeSubscriptions, color: 'orange' },
            { icon: IconTrendingUp, label: 'MRR', value: stats?.mrr ? formatCurrency(stats.mrr) : 'R$ 0', color: 'teal', isCurrency: true },
            { icon: IconCash, label: 'ARR', value: stats?.arr ? formatCurrency(stats.arr) : 'R$ 0', color: 'pink', isCurrency: true },
            { icon: IconServer, label: 'Servidores', value: stats?.totalServers, color: 'cyan' },
            { icon: IconCloud, label: 'Vagas Disponíveis', value: stats?.totalSlots, color: 'green' },
            { icon: IconWorld, label: 'Empresas Externas', value: stats?.externalCompanies, color: 'grape' },
        ];

        return (
            <Stack gap="lg">
                <SimpleGrid cols={{ base: 2, sm: 4, lg: 4 }} spacing="md">
                    {loading
                        ? Array(8).fill(0).map((_, i) => <Skeleton key={i} height={100} radius="md" />)
                        : statCards.map((stat, i) => (
                            <Card key={i} shadow="sm" padding="md" radius="md" withBorder>
                                <Group gap="xs">
                                    <ThemeIcon size="lg" radius="md" variant="light" color={stat.color}>
                                        <stat.icon size={20} />
                                    </ThemeIcon>
                                </Group>
                                <Text size="xs" c="dimmed" mt="sm">{stat.label}</Text>
                                <Text size="xl" fw={700}>
                                    {stat.isCurrency ? stat.value : (typeof stat.value === 'number' ? stat.value.toLocaleString('pt-BR') : stat.value)}
                                </Text>
                            </Card>
                        ))}
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Title order={4} mb="md">Infraestrutura</Title>
                        <Text size="sm">Gerencie servidores, empresas e dados de assinantes nas abas acima.</Text>
                        <Text size="sm" c="dimmed" mt="xs">
                            Utilize a aba <strong>Servidores</strong> para cadastrar e monitorar instâncias,
                            e a aba <strong>Empresas</strong> para gerenciar o modo externo e DB dedicado.
                        </Text>
                    </Card>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Title order={4} mb="md">Acesso Rápido</Title>
                        <Stack gap="xs">
                            <Text size="sm">• <strong>{stats?.totalServers || 0}</strong> servidores cadastrados</Text>
                            <Text size="sm">• <strong>{stats?.externalCompanies || 0}</strong> empresas em modo externo</Text>
                            <Text size="sm">• <strong>{stats?.totalSlots || 0}</strong> vagas totais disponíveis</Text>
                            <Text size="sm">• <strong>{stats?.activeSubscriptions || 0}</strong> assinaturas ativas gerando receita</Text>
                        </Stack>
                    </Card>
                </SimpleGrid>
            </Stack>
        );
    };

    // ============================
    // Render: Subscribers Tab
    // ============================

    const renderSubscribers = () => (
        <Stack gap="md">
            <Group justify="space-between">
                <Text c="dimmed">Total de usuários: {subscribers.length}</Text>
            </Group>
            <TextInput
                placeholder="Buscar por nome ou email"
                leftSection={<IconSearch size={16} />}
                value={subscriberSearch}
                onChange={(e) => setSubscriberSearch(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadSubscribers()}
            />
            {loadingSubscribers ? (
                <Center py="xl"><Loader /></Center>
            ) : (
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Nome</Table.Th>
                            <Table.Th>Email</Table.Th>
                            <Table.Th>WhatsApp</Table.Th>
                            <Table.Th>Perfil</Table.Th>
                            <Table.Th>Criado em</Table.Th>
                            <Table.Th>Ações</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {subscribers.map(sub => (
                            <Table.Tr key={sub.id}>
                                <Table.Td>{sub.name || '—'}</Table.Td>
                                <Table.Td>{sub.email}</Table.Td>
                                <Table.Td>{sub.phone || '—'}</Table.Td>
                                <Table.Td>
                                    <Badge variant="light" size="sm">
                                        {sub.role === 'admin' ? 'Admin' : 'Cliente'}
                                    </Badge>
                                </Table.Td>
                                <Table.Td>{formatDate(sub.created_at)}</Table.Td>
                                <Table.Td>
                                    <Group gap="xs">
                                        <ActionIcon variant="subtle" size="sm">
                                            <IconEye size={14} />
                                        </ActionIcon>
                                        <ActionIcon variant="subtle" size="sm">
                                            <IconEdit size={14} />
                                        </ActionIcon>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}
        </Stack>
    );

    // ============================
    // Render: Companies Tab
    // ============================

    const renderCompanies = () => (
        <Stack gap="md">
            <Group justify="space-between">
                <Text c="dimmed">Total de empresas: {companies.length}</Text>
            </Group>
            <TextInput
                placeholder="Buscar por nome ou email"
                leftSection={<IconSearch size={16} />}
                value={companySearch}
                onChange={(e) => setCompanySearch(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCompanies()}
            />
            {loadingCompanies ? (
                <Center py="xl"><Loader /></Center>
            ) : (
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Nome</Table.Th>
                            <Table.Th>Email do Dono</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Servidor</Table.Th>
                            <Table.Th>DB Dedicado</Table.Th>
                            <Table.Th>Criado em</Table.Th>
                            <Table.Th>Ações</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {companies.map(comp => (
                            <Table.Tr key={comp.id}>
                                <Table.Td fw={500}>{comp.name}</Table.Td>
                                <Table.Td>{comp.subscriber?.email || '—'}</Table.Td>
                                <Table.Td>
                                    <Badge color={statusColors[comp.status] || 'gray'} variant="light" size="sm">
                                        {comp.status === 'active' ? 'Ativa' : comp.status}
                                    </Badge>
                                </Table.Td>
                                <Table.Td>
                                    {comp.external_mode ? (
                                        <Badge color="cyan" variant="light" size="sm" leftSection={<IconServer size={10} />}>
                                            Externo
                                        </Badge>
                                    ) : (
                                        <Badge color="gray" variant="light" size="sm">
                                            Compartilhado
                                        </Badge>
                                    )}
                                </Table.Td>
                                <Table.Td>
                                    {comp.external_db_enabled ? (
                                        <Badge color="green" variant="light" size="sm" leftSection={<IconDatabase size={10} />}>
                                            Ativo
                                        </Badge>
                                    ) : (
                                        <Text size="sm" c="dimmed">—</Text>
                                    )}
                                </Table.Td>
                                <Table.Td>{formatDate(comp.created_at)}</Table.Td>
                                <Table.Td>
                                    <Menu position="bottom-end" withArrow>
                                        <Menu.Target>
                                            <ActionIcon variant="subtle" size="sm">
                                                <IconDots size={14} />
                                            </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            <Menu.Item
                                                leftSection={<IconServerCog size={14} />}
                                                onClick={() => openExternalModal(comp)}
                                            >
                                                Configurar Servidor
                                            </Menu.Item>
                                            <Menu.Item
                                                leftSection={<IconDatabase size={14} />}
                                                onClick={() => toggleExternalDb(comp.id, !comp.external_db_enabled)}
                                                disabled={!comp.external_mode}
                                            >
                                                {comp.external_db_enabled ? 'Desativar' : 'Ativar'} DB Dedicado
                                            </Menu.Item>
                                            <Menu.Item leftSection={<IconEye size={14} />}>
                                                Ver Detalhes
                                            </Menu.Item>
                                        </Menu.Dropdown>
                                    </Menu>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}
        </Stack>
    );

    // ============================
    // Render: Servers Tab
    // ============================

    const totalSlots = servers.reduce((sum, s) => sum + s.available_slots, 0);

    const renderServers = () => (
        <Stack gap="md">
            <Group justify="space-between">
                <div>
                    <Text c="dimmed">Total de servidores: {servers.length}</Text>
                    <Text fw={700}>Vagas disponíveis: {totalSlots} conexões</Text>
                </div>
                <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => {
                        setEditingServer(null);
                        setNewServer({
                            name: '', url: '', provider: 'easypanel', region: 'br-south',
                            max_companies: 50, has_database: false, db_host: '', db_port: 5432,
                            db_name: '', notes: '',
                        });
                        setServerModalOpen(true);
                    }}
                >
                    Cadastrar Servidor
                </Button>
            </Group>

            {loadingServers ? (
                <Center py="xl"><Loader /></Center>
            ) : (
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Nome</Table.Th>
                            <Table.Th>URL</Table.Th>
                            <Table.Th>Conexões</Table.Th>
                            <Table.Th>Vagas Disponíveis</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Criado em</Table.Th>
                            <Table.Th>Ações</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {servers.map(server => (
                            <Table.Tr key={server.id}>
                                <Table.Td fw={500}>{server.name}</Table.Td>
                                <Table.Td>
                                    <Text size="sm" c="blue" component="a" href={server.url} target="_blank">
                                        {server.url}
                                    </Text>
                                </Table.Td>
                                <Table.Td>
                                    <Badge variant="light" color="blue">
                                        {server.connected_companies} conexões
                                    </Badge>
                                </Table.Td>
                                <Table.Td>
                                    <Badge
                                        variant="light"
                                        color={server.available_slots > 20 ? 'green' : server.available_slots > 5 ? 'yellow' : 'red'}
                                    >
                                        {server.available_slots} vagas
                                    </Badge>
                                </Table.Td>
                                <Table.Td>
                                    <Badge color={statusColors[server.status] || 'gray'} variant="light" size="sm">
                                        {statusLabels[server.status] || server.status}
                                    </Badge>
                                </Table.Td>
                                <Table.Td>{formatDate(server.created_at)}</Table.Td>
                                <Table.Td>
                                    <Group gap="xs">
                                        <ActionIcon
                                            variant="subtle"
                                            size="sm"
                                            onClick={() => openEditServer(server)}
                                        >
                                            <IconEdit size={14} />
                                        </ActionIcon>
                                        <ActionIcon
                                            variant="subtle"
                                            size="sm"
                                            color="red"
                                            onClick={() => deleteServer(server.id)}
                                            disabled={server.connected_companies > 0}
                                        >
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                        {servers.length === 0 && (
                            <Table.Tr>
                                <Table.Td colSpan={7}>
                                    <Center py="lg">
                                        <Text c="dimmed">Nenhum servidor cadastrado</Text>
                                    </Center>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            )}
        </Stack>
    );

    // ============================
    // Render: Notices Tab (placeholder)
    // ============================

    const renderNotices = () => (
        <Stack gap="md">
            <Card shadow="sm" padding="lg" radius="md">
                <Center py="xl">
                    <Stack align="center" gap="sm">
                        <ThemeIcon size={48} radius="md" variant="light" color="gray">
                            <IconBell size={24} />
                        </ThemeIcon>
                        <Title order={4}>Avisos do Sistema</Title>
                        <Text c="dimmed" size="sm">Em breve: avisos e notificações para os clientes</Text>
                    </Stack>
                </Center>
            </Card>
        </Stack>
    );

    // ============================
    // Render: Main
    // ============================

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <div>
                    <Title order={2}>Área Administrativa</Title>
                    <Text c="dimmed">Gerencie usuários e configurações do sistema</Text>
                </div>

                <Tabs value={activeTab} onChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Tab value="overview" leftSection={<IconLayoutDashboard size={16} />}>
                            Visão Geral
                        </Tabs.Tab>
                        <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
                            Usuários
                        </Tabs.Tab>
                        <Tabs.Tab value="companies" leftSection={<IconBuilding size={16} />}>
                            Empresas
                        </Tabs.Tab>
                        <Tabs.Tab value="servers" leftSection={<IconServer size={16} />}>
                            Servidores
                        </Tabs.Tab>
                        <Tabs.Tab value="notices" leftSection={<IconBell size={16} />}>
                            Avisos
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="overview" pt="md">
                        {renderOverview()}
                    </Tabs.Panel>
                    <Tabs.Panel value="users" pt="md">
                        {renderSubscribers()}
                    </Tabs.Panel>
                    <Tabs.Panel value="companies" pt="md">
                        {renderCompanies()}
                    </Tabs.Panel>
                    <Tabs.Panel value="servers" pt="md">
                        {renderServers()}
                    </Tabs.Panel>
                    <Tabs.Panel value="notices" pt="md">
                        {renderNotices()}
                    </Tabs.Panel>
                </Tabs>
            </Stack>

            {/* ============================
                Modal: Cadastrar/Editar Servidor
                ============================ */}
            <Modal
                opened={serverModalOpen}
                onClose={() => { setServerModalOpen(false); setEditingServer(null); }}
                title={editingServer ? 'Editar Servidor' : 'Cadastrar Servidor'}
                size="lg"
            >
                <Stack gap="md">
                    <TextInput
                        label="Nome"
                        placeholder="Servidor Premium 01"
                        required
                        value={newServer.name}
                        onChange={(e) => setNewServer({ ...newServer, name: e.currentTarget.value })}
                    />
                    <TextInput
                        label="URL"
                        placeholder="https://sincla-srv01.easypanel.host"
                        required
                        value={newServer.url}
                        onChange={(e) => setNewServer({ ...newServer, url: e.currentTarget.value })}
                    />
                    <Group grow>
                        <Select
                            label="Provider"
                            data={[
                                { value: 'easypanel', label: 'Easypanel' },
                                { value: 'aws', label: 'AWS' },
                                { value: 'gcp', label: 'GCP' },
                                { value: 'azure', label: 'Azure' },
                                { value: 'other', label: 'Outro' },
                            ]}
                            value={newServer.provider}
                            onChange={(v) => setNewServer({ ...newServer, provider: v || 'easypanel' })}
                        />
                        <Select
                            label="Região"
                            data={[
                                { value: 'br-south', label: 'Brasil Sul' },
                                { value: 'br-southeast', label: 'Brasil Sudeste' },
                                { value: 'us-east', label: 'US East' },
                                { value: 'eu-west', label: 'EU West' },
                            ]}
                            value={newServer.region}
                            onChange={(v) => setNewServer({ ...newServer, region: v || 'br-south' })}
                        />
                    </Group>
                    <NumberInput
                        label="Máximo de empresas"
                        min={1}
                        max={500}
                        value={newServer.max_companies}
                        onChange={(v) => setNewServer({ ...newServer, max_companies: Number(v) || 50 })}
                    />
                    <Switch
                        label="Servidor possui banco de dados dedicado"
                        checked={newServer.has_database}
                        onChange={(e) => setNewServer({ ...newServer, has_database: e.currentTarget.checked })}
                    />
                    {newServer.has_database && (
                        <Paper p="md" withBorder>
                            <Stack gap="sm">
                                <Text size="sm" fw={500}>Configuração do Banco</Text>
                                <TextInput
                                    label="Host"
                                    placeholder="db.servidor.com"
                                    value={newServer.db_host}
                                    onChange={(e) => setNewServer({ ...newServer, db_host: e.currentTarget.value })}
                                />
                                <Group grow>
                                    <NumberInput
                                        label="Porta"
                                        value={newServer.db_port}
                                        onChange={(v) => setNewServer({ ...newServer, db_port: Number(v) || 5432 })}
                                    />
                                    <TextInput
                                        label="Database"
                                        placeholder="sincla_external"
                                        value={newServer.db_name}
                                        onChange={(e) => setNewServer({ ...newServer, db_name: e.currentTarget.value })}
                                    />
                                </Group>
                            </Stack>
                        </Paper>
                    )}
                    <TextInput
                        label="Notas (opcional)"
                        placeholder="Observações sobre este servidor"
                        value={newServer.notes}
                        onChange={(e) => setNewServer({ ...newServer, notes: e.currentTarget.value })}
                    />
                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={() => { setServerModalOpen(false); setEditingServer(null); }}>
                            Cancelar
                        </Button>
                        <Button onClick={saveServer} disabled={!newServer.name || !newServer.url}>
                            {editingServer ? 'Salvar Alterações' : 'Cadastrar'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* ============================
                Modal: Configurar Servidor Externo da Empresa
                ============================ */}
            <Modal
                opened={externalModalOpen}
                onClose={() => setExternalModalOpen(false)}
                title={`Configurar Servidor — ${selectedCompany?.name}`}
                size="md"
            >
                <Stack gap="md">
                    <Text size="sm">
                        Ative o modo externo para direcionar esta empresa a um servidor dedicado.
                    </Text>

                    <Select
                        label="Servidor Externo"
                        placeholder="Selecione um servidor"
                        data={servers.map(s => ({
                            value: s.id,
                            label: `${s.name} (${s.available_slots} vagas)`,
                            disabled: s.available_slots <= 0 && s.id !== selectedCompany?.external_server_id,
                        }))}
                        value={selectedServerId}
                        onChange={setSelectedServerId}
                        clearable
                    />

                    <Paper p="md" withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text fw={500}>Modo Externo</Text>
                                <Text size="xs" c="dimmed">
                                    {selectedCompany?.external_mode
                                        ? 'Esta empresa está usando servidor dedicado'
                                        : 'Esta empresa está no servidor compartilhado'}
                                </Text>
                            </div>
                            <Badge
                                color={selectedCompany?.external_mode ? 'cyan' : 'gray'}
                                variant="light"
                            >
                                {selectedCompany?.external_mode ? 'Ativo' : 'Inativo'}
                            </Badge>
                        </Group>
                    </Paper>

                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={() => setExternalModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            color={selectedCompany?.external_mode ? 'orange' : 'blue'}
                            onClick={toggleExternalMode}
                            disabled={!selectedCompany?.external_mode && !selectedServerId}
                        >
                            {selectedCompany?.external_mode ? 'Desativar Modo Externo' : 'Ativar Modo Externo'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}
