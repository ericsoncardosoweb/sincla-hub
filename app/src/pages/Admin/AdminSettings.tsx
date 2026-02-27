import { useEffect, useState, useCallback } from 'react';
import {
    Container, Title, Text, Card, Group, Badge, Stack, Skeleton,
    Table, SimpleGrid, ThemeIcon, Switch,
} from '@mantine/core';
import {
    IconPackage, IconShieldCheck, IconInfoCircle,
    IconCheck, IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../shared/lib/supabase';

// ============================
// Types
// ============================

interface Product {
    id: string;
    name: string;
    description: string | null;
    base_url: string;
    is_active: boolean;
}

interface AdminUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
}

interface PlatformInfo {
    totalProducts: number;
    activeProducts: number;
    totalAdmins: number;
    activeAdmins: number;
}

// ============================
// Helpers
// ============================

const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    support: 'Suporte',
};

const roleColors: Record<string, string> = {
    super_admin: 'red',
    admin: 'blue',
    support: 'orange',
};

// ============================
// Component
// ============================

export function AdminSettings() {
    const [products, setProducts] = useState<Product[]>([]);
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [info, setInfo] = useState<PlatformInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [prodsRes, adminsRes] = await Promise.all([
                supabase.from('products').select('id, name, description, base_url, is_active').order('name'),
                supabase.from('admin_users').select('id, email, name, role, is_active, created_at').order('created_at'),
            ]);

            const prods = prodsRes.data || [];
            const adminsData = adminsRes.data || [];

            setProducts(prods);
            setAdmins(adminsData);
            setInfo({
                totalProducts: prods.length,
                activeProducts: prods.filter(p => p.is_active).length,
                totalAdmins: adminsData.length,
                activeAdmins: adminsData.filter(a => a.is_active).length,
            });
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const toggleProduct = async (productId: string, active: boolean) => {
        try {
            const { error } = await supabase
                .from('products')
                .update({ is_active: active })
                .eq('id', productId);

            if (error) throw error;

            notifications.show({
                title: 'Sucesso',
                message: `Produto ${active ? 'ativado' : 'desativado'}`,
                color: 'green',
            });
            loadData();
        } catch (error) {
            console.error('Error toggling product:', error);
            notifications.show({
                title: 'Erro',
                message: 'Falha ao atualizar produto',
                color: 'red',
            });
        }
    };

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <div>
                    <Title order={2}>Configurações</Title>
                    <Text c="dimmed">Visão geral e configurações da plataforma Sincla Hub</Text>
                </div>

                {/* Overview KPIs */}
                {loading ? (
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                        {Array(4).fill(0).map((_, i) => <Skeleton key={i} height={90} radius="md" />)}
                    </SimpleGrid>
                ) : info && (
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="violet">
                                    <IconPackage size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Produtos</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs">{info.totalProducts}</Text>
                        </Card>
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="green">
                                    <IconCheck size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Produtos Ativos</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs" c="green">{info.activeProducts}</Text>
                        </Card>
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="blue">
                                    <IconShieldCheck size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Admins</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs">{info.totalAdmins}</Text>
                        </Card>
                        <Card withBorder padding="md" radius="md">
                            <Group gap="xs">
                                <ThemeIcon size="md" radius="md" variant="light" color="teal">
                                    <IconInfoCircle size={16} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed">Admins Ativos</Text>
                            </Group>
                            <Text size="xl" fw={700} mt="xs" c="teal">{info.activeAdmins}</Text>
                        </Card>
                    </SimpleGrid>
                )}

                {/* Products Management */}
                <Card shadow="sm" radius="md" withBorder>
                    <Group justify="space-between" mb="md">
                        <div>
                            <Title order={4}>Produtos da Plataforma</Title>
                            <Text size="sm" c="dimmed">Ative ou desative produtos do catálogo Sincla</Text>
                        </div>
                    </Group>

                    {loading ? (
                        <Stack gap="sm">
                            {[1, 2, 3].map(i => <Skeleton key={i} height={50} radius="md" />)}
                        </Stack>
                    ) : (
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Produto</Table.Th>
                                    <Table.Th>URL Base</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Ação</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {products.map(prod => (
                                    <Table.Tr key={prod.id}>
                                        <Table.Td>
                                            <div>
                                                <Text size="sm" fw={500}>{prod.name}</Text>
                                                <Text size="xs" c="dimmed">{prod.description || '—'}</Text>
                                            </div>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" c="blue" component="a" href={prod.base_url} target="_blank">
                                                {prod.base_url}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={prod.is_active ? 'green' : 'red'}
                                                variant="light"
                                                size="sm"
                                                leftSection={prod.is_active ? <IconCheck size={10} /> : <IconX size={10} />}
                                            >
                                                {prod.is_active ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Switch
                                                checked={prod.is_active}
                                                onChange={() => toggleProduct(prod.id, !prod.is_active)}
                                                size="sm"
                                            />
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}
                </Card>

                {/* Admins Overview */}
                <Card shadow="sm" radius="md" withBorder>
                    <Group justify="space-between" mb="md">
                        <div>
                            <Title order={4}>Administradores do Sistema</Title>
                            <Text size="sm" c="dimmed">
                                Visão rápida dos admins — para gerenciar, acesse a aba <strong>Admins</strong>
                            </Text>
                        </div>
                    </Group>

                    {loading ? (
                        <Stack gap="sm">
                            {[1, 2].map(i => <Skeleton key={i} height={45} radius="md" />)}
                        </Stack>
                    ) : admins.length === 0 ? (
                        <Text c="dimmed" ta="center" py="md">Nenhum administrador cadastrado.</Text>
                    ) : (
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Admin</Table.Th>
                                    <Table.Th>Cargo</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {admins.map(admin => (
                                    <Table.Tr
                                        key={admin.id}
                                        style={{ opacity: admin.is_active ? 1 : 0.5 }}
                                    >
                                        <Table.Td>
                                            <div>
                                                <Text size="sm" fw={500}>{admin.name || 'Sem nome'}</Text>
                                                <Text size="xs" c="dimmed">{admin.email}</Text>
                                            </div>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={roleColors[admin.role] || 'gray'}
                                                variant="light"
                                                size="sm"
                                            >
                                                {roleLabels[admin.role] || admin.role}
                                            </Badge>
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
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}
                </Card>
            </Stack>
        </Container>
    );
}
