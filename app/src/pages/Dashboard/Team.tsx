import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Text,
    Table,
    Button,
    Group,
    Badge,
    Modal,
    TextInput,
    Select,
    Stack,
    ActionIcon,
    Avatar,
    Menu,
    rem,
    Divider,
    Radio,
    Paper,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconTrash, IconDotsVertical, IconMail, IconSearch, IconUsers, IconShieldCheck, IconRefresh } from '@tabler/icons-react';
import { useAuth, useCompany } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { PageHeader, EmptyState } from '../../components/shared';

interface TeamMember {
    id: string;
    user_id: string;
    role: 'owner' | 'admin' | 'manager' | 'member';
    user_type: string;
    created_at: string;
    user: {
        id: string;
        email: string;
        name: string | null;
        avatar_url: string | null;
    };
}

interface Product {
    id: string;
    name: string;
    icon: string | null;
}

const roleColors: Record<string, string> = {
    owner: 'red',
    admin: 'blue',
    manager: 'green',
    member: 'gray',
};

const roleLabels: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    manager: 'Gerente',
    member: 'Membro',
};

const roleDescriptions: Record<string, string> = {
    admin: 'Acesso total, inclusive aos meios de pagamento das assinaturas',
    manager: 'Acesso parcial, exceto para a gestão das assinaturas e empresa',
    member: 'Acesso aos recursos básicos das ferramentas ou modo leitura',
};

const userTypeLabels: Record<string, string> = {
    collaborator: 'Colaborador',
    manager: 'Gestor',
    external: 'Externo',
    student: 'Aluno',
    customer: 'Cliente',
};

const userTypeColors: Record<string, string> = {
    collaborator: 'blue',
    manager: 'violet',
    external: 'orange',
    student: 'teal',
    customer: 'pink',
};

export function Team() {
    const navigate = useNavigate();
    const { currentCompany, subscriber } = useAuth();
    const { isOwner, isAdmin } = useCompany();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [_loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [toolPermissions, setToolPermissions] = useState<Record<string, 'basic' | 'advanced'>>({});

    const form = useForm({
        initialValues: {
            email: '',
            role: 'member',
            user_type: 'collaborator',
        },
    });

    useEffect(() => {
        if (currentCompany) {
            loadMembers();
            loadProducts();
        }
    }, [currentCompany]);

    const loadMembers = async () => {
        if (!currentCompany) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('company_members')
                .select(`
          id,
          user_id,
          role,
          user_type,
          created_at,
          user:subscribers!company_members_user_id_fkey (
            id,
            email,
            name,
            avatar_url
          )
        `)
                .eq('company_id', currentCompany.id)
                .order('created_at');

            if (error) throw error;

            // Filtrar membros com user null (subscriber ausente ou RLS bloqueado)
            const validMembers = (data || []).filter((m: any) => m.user !== null);
            setMembers(validMembers as unknown as TeamMember[]);
        } catch (error) {
            console.error('Error loading members:', error);
            notifications.show({
                title: 'Erro',
                message: 'Não foi possível carregar os membros',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async () => {
        if (!currentCompany) return;
        // Carregar apenas produtos com assinatura ativa nesta empresa
        const { data: subs } = await supabase
            .from('subscriptions')
            .select('product_id, product:products!product_id (id, name, icon)')
            .eq('company_id', currentCompany.id)
            .in('status', ['active', 'trial']);

        const prods = (subs || [])
            .map((s: any) => (Array.isArray(s.product) ? s.product[0] : s.product))
            .filter(Boolean);
        setProducts(prods as Product[]);
    };

    const initToolPermissions = (memberSettings?: Record<string, unknown>) => {
        const perms: Record<string, 'basic' | 'advanced'> = {};
        const saved = (memberSettings as any)?.tool_permissions || {};
        products.forEach(p => {
            perms[p.id] = saved[p.id] || 'basic';
        });
        setToolPermissions(perms);
    };

    const openInviteModal = () => {
        setEditingMember(null);
        form.reset();
        initToolPermissions();
        setModalOpen(true);
    };

    const openEditModal = async (member: TeamMember) => {
        setEditingMember(member);
        form.setValues({
            email: member.user.email,
            role: member.role,
            user_type: member.user_type || 'collaborator',
        });
        // Load existing tool permissions from member_product_access
        if (currentCompany) {
            const { data: accessData } = await supabase
                .from('member_product_access')
                .select('product_id, access_level')
                .eq('company_member_id', member.id);
            const perms: Record<string, 'basic' | 'advanced'> = {};
            products.forEach(p => {
                const found = (accessData || []).find((a: any) => a.product_id === p.id);
                perms[p.id] = found ? (found.access_level === 'admin' || found.access_level === 'manager' ? 'advanced' : 'basic') : 'basic';
            });
            setToolPermissions(perms);
        } else {
            initToolPermissions();
        }
        setModalOpen(true);
    };

    const handleInvite = async (values: typeof form.values) => {
        if (!currentCompany) return;

        try {
            // Check if user exists
            const { data: existingUser } = await supabase
                .from('subscribers')
                .select('id')
                .eq('email', values.email)
                .single();

            if (existingUser) {
                // Add to company
                const { data: newMember, error } = await supabase.from('company_members').insert({
                    company_id: currentCompany.id,
                    user_id: existingUser.id,
                    role: values.role,
                    user_type: values.user_type,
                }).select('id').single();

                if (error) throw error;

                // Persist tool permissions in member_product_access
                if (newMember) {
                    await saveToolPermissions(newMember.id);
                }

                notifications.show({
                    title: 'Sucesso',
                    message: 'Membro adicionado com sucesso',
                    color: 'green',
                });
            } else {
                // User not registered — create account via signUp and send password reset
                const tempPassword = crypto.randomUUID();
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: values.email,
                    password: tempPassword,
                    options: {
                        data: { invited_by: subscriber?.id, invited_to_company: currentCompany.id },
                    },
                });

                if (signUpError) throw signUpError;

                if (signUpData.user) {
                    // Create subscriber record
                    await supabase.from('subscribers').upsert({
                        id: signUpData.user.id,
                        email: values.email,
                        name: values.email.split('@')[0],
                    }, { onConflict: 'id' });

                    // Add to company
                    const { data: newMember, error: memberError } = await supabase.from('company_members').insert({
                        company_id: currentCompany.id,
                        user_id: signUpData.user.id,
                        role: values.role,
                        user_type: values.user_type,
                    }).select('id').single();

                    if (memberError) throw memberError;

                    // Persist tool permissions
                    if (newMember) {
                        await saveToolPermissions(newMember.id);
                    }

                    // Send password reset so the user can set their own password
                    await supabase.auth.resetPasswordForEmail(values.email, {
                        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
                    });
                }

                notifications.show({
                    title: 'Convite Enviado',
                    message: `Um convite foi enviado para ${values.email}. O usuário receberá um email para definir sua senha.`,
                    color: 'blue',
                });
            }

            setModalOpen(false);
            loadMembers();
        } catch (error: any) {
            console.error('Error inviting member:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível convidar o membro',
                color: 'red',
            });
        }
    };

    const handleUpdateRole = async (values: typeof form.values) => {
        if (!editingMember) return;

        try {
            const { error } = await supabase
                .from('company_members')
                .update({ role: values.role, user_type: values.user_type })
                .eq('id', editingMember.id);

            if (error) throw error;

            // Persist tool permissions
            await saveToolPermissions(editingMember.id);

            notifications.show({
                title: 'Sucesso',
                message: 'Função atualizada com sucesso',
                color: 'green',
            });

            setModalOpen(false);
            loadMembers();
        } catch (error: any) {
            console.error('Error updating role:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível atualizar a função',
                color: 'red',
            });
        }
    };

    const handleRemove = async (member: TeamMember) => {
        if (member.role === 'owner') {
            notifications.show({
                title: 'Ação não permitida',
                message: 'Não é possível remover o proprietário',
                color: 'red',
            });
            return;
        }

        if (!confirm(`Remover ${member.user?.name || member.user?.email || 'este membro'} da equipe?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('company_members')
                .delete()
                .eq('id', member.id);

            if (error) throw error;

            notifications.show({
                title: 'Sucesso',
                message: 'Membro removido com sucesso',
                color: 'green',
            });

            loadMembers();
        } catch (error: any) {
            console.error('Error removing member:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível remover o membro',
                color: 'red',
            });
        }
    };

    const canManage = isOwner || isAdmin;

    // Persist member_product_access entries
    const saveToolPermissions = async (memberId: string) => {
        const entries = Object.entries(toolPermissions).map(([productId, level]) => ({
            company_member_id: memberId,
            product_id: productId,
            access_level: level === 'advanced' ? 'admin' : 'user',
            granted_by: subscriber?.id,
        }));

        if (entries.length === 0) return;

        // Delete existing and re-insert
        await supabase
            .from('member_product_access')
            .delete()
            .eq('company_member_id', memberId);

        const { error } = await supabase
            .from('member_product_access')
            .insert(entries);

        if (error) console.error('Error saving tool permissions:', error);
    };

    // Provision member to satellite tools
    const handleProvision = async (member: TeamMember) => {
        try {
            notifications.show({
                id: `provision-${member.id}`,
                title: 'Sincronizando...',
                message: 'Provisionando acesso nas ferramentas...',
                loading: true,
                autoClose: false,
            });

            const response = await supabase.functions.invoke('provision-tool-user', {
                body: { action: 'provision', member_id: member.id },
            });

            if (response.error) throw response.error;

            const result = response.data;
            notifications.update({
                id: `provision-${member.id}`,
                title: result.errors > 0 ? 'Sincronização parcial' : 'Sincronizado!',
                message: `${result.provisioned} ferramenta(s) sincronizada(s)${result.errors > 0 ? `, ${result.errors} erro(s)` : ''}`,
                color: result.errors > 0 ? 'yellow' : 'green',
                loading: false,
                autoClose: 4000,
            });
        } catch (error: any) {
            console.error('Provision error:', error);
            notifications.update({
                id: `provision-${member.id}`,
                title: 'Erro ao sincronizar',
                message: error.message || 'Falha ao provisionar nas ferramentas',
                color: 'red',
                loading: false,
                autoClose: 4000,
            });
        }
    };

    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            if (!m.user) return false; // skip membros sem user
            const matchesSearch = !search ||
                (m.user.name || '').toLowerCase().includes(search.toLowerCase()) ||
                m.user.email.toLowerCase().includes(search.toLowerCase());
            const matchesRole = !roleFilter || m.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [members, search, roleFilter]);

    const helpContent = (
        <>
            <Text size="sm">Neste módulo você gerencia a equipe da sua empresa. Aqui é possível:</Text>
            <Text size="sm" component="ul" ml="md">
                <li>Convidar usuários já cadastrados no Sincla (adiciona direto)</li>
                <li>Enviar convites por email para novos usuários (cria conta + envia email de acesso)</li>
                <li>Definir permissões por ferramenta (Avançado ou Básico)</li>
                <li>Remover membros que não fazem mais parte</li>
            </Text>
            <Text size="sm" fw={500} mt="xs">Funções disponíveis:</Text>
            <Text size="sm" component="ul" ml="md">
                <li><strong>Administrador:</strong> Acesso total, inclusive aos meios de pagamento das assinaturas</li>
                <li><strong>Gerente:</strong> Acesso parcial, exceto para a gestão das assinaturas e empresa</li>
                <li><strong>Membro:</strong> Acesso aos recursos básicos das ferramentas ou modo leitura</li>
            </Text>
        </>
    );

    if (!currentCompany) {
        return (
            <Container size="xl" py="md">
                <PageHeader
                    title="Equipe"
                    subtitle="Gerencie os membros da sua empresa"
                    helpContent={helpContent}
                />
                <EmptyState
                    icon={<IconUsers size={28} />}
                    title="Nenhuma empresa selecionada"
                    description="Selecione ou crie uma empresa para gerenciar sua equipe."
                    actionLabel="Ir para Empresas"
                    onAction={() => navigate('/painel/empresas')}
                />
            </Container>
        );
    }

    return (
        <Container size="xl" py="md">
            <PageHeader
                title="Equipe"
                subtitle={`Gerencie os membros da empresa ${currentCompany.name}`}
                actionLabel={canManage ? 'Convidar Membro' : undefined}
                actionIcon={<IconPlus size={16} />}
                onAction={canManage ? openInviteModal : undefined}
                helpContent={helpContent}
            />

            {/* Search & Filters */}
            <Group mb="md" gap="sm">
                <TextInput
                    placeholder="Buscar por nome ou email..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    style={{ flex: 1, maxWidth: 320 }}
                />
                <Select
                    placeholder="Todas as funções"
                    clearable
                    data={[
                        { value: 'owner', label: 'Proprietário' },
                        { value: 'admin', label: 'Administrador' },
                        { value: 'manager', label: 'Gerente' },
                        { value: 'member', label: 'Membro' },
                    ]}
                    value={roleFilter}
                    onChange={setRoleFilter}
                    w={180}
                />
            </Group>

            {filteredMembers.length === 0 ? (
                <EmptyState
                    icon={<IconUsers size={28} />}
                    title={members.length === 0 ? 'Nenhum membro ainda' : 'Nenhum resultado encontrado'}
                    description={members.length === 0
                        ? 'Convide membros da sua equipe para colaborar na empresa.'
                        : 'Tente ajustar os filtros ou a busca.'}
                    actionLabel={members.length === 0 && canManage ? 'Convidar Membro' : undefined}
                    actionIcon={<IconPlus size={16} />}
                    onAction={members.length === 0 && canManage ? openInviteModal : undefined}
                />
            ) : (
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Membro</Table.Th>
                            <Table.Th>Email</Table.Th>
                            <Table.Th>Função</Table.Th>
                            <Table.Th>Tipo</Table.Th>
                            <Table.Th>Desde</Table.Th>
                            {canManage && <Table.Th>Ações</Table.Th>}
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {filteredMembers.map((member) => (
                            <Table.Tr key={member.id}>
                                <Table.Td>
                                    <Group gap="sm">
                                        <Avatar
                                            src={member.user.avatar_url}
                                            radius="xl"
                                            size="sm"
                                            color="blue"
                                        >
                                            {(member.user?.name || member.user?.email || '?').charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Text size="sm" fw={500}>
                                            {member.user.name || 'Sem nome'}
                                        </Text>
                                    </Group>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm" c="dimmed">{member.user.email}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Badge color={roleColors[member.role]} variant="light">
                                        {roleLabels[member.role]}
                                    </Badge>
                                </Table.Td>
                                <Table.Td>
                                    <Badge color={userTypeColors[member.user_type] || 'gray'} variant="dot" size="sm">
                                        {userTypeLabels[member.user_type] || member.user_type}
                                    </Badge>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm" c="dimmed">
                                        {new Date(member.created_at).toLocaleDateString('pt-BR')}
                                    </Text>
                                </Table.Td>
                                {canManage && (
                                    <Table.Td>
                                        {member.role !== 'owner' && member.user_id !== subscriber?.id && (
                                            <Menu shadow="md" width={150}>
                                                <Menu.Target>
                                                    <ActionIcon variant="subtle">
                                                        <IconDotsVertical size={16} />
                                                    </ActionIcon>
                                                </Menu.Target>
                                                <Menu.Dropdown>
                                                    <Menu.Item
                                                        leftSection={<IconEdit style={{ width: rem(14), height: rem(14) }} />}
                                                        onClick={() => openEditModal(member)}
                                                    >
                                                        Editar Função
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        color="red"
                                                        leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
                                                        onClick={() => handleRemove(member)}
                                                    >
                                                        Remover
                                                    </Menu.Item>
                                                    <Menu.Divider />
                                                    <Menu.Item
                                                        leftSection={<IconRefresh style={{ width: rem(14), height: rem(14) }} />}
                                                        onClick={() => handleProvision(member)}
                                                    >
                                                        Sincronizar
                                                    </Menu.Item>
                                                </Menu.Dropdown>
                                            </Menu>
                                        )}
                                    </Table.Td>
                                )}
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}

            {/* Modal */}
            <Modal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingMember ? 'Editar Membro' : 'Convidar Membro'}
                size="md"
            >
                <form onSubmit={form.onSubmit(editingMember ? handleUpdateRole : handleInvite)}>
                    <Stack gap="md">
                        <TextInput
                            label="Email"
                            placeholder="email@exemplo.com"
                            leftSection={<IconMail size={16} />}
                            disabled={!!editingMember}
                            required
                            {...form.getInputProps('email')}
                        />

                        <Select
                            label="Função"
                            data={[
                                { value: 'admin', label: 'Administrador' },
                                { value: 'manager', label: 'Gerente' },
                                { value: 'member', label: 'Membro' },
                            ]}
                            required
                            {...form.getInputProps('role')}
                        />

                        <Select
                            label="Tipo de Acesso"
                            description="Define o perfil do membro dentro da empresa"
                            data={[
                                { value: 'collaborator', label: 'Colaborador — Funcionário operacional' },
                                { value: 'manager', label: 'Gestor — Configura ferramentas' },
                                { value: 'external', label: 'Externo — Consultor, contador' },
                                { value: 'student', label: 'Aluno — Aprendiz, treinando' },
                                { value: 'customer', label: 'Cliente — B2C promovido' },
                            ]}
                            required
                            {...form.getInputProps('user_type')}
                        />

                        {/* Role description */}
                        {form.values.role && roleDescriptions[form.values.role] && (
                            <Text size="xs" c="dimmed" mt={-8}>
                                <IconShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                {roleDescriptions[form.values.role]}
                            </Text>
                        )}

                        {/* Tool permissions */}
                        {products.length > 0 && (
                            <>
                                <Divider label="Permissões por Ferramenta" labelPosition="center" />
                                <Text size="xs" c="dimmed">
                                    <strong>Avançado:</strong> edição em todos os recursos da ferramenta.
                                    <strong> Básico:</strong> acesso aos dados mais básicos e modo leitura.
                                    Permissões avançadas podem ser refinadas pelo gestor dentro de cada ferramenta.
                                </Text>
                                <Stack gap="xs">
                                    {products.map(product => (
                                        <Paper key={product.id} p="sm" withBorder radius="sm">
                                            <Group justify="space-between" align="center">
                                                <Text size="sm" fw={500}>{product.name}</Text>
                                                <Radio.Group
                                                    value={toolPermissions[product.id] || 'basic'}
                                                    onChange={(value) => setToolPermissions(prev => ({
                                                        ...prev,
                                                        [product.id]: value as 'basic' | 'advanced',
                                                    }))}
                                                >
                                                    <Group gap="md">
                                                        <Radio value="basic" label="Básico" size="xs" />
                                                        <Radio value="advanced" label="Avançado" size="xs" />
                                                    </Group>
                                                </Radio.Group>
                                            </Group>
                                        </Paper>
                                    ))}
                                </Stack>
                            </>
                        )}

                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={() => setModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit">
                                {editingMember ? 'Salvar' : 'Convidar'}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
}
