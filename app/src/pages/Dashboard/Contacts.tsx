import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Text, Card, Group, Badge, Stack, Skeleton,
    Table, TextInput, ThemeIcon, SimpleGrid, Modal, Button,
    Select, ActionIcon, Menu, rem, Avatar, Autocomplete, Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
    IconSearch, IconAddressBook, IconMail, IconPhone, IconPlus,
    IconEdit, IconTrash, IconDotsVertical, IconBrandWhatsapp,
    IconId, IconFilter,
} from '@tabler/icons-react';
import { useAuth, useCompany } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { PageHeader, EmptyState } from '../../components/shared';

// ============================
// Types
// ============================

interface Contact {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    cpf: string | null;
    contact_type: string;
    source: string;
    tags: string[];
    notes: string | null;
    status: 'active' | 'inactive' | 'blocked';
    created_at: string;
}

// ============================
// Helpers
// ============================

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR');

const sourceLabels: Record<string, string> = {
    manual: 'Manual',
    'sincla-rh': 'Sincla RH',
    'sincla-crm': 'Sincla CRM',
    'sincla-ead': 'Sincla EAD',
    import: 'Importação',
};

const typeColors: Record<string, string> = {
    Contato: 'blue',
    Lead: 'orange',
    Cliente: 'green',
    Colaborador: 'violet',
    Parceiro: 'cyan',
    Fornecedor: 'pink',
};

// ============================
// Component
// ============================

export function Contacts() {
    const navigate = useNavigate();
    const { currentCompany } = useAuth();
    const { isOwner, isAdmin } = useCompany();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [existingTypes, setExistingTypes] = useState<string[]>([]);

    const canManage = isOwner || isAdmin;

    const form = useForm({
        initialValues: {
            name: '',
            email: '',
            phone: '',
            whatsapp: '',
            cpf: '',
            contact_type: 'Contato',
            notes: '',
        },
        validate: {
            name: (v) => (!v.trim() ? 'Nome é obrigatório' : null),
        },
    });

    // Load contacts
    const loadData = useCallback(async () => {
        if (!currentCompany) return;
        setLoading(true);
        try {
            let query = supabase
                .from('company_contacts')
                .select('*')
                .eq('company_id', currentCompany.id)
                .eq('status', 'active')
                .order('name');

            if (search.trim()) {
                query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,whatsapp.ilike.%${search}%`);
            }

            if (typeFilter) {
                query = query.eq('contact_type', typeFilter);
            }

            const { data } = await query.limit(200);
            setContacts(data || []);

            // Total count
            const { count } = await supabase
                .from('company_contacts')
                .select('id', { count: 'exact', head: true })
                .eq('company_id', currentCompany.id)
                .eq('status', 'active');
            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error loading contacts:', error);
        } finally {
            setLoading(false);
        }
    }, [currentCompany, search, typeFilter]);

    // Load existing contact types for autocomplete
    const loadExistingTypes = useCallback(async () => {
        if (!currentCompany) return;
        const { data } = await supabase
            .from('company_contacts')
            .select('contact_type')
            .eq('company_id', currentCompany.id)
            .not('contact_type', 'is', null);

        const types = [...new Set((data || []).map(d => d.contact_type).filter(Boolean))];
        // Merge with defaults
        const defaults = ['Contato', 'Lead', 'Cliente', 'Colaborador', 'Parceiro', 'Fornecedor'];
        const merged = [...new Set([...defaults, ...types])];
        setExistingTypes(merged);
    }, [currentCompany]);

    useEffect(() => {
        if (currentCompany) {
            loadData();
            loadExistingTypes();
        }
    }, [currentCompany]);

    // Reload on filter changes
    useEffect(() => {
        if (currentCompany) loadData();
    }, [typeFilter]);

    // Open modals
    const openAddModal = () => {
        setEditingContact(null);
        form.reset();
        form.setFieldValue('contact_type', 'Contato');
        setModalOpen(true);
    };

    const openEditModal = (contact: Contact) => {
        setEditingContact(contact);
        form.setValues({
            name: contact.name,
            email: contact.email || '',
            phone: contact.phone || '',
            whatsapp: contact.whatsapp || '',
            cpf: contact.cpf || '',
            contact_type: contact.contact_type || 'Contato',
            notes: contact.notes || '',
        });
        setModalOpen(true);
    };

    // Save contact
    const handleSave = async (values: typeof form.values) => {
        if (!currentCompany) return;

        try {
            const payload = {
                company_id: currentCompany.id,
                name: values.name.trim(),
                email: values.email.trim() || null,
                phone: values.phone.trim() || null,
                whatsapp: values.whatsapp.trim() || null,
                cpf: values.cpf.trim() || null,
                contact_type: values.contact_type || 'Contato',
                notes: values.notes.trim() || null,
                source: editingContact?.source || 'manual',
            };

            if (editingContact) {
                const { error } = await supabase
                    .from('company_contacts')
                    .update(payload)
                    .eq('id', editingContact.id);
                if (error) throw error;
                notifications.show({ title: 'Sucesso', message: 'Contato atualizado', color: 'green' });
            } else {
                const { error } = await supabase
                    .from('company_contacts')
                    .insert(payload);
                if (error) {
                    if (error.code === '23505') {
                        notifications.show({
                            title: 'Contato duplicado',
                            message: 'Já existe um contato com o mesmo email, CPF ou WhatsApp nesta empresa',
                            color: 'orange',
                        });
                        return;
                    }
                    throw error;
                }
                notifications.show({ title: 'Sucesso', message: 'Contato adicionado', color: 'green' });
            }

            setModalOpen(false);
            loadData();
            loadExistingTypes();
        } catch (error: any) {
            console.error('Error saving contact:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível salvar o contato',
                color: 'red',
            });
        }
    };

    // Delete contact
    const handleDelete = async (contact: Contact) => {
        if (!confirm(`Remover ${contact.name} dos contatos?`)) return;

        try {
            const { error } = await supabase
                .from('company_contacts')
                .delete()
                .eq('id', contact.id);
            if (error) throw error;
            notifications.show({ title: 'Sucesso', message: 'Contato removido', color: 'green' });
            loadData();
        } catch (error: any) {
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível remover o contato',
                color: 'red',
            });
        }
    };

    // Stats
    const withEmail = useMemo(() => contacts.filter(c => c.email).length, [contacts]);
    const withPhone = useMemo(() => contacts.filter(c => c.phone || c.whatsapp).length, [contacts]);

    const helpContent = (
        <>
            <Text size="sm">
                Esta é a <strong>base centralizada e limpa</strong> de contatos da sua empresa.
                Qualquer alteração feita aqui será refletida em todas as ferramentas conectadas.
            </Text>
            <Text size="sm" mt="xs">
                Aqui você retém apenas os <strong>dados básicos</strong> de cada contato (nome, email, telefone, WhatsApp, CPF e tipo).
                Cada ferramenta possui suas <strong>próprias diretrizes</strong> e dados específicos dentro de seu contexto.
            </Text>
            <Text size="sm" fw={500} mt="xs">Recursos:</Text>
            <Text size="sm" component="ul" ml="md">
                <li>Adicionar, editar e remover contatos</li>
                <li>Classificar por tipo: Lead, Cliente, Colaborador, Parceiro, etc.</li>
                <li>Criar tipos personalizados — basta digitar um novo tipo</li>
                <li>Buscar e filtrar por nome, email, telefone ou WhatsApp</li>
                <li>Contatos sincronizados automaticamente das ferramentas ativas</li>
            </Text>
            <Text size="xs" c="dimmed" mt="xs" fs="italic">
                Evite duplicatas: o sistema impede o cadastro de contatos com mesmo email, CPF ou WhatsApp na mesma empresa.
            </Text>
        </>
    );

    // Filter data for type select
    const typeFilterData = useMemo(() => {
        const typeCounts: Record<string, number> = {};
        contacts.forEach(c => {
            typeCounts[c.contact_type] = (typeCounts[c.contact_type] || 0) + 1;
        });
        return existingTypes.map(t => ({
            value: t,
            label: `${t} ${typeCounts[t] ? `(${typeCounts[t]})` : ''}`.trim(),
        }));
    }, [existingTypes, contacts]);

    if (!currentCompany) {
        return (
            <Container size="xl" py="md">
                <PageHeader
                    title="Contatos"
                    subtitle="Base centralizada de contatos"
                    helpContent={helpContent}
                />
                <EmptyState
                    icon={<IconAddressBook size={28} />}
                    title="Nenhuma empresa selecionada"
                    description="Selecione ou crie uma empresa para gerenciar seus contatos."
                    actionLabel="Ir para Empresas"
                    onAction={() => navigate('/painel/empresas')}
                />
            </Container>
        );
    }

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <PageHeader
                    title="Contatos"
                    subtitle={`Base centralizada de ${currentCompany.name}`}
                    actionLabel={canManage ? 'Novo Contato' : undefined}
                    actionIcon={<IconPlus size={16} />}
                    onAction={canManage ? openAddModal : undefined}
                    helpContent={helpContent}
                />

                {/* KPIs */}
                <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
                    <Card withBorder padding="md" radius="md">
                        <Group gap="xs">
                            <ThemeIcon size="md" radius="md" variant="light" color="blue">
                                <IconAddressBook size={16} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed">Total</Text>
                        </Group>
                        <Text size="xl" fw={700} mt="xs">{totalCount.toLocaleString('pt-BR')}</Text>
                    </Card>
                    <Card withBorder padding="md" radius="md">
                        <Group gap="xs">
                            <ThemeIcon size="md" radius="md" variant="light" color="green">
                                <IconMail size={16} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed">Com Email</Text>
                        </Group>
                        <Text size="xl" fw={700} mt="xs" c="green">{withEmail}</Text>
                    </Card>
                    <Card withBorder padding="md" radius="md">
                        <Group gap="xs">
                            <ThemeIcon size="md" radius="md" variant="light" color="violet">
                                <IconPhone size={16} />
                            </ThemeIcon>
                            <Text size="xs" c="dimmed">Com Telefone</Text>
                        </Group>
                        <Text size="xl" fw={700} mt="xs">{withPhone}</Text>
                    </Card>
                </SimpleGrid>

                {/* Search & Filters */}
                <Group gap="sm">
                    <TextInput
                        placeholder="Buscar por nome, email ou telefone..."
                        leftSection={<IconSearch size={16} />}
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadData()}
                        style={{ flex: 1 }}
                    />
                    <Select
                        placeholder="Tipo de contato"
                        leftSection={<IconFilter size={16} />}
                        clearable
                        data={typeFilterData}
                        value={typeFilter}
                        onChange={setTypeFilter}
                        w={200}
                    />
                </Group>

                {/* Table */}
                {loading ? (
                    <Stack gap="sm">
                        {[1, 2, 3].map(i => <Skeleton key={i} height={50} radius="md" />)}
                    </Stack>
                ) : contacts.length === 0 ? (
                    <EmptyState
                        icon={<IconAddressBook size={28} />}
                        title={totalCount === 0 ? 'Nenhum contato ainda' : 'Nenhum resultado encontrado'}
                        description={totalCount === 0
                            ? 'Adicione contatos manualmente ou eles serão sincronizados das ferramentas ativas.'
                            : 'Tente ajustar os filtros ou a busca.'
                        }
                        actionLabel={totalCount === 0 && canManage ? 'Novo Contato' : undefined}
                        actionIcon={<IconPlus size={16} />}
                        onAction={totalCount === 0 && canManage ? openAddModal : undefined}
                    />
                ) : (
                    <Card shadow="sm" padding={0} radius="md" withBorder>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Nome</Table.Th>
                                    <Table.Th>Tipo</Table.Th>
                                    <Table.Th>Email</Table.Th>
                                    <Table.Th>Telefone / WhatsApp</Table.Th>
                                    <Table.Th>Origem</Table.Th>
                                    <Table.Th>Cadastro</Table.Th>
                                    {canManage && <Table.Th>Ações</Table.Th>}
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {contacts.map(contact => (
                                    <Table.Tr key={contact.id}>
                                        <Table.Td>
                                            <Group gap="sm">
                                                <Avatar size="sm" radius="xl" color={typeColors[contact.contact_type] || 'blue'}>
                                                    {contact.name.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Text size="sm" fw={500}>{contact.name}</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                variant="light"
                                                color={typeColors[contact.contact_type] || 'gray'}
                                                size="sm"
                                            >
                                                {contact.contact_type}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{contact.email || '—'}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Stack gap={2}>
                                                {contact.phone && <Text size="sm">{contact.phone}</Text>}
                                                {contact.whatsapp && (
                                                    <Group gap={4}>
                                                        <IconBrandWhatsapp size={12} color="green" />
                                                        <Text size="xs" c="green">{contact.whatsapp}</Text>
                                                    </Group>
                                                )}
                                                {!contact.phone && !contact.whatsapp && (
                                                    <Text size="sm" c="dimmed">—</Text>
                                                )}
                                            </Stack>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge variant="outline" size="xs">
                                                {sourceLabels[contact.source] || contact.source}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{formatDate(contact.created_at)}</Text>
                                        </Table.Td>
                                        {canManage && (
                                            <Table.Td>
                                                <Menu shadow="md" width={150}>
                                                    <Menu.Target>
                                                        <ActionIcon variant="subtle">
                                                            <IconDotsVertical size={16} />
                                                        </ActionIcon>
                                                    </Menu.Target>
                                                    <Menu.Dropdown>
                                                        <Menu.Item
                                                            leftSection={<IconEdit style={{ width: rem(14), height: rem(14) }} />}
                                                            onClick={() => openEditModal(contact)}
                                                        >
                                                            Editar
                                                        </Menu.Item>
                                                        <Menu.Item
                                                            color="red"
                                                            leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
                                                            onClick={() => handleDelete(contact)}
                                                        >
                                                            Remover
                                                        </Menu.Item>
                                                    </Menu.Dropdown>
                                                </Menu>
                                            </Table.Td>
                                        )}
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                )}

                <Text size="xs" c="dimmed" ta="right">
                    Exibindo {contacts.length} de {totalCount} contatos
                </Text>
            </Stack>

            {/* Modal Add/Edit Contact */}
            <Modal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingContact ? 'Editar Contato' : 'Novo Contato'}
                size="md"
            >
                <form onSubmit={form.onSubmit(handleSave)}>
                    <Stack gap="md">
                        <TextInput
                            label="Nome"
                            placeholder="Nome completo"
                            required
                            {...form.getInputProps('name')}
                        />

                        <Autocomplete
                            label="Tipo de Contato"
                            placeholder="Selecione ou digite um novo tipo"
                            data={existingTypes}
                            {...form.getInputProps('contact_type')}
                        />

                        <Group grow>
                            <TextInput
                                label="Email"
                                placeholder="email@exemplo.com"
                                leftSection={<IconMail size={16} />}
                                {...form.getInputProps('email')}
                            />
                            <TextInput
                                label="CPF"
                                placeholder="000.000.000-00"
                                leftSection={<IconId size={16} />}
                                {...form.getInputProps('cpf')}
                            />
                        </Group>

                        <Group grow>
                            <TextInput
                                label="Telefone"
                                placeholder="(11) 99999-9999"
                                leftSection={<IconPhone size={16} />}
                                {...form.getInputProps('phone')}
                            />
                            <TextInput
                                label="WhatsApp"
                                placeholder="(11) 99999-9999"
                                leftSection={<IconBrandWhatsapp size={16} />}
                                {...form.getInputProps('whatsapp')}
                            />
                        </Group>

                        <Textarea
                            label="Observações"
                            placeholder="Notas sobre o contato..."
                            autosize
                            minRows={2}
                            maxRows={4}
                            {...form.getInputProps('notes')}
                        />

                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={() => setModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit">
                                {editingContact ? 'Salvar' : 'Adicionar'}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
}
