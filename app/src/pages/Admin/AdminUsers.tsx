import { useEffect, useState } from 'react';
import {
    Container, Title, Text, Card, Group, Badge, Button, Stack, Skeleton,
    Table, Avatar, TextInput, Modal, Alert, SimpleGrid, ThemeIcon,
} from '@mantine/core';
import {
    IconSearch, IconPlus, IconTrash, IconShieldCheck, IconUserShield,
    IconCheck, IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';

interface AdminUser {
    id: string;
    email: string;
    is_active: boolean;
    created_at: string;
    subscriber?: {
        name: string | null;
        email: string;
        avatar_url: string | null;
    };
}

export function AdminUsers() {
    const { subscriber } = useAuth();
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [adding, setAdding] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [reactivatingId, setReactivatingId] = useState<string | null>(null);

    useEffect(() => {
        loadAdmins();
    }, []);

    const loadAdmins = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('admin_users')
                .select(`
                    id, email, is_active, created_at,
                    subscriber:subscribers!id (name, email, avatar_url)
                `)
                .order('created_at', { ascending: true });

            const adminsData = (data || []).map((a: any) => ({
                ...a,
                subscriber: Array.isArray(a.subscriber) ? a.subscriber[0] : a.subscriber,
            }));
            setAdmins(adminsData);
        } catch (error) {
            console.error('Error loading admins:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAdmin = async () => {
        if (!newAdminEmail.trim()) return;
        setAdding(true);
        try {
            const { data: sub } = await supabase
                .from('subscribers')
                .select('id, email')
                .eq('email', newAdminEmail.trim())
                .single();

            if (!sub) {
                notifications.show({
                    title: 'Usuário não encontrado',
                    message: 'Nenhum subscriber com esse email.',
                    color: 'red',
                });
                return;
            }

            const existingAdmin = admins.find(a => a.id === sub.id);
            if (existingAdmin) {
                if (!existingAdmin.is_active) {
                    // Reactivate
                    const { error } = await supabase
                        .from('admin_users')
                        .update({ is_active: true })
                        .eq('id', sub.id);
                    if (error) throw error;
                    notifications.show({
                        title: 'Admin reativado',
                        message: `${sub.email} foi reativado como administrador.`,
                        color: 'green',
                    });
                } else {
                    notifications.show({
                        title: 'Já é admin',
                        message: 'Esse usuário já é administrador ativo.',
                        color: 'orange',
                    });
                }
                setShowAddModal(false);
                setNewAdminEmail('');
                loadAdmins();
                return;
            }

            const { error } = await supabase
                .from('admin_users')
                .insert({
                    id: sub.id,
                    email: sub.email,
                    is_active: true,
                });

            if (error) throw error;

            notifications.show({
                title: 'Admin adicionado',
                message: `${sub.email} agora é administrador.`,
                color: 'green',
            });

            setShowAddModal(false);
            setNewAdminEmail('');
            loadAdmins();
        } catch (error) {
            console.error('Error adding admin:', error);
            notifications.show({
                title: 'Erro',
                message: 'Não foi possível adicionar o admin.',
                color: 'red',
            });
        } finally {
            setAdding(false);
        }
    };

    const handleToggleAdmin = async (adminId: string, activate: boolean) => {
        if (adminId === subscriber?.id && !activate) {
            notifications.show({
                title: 'Ação não permitida',
                message: 'Você não pode desativar a si mesmo.',
                color: 'red',
            });
            return;
        }

        if (!activate && !confirm('Tem certeza que deseja desativar este administrador?')) return;

        activate ? setReactivatingId(adminId) : setRemovingId(adminId);
        try {
            const { error } = await supabase
                .from('admin_users')
                .update({ is_active: activate })
                .eq('id', adminId);

            if (error) throw error;

            notifications.show({
                title: activate ? 'Admin reativado' : 'Admin desativado',
                message: activate
                    ? 'O administrador foi reativado com sucesso.'
                    : 'O administrador foi desativado.',
                color: 'green',
            });

            loadAdmins();
        } catch (error) {
            console.error('Error toggling admin:', error);
        } finally {
            setRemovingId(null);
            setReactivatingId(null);
        }
    };

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('pt-BR');

    const activeAdmins = admins.filter(a => a.is_active);
    const inactiveAdmins = admins.filter(a => !a.is_active);

    const filteredAdmins = admins
        .filter(a => {
            if (statusFilter === 'active') return a.is_active;
            if (statusFilter === 'inactive') return !a.is_active;
            return true;
        })
        .filter(a =>
            (a.subscriber?.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (a.email || '').toLowerCase().includes(search.toLowerCase())
        );

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <Group justify="space-between">
                    <div>
                        <Title order={2}>Administradores</Title>
                        <Text c="dimmed">Gerencie os usuários com acesso ao painel master</Text>
                    </div>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={() => setShowAddModal(true)}
                    >
                        Adicionar Admin
                    </Button>
                </Group>

                {/* KPIs */}
                {!loading && (
                    <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="blue">
                                    <IconUserShield size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Total Admins</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs">{admins.length}</Text>
                        </Card>
                        <Card withBorder padding="md" radius="md"
                            style={{ cursor: 'pointer', border: statusFilter === 'active' ? '2px solid var(--mantine-color-green-5)' : undefined }}
                            onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
                        >
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="green">
                                    <IconCheck size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Ativos</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs" c="green">{activeAdmins.length}</Text>
                        </Card>
                        <Card withBorder padding="md" radius="md"
                            style={{ cursor: 'pointer', border: statusFilter === 'inactive' ? '2px solid var(--mantine-color-red-5)' : undefined }}
                            onClick={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')}
                        >
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="red">
                                    <IconX size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Inativos</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs" c="red">{inactiveAdmins.length}</Text>
                        </Card>
                    </SimpleGrid>
                )}

                {/* Search */}
                <TextInput
                    placeholder="Buscar por nome ou email..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                />

                {/* Table */}
                {loading ? (
                    <Stack gap="sm">
                        {[1, 2].map(i => <Skeleton key={i} height={55} radius="md" />)}
                    </Stack>
                ) : filteredAdmins.length === 0 ? (
                    <Card shadow="sm" padding="xl" radius="md" withBorder>
                        <Text ta="center" c="dimmed">Nenhum administrador encontrado.</Text>
                    </Card>
                ) : (
                    <Card shadow="sm" padding={0} radius="md" withBorder>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Administrador</Table.Th>
                                    <Table.Th>Email</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Desde</Table.Th>
                                    <Table.Th>Ações</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filteredAdmins.map(admin => (
                                    <Table.Tr key={admin.id} style={{ opacity: admin.is_active ? 1 : 0.6 }}>
                                        <Table.Td>
                                            <Group gap="sm">
                                                <Avatar
                                                    radius="xl"
                                                    size="sm"
                                                    src={admin.subscriber?.avatar_url}
                                                    color={admin.is_active ? 'blue' : 'gray'}
                                                >
                                                    {(admin.subscriber?.name || admin.email || '?').charAt(0).toUpperCase()}
                                                </Avatar>
                                                <div>
                                                    <Text size="sm" fw={500}>
                                                        {admin.subscriber?.name || 'Sem nome'}
                                                        {admin.id === subscriber?.id && (
                                                            <Badge size="xs" variant="light" color="blue" ml="xs">Você</Badge>
                                                        )}
                                                    </Text>
                                                </div>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" c="dimmed">{admin.email}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={admin.is_active ? 'green' : 'red'}
                                                variant="light"
                                                size="sm"
                                            >
                                                {admin.is_active ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{formatDate(admin.created_at)}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            {admin.id !== subscriber?.id && (
                                                admin.is_active ? (
                                                    <Button
                                                        variant="subtle"
                                                        color="red"
                                                        size="xs"
                                                        leftSection={<IconTrash size={14} />}
                                                        loading={removingId === admin.id}
                                                        onClick={() => handleToggleAdmin(admin.id, false)}
                                                    >
                                                        Desativar
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="subtle"
                                                        color="green"
                                                        size="xs"
                                                        leftSection={<IconCheck size={14} />}
                                                        loading={reactivatingId === admin.id}
                                                        onClick={() => handleToggleAdmin(admin.id, true)}
                                                    >
                                                        Reativar
                                                    </Button>
                                                )
                                            )}
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                )}

                {/* Add Admin Modal */}
                <Modal
                    opened={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    title="Adicionar Administrador"
                    centered
                >
                    <Stack gap="md">
                        <Alert color="blue" variant="light" icon={<IconShieldCheck size={18} />}>
                            O usuário precisa já ter uma conta no Sincla Hub. Insira o email cadastrado.
                        </Alert>
                        <TextInput
                            label="Email do Usuário"
                            placeholder="usuario@email.com"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.currentTarget.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
                        />
                        <Button
                            fullWidth
                            onClick={handleAddAdmin}
                            loading={adding}
                        >
                            Adicionar como Admin
                        </Button>
                    </Stack>
                </Modal>
            </Stack>
        </Container>
    );
}
