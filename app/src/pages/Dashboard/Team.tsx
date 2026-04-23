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
    Paper,
    Switch,
    Collapse,
    Tooltip,
    PasswordInput,
    CopyButton,
    Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
    IconPlus,
    IconEdit,
    IconTrash,
    IconDotsVertical,
    IconMail,
    IconSearch,
    IconUsers,
    IconShieldCheck,
    IconRefresh,
    IconClock,
    IconSend,
    IconX,
    IconKey,
    IconAlertCircle,
    IconCopy,
    IconCheck,
    IconLock,
} from '@tabler/icons-react';
import { useAuth, useCompany } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { PageHeader, EmptyState } from '../../components/shared';
import { sendEmail } from '../../shared/services/notificationService';


// =============================================
// Types
// =============================================

interface TeamMember {
    id: string;
    user_id: string;
    role: 'owner' | 'admin' | 'member';
    created_at: string;
    user: {
        id: string;
        email: string;
        name: string | null;
        avatar_url: string | null;
    };
}

interface PendingInvite {
    id: string;
    email: string;
    role: string;
    tool_permissions: Record<string, boolean>;
    created_at: string;
    expires_at: string;
}

type TeamRow =
    | { kind: 'member'; data: TeamMember }
    | { kind: 'invite'; data: PendingInvite };

interface Product {
    id: string;
    name: string;
    icon: string | null;
}

// =============================================
// Constants
// =============================================

const roleColors: Record<string, string> = {
    owner: 'red',
    admin: 'blue',
    member: 'gray',
};

const roleLabels: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    member: 'Membro',
};

const roleDescriptions: Record<string, string> = {
    admin: 'Acesso total ao painel, inclusive às assinaturas e configurações da empresa',
    member: 'Acesso às ferramentas conforme as permissões definidas abaixo',
};

function generatePassword(length = 10): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// =============================================
// Component
// =============================================

export function Team() {
    const navigate = useNavigate();
    const { currentCompany, subscriber } = useAuth();
    const { isOwner, isAdmin } = useCompany();

    const [rows, setRows] = useState<TeamRow[]>([]);
    const [_loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    // tool_permissions: product_id -> has_access (boolean)
    const [toolAccess, setToolAccess] = useState<Record<string, boolean>>({});
    const [provisionalPassword, setProvisionalPassword] = useState('');
    const [useProvisional, setUseProvisional] = useState(false);
    const [provisionalOpen, setProvisionalOpen] = useState(false);
    const [createdPassword, setCreatedPassword] = useState<string | null>(null);

    const form = useForm({
        initialValues: {
            email: '',
            role: 'member' as 'admin' | 'member',
        },
    });

    // =============================================
    // Data Loading
    // =============================================

    useEffect(() => {
        if (currentCompany) {
            loadAll();
            loadProducts();
        }
    }, [currentCompany]);

    const loadAll = async () => {
        if (!currentCompany) return;
        setLoading(true);
        try {
            const [membersRes, invitesRes] = await Promise.all([
                supabase
                    .from('company_members')
                    .select(`
                        id,
                        user_id,
                        role,
                        created_at,
                        user:subscribers!company_members_user_id_fkey (
                            id, email, name, avatar_url
                        )
                    `)
                    .eq('company_id', currentCompany.id)
                    .order('created_at'),
                supabase
                    .from('company_invites')
                    .select('id, email, role, tool_permissions, created_at, expires_at')
                    .eq('company_id', currentCompany.id)
                    .order('created_at'),
            ]);

            if (membersRes.error) throw membersRes.error;

            const validMembers: TeamRow[] = ((membersRes.data || []) as any[])
                .filter((m) => m.user !== null)
                .map((m) => ({ kind: 'member', data: m as TeamMember }));

            const pendingInvites: TeamRow[] = ((invitesRes.data || []) as PendingInvite[])
                .map((inv) => ({ kind: 'invite', data: inv }));

            setRows([...validMembers, ...pendingInvites]);
        } catch (error) {
            console.error('Error loading team:', error);
            notifications.show({ title: 'Erro', message: 'Não foi possível carregar a equipe', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async () => {
        if (!currentCompany) return;
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

    // =============================================
    // Modal helpers
    // =============================================

    const initToolAccess = (existingPerms?: Record<string, boolean>) => {
        const access: Record<string, boolean> = {};
        products.forEach((p) => {
            access[p.id] = existingPerms?.[p.id] ?? false;
        });
        setToolAccess(access);
    };

    const openInviteModal = () => {
        setEditingMember(null);
        form.reset();
        initToolAccess();
        setUseProvisional(false);
        setProvisionalOpen(false);
        setProvisionalPassword('');
        setCreatedPassword(null);
        setModalOpen(true);
    };

    const openEditModal = async (member: TeamMember) => {
        setEditingMember(member);
        form.setValues({ email: member.user.email, role: member.role === 'owner' ? 'admin' : (member.role as 'admin' | 'member') });

        // Load existing tool access
        const { data: accessData } = await supabase
            .from('member_product_access')
            .select('product_id, access_level')
            .eq('company_member_id', member.id);

        const existingAccess: Record<string, boolean> = {};
        products.forEach((p) => {
            existingAccess[p.id] = (accessData || []).some((a: any) => a.product_id === p.id);
        });
        setToolAccess(existingAccess);
        setUseProvisional(false);
        setProvisionalOpen(false);
        setProvisionalPassword('');
        setCreatedPassword(null);
        setModalOpen(true);
    };

    // =============================================
    // Actions
    // =============================================

    const handleInvite = async (values: typeof form.values) => {
        if (!currentCompany) return;

        try {
            // Check if user already exists — tratamento resiliente: se o RPC falhar
            // por questão de permissão, assume que o usuário não existe e segue com convite
            const { data: rpcData, error: rpcError } = await supabase
                .rpc('get_subscriber_id_by_email', { p_email: values.email })
                .maybeSingle();

            if (rpcError) {
                console.warn('[Team] RPC get_subscriber_id_by_email falhou, seguindo com convite:', rpcError.message);
            }
            const existingUser = rpcError ? null : (rpcData as { id: string } | null);

            if (existingUser?.id) {
                // User exists — check if already a member
                const { data: memberCheck } = await supabase
                    .from('company_members')
                    .select('id')
                    .eq('company_id', currentCompany.id)
                    .eq('user_id', existingUser.id)
                    .maybeSingle();

                if (memberCheck) {
                    throw new Error('Este usuário já é membro desta empresa.');
                }

                // Add directly as member
                const { data: newMember, error } = await supabase
                    .from('company_members')
                    .insert({
                        company_id: currentCompany.id,
                        user_id: existingUser.id,
                        role: values.role,
                        user_type: 'collaborator',
                    })
                    .select('id')
                    .single();

                if (error) throw error;
                if (newMember) await saveToolPermissions(newMember.id);

                await sendEmail(
                    values.email,
                    'Você foi adicionado a uma nova empresa',
                    `Você foi adicionado à empresa ${currentCompany.name} como ${roleLabels[values.role]}.`,
                    'welcome',
                    { action_url: `${window.location.origin}/painel` }
                );

                notifications.show({ title: 'Sucesso', message: 'Membro adicionado com sucesso', color: 'green' });
            } else if (useProvisional && provisionalPassword) {
                // New user — create with provisional password
                const response = await supabase.functions.invoke('admin-create-user', {
                    body: {
                        email: values.email,
                        password: provisionalPassword,
                        company_id: currentCompany.id,
                        role: values.role,
                        tool_permissions: toolAccess,
                        invited_by: subscriber?.id,
                    },
                });

                if (response.error) throw new Error(response.error.message);

                setCreatedPassword(provisionalPassword);
                notifications.show({
                    title: 'Usuário criado!',
                    message: `Conta criada para ${values.email}. Anote a senha antes de fechar.`,
                    color: 'green',
                    autoClose: false,
                });
                // Stay open to show the password
                loadAll();
                return;
            } else {
                // New user — send invite email
                // Remove any existing pending invite first (allow "reenvio" via new invite)
                await supabase
                    .from('company_invites')
                    .delete()
                    .eq('company_id', currentCompany.id)
                    .eq('email', values.email);

                const { data: inviteData, error: inviteError } = await supabase
                    .from('company_invites')
                    .insert({
                        company_id: currentCompany.id,
                        email: values.email,
                        role: values.role,
                        user_type: 'collaborator',
                        invited_by: subscriber?.id,
                        tool_permissions: toolAccess,
                    })
                    .select('id')
                    .single();

                if (inviteError) throw inviteError;

                const registerUrl = `${window.location.origin}/cadastro?invite=${inviteData.id}&email=${encodeURIComponent(values.email)}`;
                await sendEmail(
                    values.email,
                    `Convite para participar da equipe: ${currentCompany.name}`,
                    `Você foi convidado para participar da empresa ${currentCompany.name}. Clique abaixo para criar sua conta e aceitar o convite.`,
                    'welcome',
                    { action_url: registerUrl, action_label: 'Criar minha Conta' }
                );

                notifications.show({
                    title: 'Convite enviado!',
                    message: `Um convite foi enviado para ${values.email}.`,
                    color: 'blue',
                });
            }

            setModalOpen(false);
            loadAll();
        } catch (error: any) {
            console.error('Error inviting member:', error);
            notifications.show({ title: 'Erro', message: error.message || 'Não foi possível convidar o membro', color: 'red' });
        }
    };

    const handleUpdateRole = async (values: typeof form.values) => {
        if (!editingMember) return;

        try {
            const { error } = await supabase
                .from('company_members')
                .update({ role: values.role })
                .eq('id', editingMember.id);

            if (error) throw error;
            await saveToolPermissions(editingMember.id);

            await sendEmail(
                editingMember.user.email,
                'Atualização de Permissões',
                `Suas permissões na empresa ${currentCompany?.name} foram atualizadas.`,
                'system',
                { action_url: `${window.location.origin}/painel` }
            );

            notifications.show({ title: 'Sucesso', message: 'Permissões atualizadas', color: 'green' });
            setModalOpen(false);
            loadAll();
        } catch (error: any) {
            notifications.show({ title: 'Erro', message: error.message || 'Não foi possível atualizar', color: 'red' });
        }
    };

    const handleRemove = async (member: TeamMember) => {
        if (member.role === 'owner') {
            notifications.show({ title: 'Ação não permitida', message: 'Não é possível remover o proprietário', color: 'red' });
            return;
        }
        if (!confirm(`Remover ${member.user?.name || member.user?.email || 'este membro'} da equipe?`)) return;

        try {
            const { error } = await supabase.from('company_members').delete().eq('id', member.id);
            if (error) throw error;

            if (member.user?.email) {
                await sendEmail(
                    member.user.email,
                    'Acesso Revogado',
                    `Seu acesso à empresa ${currentCompany?.name} foi revogado.`,
                    'security'
                );
            }

            notifications.show({ title: 'Sucesso', message: 'Membro removido', color: 'green' });
            loadAll();
        } catch (error: any) {
            notifications.show({ title: 'Erro', message: error.message || 'Não foi possível remover', color: 'red' });
        }
    };

    const handleResendInvite = async (invite: PendingInvite) => {
        if (!currentCompany) return;
        try {
            // Delete and re-insert to reset expiry
            await supabase.from('company_invites').delete().eq('id', invite.id);

            const { data: newInvite, error } = await supabase
                .from('company_invites')
                .insert({
                    company_id: currentCompany.id,
                    email: invite.email,
                    role: invite.role,
                    user_type: 'collaborator',
                    invited_by: subscriber?.id,
                    tool_permissions: invite.tool_permissions,
                })
                .select('id')
                .single();

            if (error) throw error;

            const registerUrl = `${window.location.origin}/cadastro?invite=${newInvite.id}&email=${encodeURIComponent(invite.email)}`;
            await sendEmail(
                invite.email,
                `Lembrete: Convite para entrar na equipe ${currentCompany.name}`,
                `Você tem um convite pendente para participar da empresa ${currentCompany.name}. Clique abaixo para criar sua conta.`,
                'welcome',
                { action_url: registerUrl, action_label: 'Criar minha Conta' }
            );

            notifications.show({ title: 'Convite reenviado!', message: `Email reenviado para ${invite.email}`, color: 'blue' });
            loadAll();
        } catch (error: any) {
            notifications.show({ title: 'Erro', message: error.message || 'Não foi possível reenviar', color: 'red' });
        }
    };

    const handleCancelInvite = async (invite: PendingInvite) => {
        if (!confirm(`Cancelar o convite para ${invite.email}?`)) return;
        try {
            const { error } = await supabase.from('company_invites').delete().eq('id', invite.id);
            if (error) throw error;
            notifications.show({ title: 'Convite cancelado', message: `Convite para ${invite.email} cancelado`, color: 'orange' });
            loadAll();
        } catch (error: any) {
            notifications.show({ title: 'Erro', message: error.message || 'Não foi possível cancelar', color: 'red' });
        }
    };

    const handleProvision = async (member: TeamMember) => {
        try {
            notifications.show({ id: `prov-${member.id}`, title: 'Sincronizando...', message: 'Provisionando acesso nas ferramentas...', loading: true, autoClose: false });
            const response = await supabase.functions.invoke('provision-tool-user', { body: { action: 'provision', member_id: member.id } });
            if (response.error) throw response.error;
            const result = response.data;
            notifications.update({
                id: `prov-${member.id}`,
                title: result.errors > 0 ? 'Sincronização parcial' : 'Sincronizado!',
                message: `${result.provisioned} ferramenta(s) sincronizada(s)${result.errors > 0 ? `, ${result.errors} erro(s)` : ''}`,
                color: result.errors > 0 ? 'yellow' : 'green',
                loading: false,
                autoClose: 4000,
            });
        } catch (error: any) {
            notifications.update({ id: `prov-${member.id}`, title: 'Erro', message: error.message, color: 'red', loading: false, autoClose: 4000 });
        }
    };

    // =============================================
    // Permissions
    // =============================================

    const saveToolPermissions = async (memberId: string) => {
        // Delete existing
        await supabase.from('member_product_access').delete().eq('company_member_id', memberId);

        const entries = Object.entries(toolAccess)
            .filter(([, hasAccess]) => hasAccess)
            .map(([productId]) => ({
                company_member_id: memberId,
                product_id: productId,
                access_level: 'user',
                granted_by: subscriber?.id,
            }));

        if (entries.length > 0) {
            const { error } = await supabase.from('member_product_access').insert(entries);
            if (error) console.error('Error saving tool permissions:', error);
        }
    };

    // =============================================
    // Derived state
    // =============================================

    const canManage = isOwner || isAdmin;

    const filteredRows = useMemo(() => {
        if (!search) return rows;
        const q = search.toLowerCase();
        return rows.filter((row) => {
            if (row.kind === 'member') {
                return (
                    (row.data.user.name || '').toLowerCase().includes(q) ||
                    row.data.user.email.toLowerCase().includes(q)
                );
            }
            return row.data.email.toLowerCase().includes(q);
        });
    }, [rows, search]);

    // =============================================
    // Help content
    // =============================================

    const helpContent = (
        <>
            <Text size="sm">Gerencie quem tem acesso à empresa e às ferramentas.</Text>
            <Text size="sm" component="ul" ml="md">
                <li>Convide usuários já cadastrados no Sincla (adiciona direto)</li>
                <li>Envie convites por email para novos usuários</li>
                <li>Crie contas com senha provisória quando o email não funcionar</li>
                <li>Defina quais ferramentas cada membro pode acessar</li>
            </Text>
        </>
    );

    // =============================================
    // Render
    // =============================================

    if (!currentCompany) {
        return (
            <Container size="xl" py="md">
                <PageHeader title="Equipe" subtitle="Gerencie os membros da sua empresa" helpContent={helpContent} />
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

            {/* Search */}
            <Group mb="md">
                <TextInput
                    placeholder="Buscar por nome ou email..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    style={{ flex: 1, maxWidth: 360 }}
                />
            </Group>

            {filteredRows.length === 0 ? (
                <EmptyState
                    icon={<IconUsers size={28} />}
                    title={rows.length === 0 ? 'Nenhum membro ainda' : 'Nenhum resultado encontrado'}
                    description={rows.length === 0 ? 'Convide membros da equipe para colaborar.' : 'Tente ajustar a busca.'}
                    actionLabel={rows.length === 0 && canManage ? 'Convidar Membro' : undefined}
                    actionIcon={<IconPlus size={16} />}
                    onAction={rows.length === 0 && canManage ? openInviteModal : undefined}
                />
            ) : (
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Membro</Table.Th>
                            <Table.Th>Email</Table.Th>
                            <Table.Th>Função</Table.Th>
                            <Table.Th>Desde</Table.Th>
                            {canManage && <Table.Th>Ações</Table.Th>}
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {filteredRows.map((row) => {
                            if (row.kind === 'invite') {
                                const inv = row.data;
                                const isExpired = new Date(inv.expires_at) < new Date();
                                return (
                                    <Table.Tr key={`invite-${inv.id}`} style={{ opacity: isExpired ? 0.6 : 1 }}>
                                        <Table.Td>
                                            <Group gap="sm">
                                                <Avatar radius="xl" size="sm" color="gray">
                                                    <IconMail size={14} />
                                                </Avatar>
                                                <Text size="sm" c="dimmed" fs="italic">—</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{inv.email}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap="xs">
                                                <Badge color={isExpired ? 'red' : 'orange'} variant="light" leftSection={<IconClock size={10} />}>
                                                    {isExpired ? 'Expirado' : 'Pendente'}
                                                </Badge>
                                                <Badge color={roleColors[inv.role] || 'gray'} variant="dot" size="sm">
                                                    {roleLabels[inv.role] || inv.role}
                                                </Badge>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" c="dimmed">
                                                {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                                            </Text>
                                        </Table.Td>
                                        {canManage && (
                                            <Table.Td>
                                                <Group gap="xs">
                                                    <Tooltip label="Reenviar convite">
                                                        <ActionIcon variant="subtle" color="blue" onClick={() => handleResendInvite(inv)}>
                                                            <IconSend size={15} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                    <Tooltip label="Cancelar convite">
                                                        <ActionIcon variant="subtle" color="red" onClick={() => handleCancelInvite(inv)}>
                                                            <IconX size={15} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Group>
                                            </Table.Td>
                                        )}
                                    </Table.Tr>
                                );
                            }

                            const member = row.data;
                            return (
                                <Table.Tr key={`member-${member.id}`}>
                                    <Table.Td>
                                        <Group gap="sm">
                                            <Avatar src={member.user.avatar_url} radius="xl" size="sm" color="blue">
                                                {(member.user?.name || member.user?.email || '?').charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Text size="sm" fw={500}>{member.user.name || 'Sem nome'}</Text>
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
                                        <Text size="sm" c="dimmed">
                                            {new Date(member.created_at).toLocaleDateString('pt-BR')}
                                        </Text>
                                    </Table.Td>
                                    {canManage && (
                                        <Table.Td>
                                            {member.role !== 'owner' && member.user_id !== subscriber?.id && (
                                                <Menu shadow="md" width={160}>
                                                    <Menu.Target>
                                                        <ActionIcon variant="subtle">
                                                            <IconDotsVertical size={16} />
                                                        </ActionIcon>
                                                    </Menu.Target>
                                                    <Menu.Dropdown>
                                                        <Menu.Item
                                                            leftSection={<IconEdit style={{ width: rem(14) }} />}
                                                            onClick={() => openEditModal(member)}
                                                        >
                                                            Editar Permissões
                                                        </Menu.Item>
                                                        <Menu.Item
                                                            leftSection={<IconRefresh style={{ width: rem(14) }} />}
                                                            onClick={() => handleProvision(member)}
                                                        >
                                                            Sincronizar
                                                        </Menu.Item>
                                                        <Menu.Divider />
                                                        <Menu.Item
                                                            color="red"
                                                            leftSection={<IconTrash style={{ width: rem(14) }} />}
                                                            onClick={() => handleRemove(member)}
                                                        >
                                                            Remover
                                                        </Menu.Item>
                                                    </Menu.Dropdown>
                                                </Menu>
                                            )}
                                        </Table.Td>
                                    )}
                                </Table.Tr>
                            );
                        })}
                    </Table.Tbody>
                </Table>
            )}

            {/* =============================================
                Modal — Convidar / Editar Membro
            ============================================= */}
            <Modal
                opened={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setCreatedPassword(null);
                    setEditingMember(null);
                    setToolAccess({});
                    setUseProvisional(false);
                    setProvisionalOpen(false);
                    setProvisionalPassword('');
                    form.reset();
                }}
                title={editingMember ? 'Editar Permissões' : 'Convidar Membro'}
                size="md"
                closeOnClickOutside={false}
                closeOnEscape={false}
            >
                {/* Password created confirmation screen */}
                {createdPassword ? (
                    <Stack gap="md">
                        <Alert icon={<IconCheck size={16} />} color="green" title="Usuário criado com sucesso!">
                            A conta foi criada e o usuário já pode acessar a plataforma. Anote as credenciais abaixo e repasse pessoalmente.
                        </Alert>
                        <Paper p="md" withBorder radius="sm" bg="gray.0">
                            <Stack gap="xs">
                                <Text size="xs" c="dimmed" fw={500}>SENHA PROVISÓRIA</Text>
                                <Group gap="xs">
                                    <Text fw={700} ff="monospace" size="lg" style={{ flex: 1 }}>{createdPassword}</Text>
                                    <CopyButton value={createdPassword}>
                                        {({ copied, copy }) => (
                                            <Button size="xs" variant="light" color={copied ? 'green' : 'blue'} leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />} onClick={copy}>
                                                {copied ? 'Copiado!' : 'Copiar'}
                                            </Button>
                                        )}
                                    </CopyButton>
                                </Group>
                                <Text size="xs" c="dimmed">Recomendamos pedir ao usuário para alterar a senha no primeiro acesso.</Text>
                            </Stack>
                        </Paper>
                        <Button onClick={() => { setModalOpen(false); setCreatedPassword(null); }}>
                            Concluir
                        </Button>
                    </Stack>
                ) : (
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
                                    { value: 'member', label: 'Membro' },
                                ]}
                                required
                                comboboxProps={{ withinPortal: true, zIndex: 1000000 }}
                                {...form.getInputProps('role')}
                            />

                            {form.values.role && roleDescriptions[form.values.role] && (
                                <Text size="xs" c="dimmed" mt={-8}>
                                    <IconShieldCheck size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                    {roleDescriptions[form.values.role]}
                                </Text>
                            )}

                            {/* Tool access toggles */}
                            {products.length > 0 && (
                                <>
                                    <Divider label="Acesso às Ferramentas" labelPosition="center" />
                                    <Stack gap="xs">
                                        {products.map((product) => (
                                            <Paper key={product.id} p="sm" withBorder radius="sm">
                                                <Group justify="space-between" align="center">
                                                    <Text size="sm" fw={500}>{product.name}</Text>
                                                    <Switch
                                                        checked={toolAccess[product.id] ?? false}
                                                        onChange={(e) =>
                                                            setToolAccess((prev) => ({
                                                                ...prev,
                                                                [product.id]: e.currentTarget.checked,
                                                            }))
                                                        }
                                                        label={toolAccess[product.id] ? 'Com acesso' : 'Sem acesso'}
                                                        labelPosition="left"
                                                        size="sm"
                                                        color="blue"
                                                    />
                                                </Group>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </>
                            )}

                            {/* Provisional password — only for new invites */}
                            {!editingMember && (
                                <>
                                    <Divider />
                                    <Paper p="sm" withBorder radius="sm" style={{ borderStyle: 'dashed' }}>
                                        <Group justify="space-between" mb={provisionalOpen ? 'sm' : 0}>
                                            <Group gap="xs">
                                                <IconLock size={15} />
                                                <Text size="sm" fw={500}>Cadastrar com senha provisória</Text>
                                            </Group>
                                            <Switch
                                                size="sm"
                                                checked={provisionalOpen}
                                                onChange={(e) => {
                                                    setProvisionalOpen(e.currentTarget.checked);
                                                    setUseProvisional(e.currentTarget.checked);
                                                    if (!e.currentTarget.checked) setProvisionalPassword('');
                                                }}
                                            />
                                        </Group>
                                        <Collapse in={provisionalOpen}>
                                            <Stack gap="xs" mt="sm">
                                                <Alert icon={<IconAlertCircle size={14} />} color="orange" variant="light" py="xs">
                                                    Use apenas se o email do convidado não está funcionando. O usuário já poderá acessar com a senha fornecida.
                                                </Alert>
                                                <Group gap="xs" align="flex-end">
                                                    <PasswordInput
                                                        label="Senha provisória"
                                                        placeholder="Mínimo 6 caracteres"
                                                        value={provisionalPassword}
                                                        onChange={(e) => setProvisionalPassword(e.currentTarget.value)}
                                                        style={{ flex: 1 }}
                                                        leftSection={<IconKey size={14} />}
                                                    />
                                                    <Button
                                                        variant="light"
                                                        size="sm"
                                                        mb={1}
                                                        onClick={() => setProvisionalPassword(generatePassword())}
                                                    >
                                                        Gerar
                                                    </Button>
                                                </Group>
                                            </Stack>
                                        </Collapse>
                                    </Paper>
                                </>
                            )}

                            <Group justify="flex-end" mt="md">
                                <Button variant="subtle" onClick={() => setModalOpen(false)}>Cancelar</Button>
                                <Button type="submit">
                                    {editingMember ? 'Salvar' : useProvisional && provisionalPassword ? 'Criar Conta' : 'Enviar Convite'}
                                </Button>
                            </Group>
                        </Stack>
                    </form>
                )}
            </Modal>
        </Container>
    );
}
