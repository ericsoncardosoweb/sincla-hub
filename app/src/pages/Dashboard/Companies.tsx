import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Container,
    Text,
    Button,
    Group,
    Badge,
    Modal,
    TextInput,
    Autocomplete,
    Stack,
    ActionIcon,
    Card,
    Avatar,
    SimpleGrid,
    Menu,
    rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconBuilding, IconUsers, IconSearch, IconDotsVertical, IconArrowRight, IconTrash } from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { PageHeader, EmptyState } from '../../components/shared';

interface CompanyStats {
    members_count: number;
    products_count: number;
}

export function Companies() {
    const navigate = useNavigate();
    const { companies, currentCompany, setCurrentCompany, refreshCompanies, subscriber } = useAuth();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<typeof currentCompany>(null);
    const [stats, setStats] = useState<Record<string, CompanyStats>>({});
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [segments, setSegments] = useState<{ value: string; group: string }[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();

    // Auto-open create modal when ?criar=true
    useEffect(() => {
        if (searchParams.get('criar') === 'true') {
            openCreateModal();
            setSearchParams({}, { replace: true });
        }
    }, [searchParams]);

    const form = useForm({
        initialValues: {
            name: '',
            slug: '',
            cnpj: '',
            description: '',
        },
    });

    useEffect(() => {
        loadStats();
    }, [companies]);

    useEffect(() => {
        loadSegments();
    }, []);

    const loadSegments = async () => {
        try {
            const { data } = await supabase
                .from('business_segments')
                .select('name, category')
                .eq('is_active', true)
                .order('sort_order');

            if (data) {
                setSegments(data.map(s => ({ value: s.name, group: s.category })));
            }
        } catch (err) {
            console.error('Error loading segments:', err);
        }
    };

    const loadStats = async () => {
        const statsMap: Record<string, CompanyStats> = {};

        for (const company of companies) {
            const [members, subscriptions] = await Promise.all([
                supabase.from('company_members').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
                supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'active'),
            ]);

            statsMap[company.id] = {
                members_count: members.count || 0,
                products_count: subscriptions.count || 0,
            };
        }

        setStats(statsMap);
    };

    const slugify = (text: string) => {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // remove acentos
            .replace(/[^a-z0-9]+/g, '-')     // substitui caracteres especiais por hifens
            .replace(/^-|-$/g, '')            // remove hifens no início/fim
            .substring(0, 60);
    };

    const checkSlugAvailability = useCallback(async (slug: string) => {
        if (!slug || slug.length < 2) {
            setSlugStatus('idle');
            return;
        }

        setSlugStatus('checking');

        try {
            // Check if slug exists
            const { data } = await supabase
                .from('companies')
                .select('slug')
                .ilike('slug', `${slug}%`)
                .limit(50);

            const existingSlugs = (data || []).map(r => r.slug);

            if (!existingSlugs.includes(slug)) {
                setSlugStatus('available');
                return;
            }

            // Auto-increment: find next available slug
            let counter = 2;
            let candidate = `${slug}-${counter}`;
            while (existingSlugs.includes(candidate)) {
                counter++;
                candidate = `${slug}-${counter}`;
            }

            form.setFieldValue('slug', candidate);
            setSlugStatus('available');
        } catch {
            setSlugStatus('idle');
        }
    }, []);

    const handleNameChange = (name: string) => {
        form.setFieldValue('name', name);

        if (!editingCompany) {
            const slug = slugify(name);
            form.setFieldValue('slug', slug);

            // Debounce slug check
            if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
            slugCheckTimer.current = setTimeout(() => {
                checkSlugAvailability(slug);
            }, 500);
        }
    };

    const openCreateModal = () => {
        setEditingCompany(null);
        form.reset();
        setSlugStatus('idle');
        setModalOpen(true);
    };

    const openEditModal = (company: typeof currentCompany) => {
        if (!company) return;
        setEditingCompany(company);
        form.setValues({
            name: company.name,
            slug: company.slug,
            cnpj: company.cnpj || '',
            description: company.description || '',
        });
        setModalOpen(true);
    };

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        try {
            if (editingCompany) {
                const { error } = await supabase
                    .from('companies')
                    .update({
                        name: values.name,
                        cnpj: values.cnpj || null,
                        description: values.description || null,
                    })
                    .eq('id', editingCompany.id);

                if (error) throw error;

                notifications.show({
                    title: 'Sucesso',
                    message: 'Empresa atualizada com sucesso',
                    color: 'green',
                });
            } else {
                // Create new company
                const { data, error } = await supabase
                    .from('companies')
                    .insert({
                        subscriber_id: subscriber?.id,
                        name: values.name,
                        slug: values.slug.toLowerCase().replace(/\s+/g, '-'),
                        cnpj: values.cnpj || null,
                        description: values.description || null,
                    })
                    .select()
                    .single();

                if (error) throw error;

                // Add owner as member
                await supabase.from('company_members').insert({
                    company_id: data.id,
                    user_id: subscriber?.id,
                    role: 'owner',
                });

                notifications.show({
                    title: 'Sucesso',
                    message: 'Empresa criada com sucesso',
                    color: 'green',
                });

                // Update local context synchronously before navigating
                await refreshCompanies();
                await setCurrentCompany(data.id);

                setModalOpen(false);
                navigate('/painel/configuracoes');
                return;
            }

            setModalOpen(false);
            refreshCompanies();
            loadStats();
        } catch (error: any) {
            console.error('Error saving company:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível salvar a empresa',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCompany = (companyId: string) => {
        setCurrentCompany(companyId);
        navigate('/painel/configuracoes');
    };

    const handleDeleteCompany = async (company: typeof currentCompany) => {
        if (!company) return;
        const activeProducts = stats[company.id]?.products_count || 0;
        if (activeProducts > 0) {
            notifications.show({
                title: 'Ação não permitida',
                message: 'Não é possível excluir uma empresa com planos ativos. Cancele os planos antes.',
                color: 'red',
            });
            return;
        }

        if (!confirm(`Tem certeza que deseja excluir a empresa "${company.name}"? Esta ação não pode ser desfeita.`)) return;

        try {
            const { error } = await supabase
                .from('companies')
                .delete()
                .eq('id', company.id);

            if (error) throw error;

            notifications.show({
                title: 'Sucesso',
                message: 'Empresa excluída com sucesso',
                color: 'green',
            });

            if (currentCompany?.id === company.id) {
                setCurrentCompany(null as any);
            }
            refreshCompanies();
        } catch (error: any) {
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível excluir a empresa',
                color: 'red',
            });
        }
    };

    const filteredCompanies = useMemo(() => {
        if (!search) return companies;
        const s = search.toLowerCase();
        return companies.filter(c =>
            c.name.toLowerCase().includes(s) ||
            (c.cnpj || '').toLowerCase().includes(s)
        );
    }, [companies, search]);

    return (
        <Container size="xl" py="md">
            <PageHeader
                title="Minhas Empresas"
                subtitle="Gerencie suas empresas e escolha qual acessar"
                actionLabel="Nova Empresa"
                actionIcon={<IconPlus size={16} />}
                onAction={openCreateModal}
                helpContent={
                    <>
                        <Text size="sm">Neste módulo você gerencia suas empresas cadastradas. Aqui é possível:</Text>
                        <Text size="sm" component="ul" ml="md">
                            <li>Criar novas empresas</li>
                            <li>Editar os dados cadastrais</li>
                            <li>Alternar entre empresas ativas</li>
                        </Text>
                    </>
                }
            />

            {/* Search */}
            <TextInput
                placeholder="Buscar por nome ou CNPJ..."
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                mb="md"
                style={{ maxWidth: 360 }}
            />

            {filteredCompanies.length === 0 ? (
                <EmptyState
                    icon={<IconBuilding size={28} />}
                    title={companies.length === 0 ? 'Nenhuma empresa cadastrada' : 'Nenhuma empresa encontrada'}
                    description={companies.length === 0
                        ? 'Crie sua primeira empresa para começar a usar o Sincla Hub.'
                        : 'Tente ajustar a busca.'}
                    actionLabel={companies.length === 0 ? 'Nova Empresa' : undefined}
                    actionIcon={<IconPlus size={16} />}
                    onAction={companies.length === 0 ? openCreateModal : undefined}
                />
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                    {filteredCompanies.map((company) => (
                        <Card
                            key={company.id}
                            shadow="sm"
                            padding="lg"
                            radius="md"
                            withBorder
                            style={{
                                borderColor: currentCompany?.id === company.id ? 'var(--mantine-color-blue-5)' : undefined,
                                cursor: 'pointer',
                                position: 'relative',
                            }}
                            onClick={() => handleSelectCompany(company.id)}
                        >
                            {/* Menu top-right */}
                            <div style={{ position: 'absolute', top: 12, right: 12 }}>
                                <Menu shadow="md" width={160}>
                                    <Menu.Target>
                                        <ActionIcon
                                            variant="subtle"
                                            color="gray"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <IconDotsVertical size={16} />
                                        </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Item
                                            leftSection={<IconArrowRight style={{ width: rem(14), height: rem(14) }} />}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectCompany(company.id);
                                            }}
                                        >
                                            Acessar
                                        </Menu.Item>
                                        <Menu.Item
                                            leftSection={<IconEdit style={{ width: rem(14), height: rem(14) }} />}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditModal(company);
                                            }}
                                        >
                                            Editar
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item
                                            color="red"
                                            leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
                                            disabled={(stats[company.id]?.products_count || 0) > 0}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteCompany(company);
                                            }}
                                        >
                                            {(stats[company.id]?.products_count || 0) > 0
                                                ? 'Planos ativos'
                                                : 'Excluir'
                                            }
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </div>

                            <Group justify="space-between" mb="xs">
                                <Avatar
                                    src={company.branding?.logo}
                                    radius="md"
                                    size="lg"
                                    color="blue"
                                >
                                    <IconBuilding size={24} />
                                </Avatar>
                                {currentCompany?.id === company.id && (
                                    <Badge color="blue" mr={32}>Ativa</Badge>
                                )}
                            </Group>

                            <Text fw={600} size="lg" mt="md" lineClamp={1}>
                                {company.name}
                            </Text>

                            {company.cnpj && (
                                <Text size="sm" c="dimmed" mt={4}>
                                    CNPJ: {company.cnpj}
                                </Text>
                            )}

                            <Group mt="md" gap="lg">
                                <div>
                                    <Text size="xs" c="dimmed">Membros</Text>
                                    <Group gap={4}>
                                        <IconUsers size={14} />
                                        <Text size="sm" fw={500}>{stats[company.id]?.members_count || 0}</Text>
                                    </Group>
                                </div>
                                <div>
                                    <Text size="xs" c="dimmed">Produtos</Text>
                                    <Text size="sm" fw={500}>{stats[company.id]?.products_count || 0}</Text>
                                </div>
                            </Group>
                        </Card>
                    ))}
                </SimpleGrid>
            )}

            {/* Modal */}
            <Modal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
                size="md"
            >
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">
                        <TextInput
                            label="Nome da Empresa"
                            placeholder="Minha Empresa Ltda"
                            required
                            value={form.values.name}
                            onChange={(e) => handleNameChange(e.currentTarget.value)}
                            error={form.errors.name}
                        />

                        {!editingCompany && (
                            <TextInput
                                label="Slug"
                                placeholder="minha-empresa"
                                description={
                                    slugStatus === 'checking' ? '⏳ Verificando disponibilidade...' :
                                        slugStatus === 'available' ? '✅ Slug disponível' :
                                            slugStatus === 'taken' ? '❌ Slug em uso, ajustado automaticamente' :
                                                'Gerado automaticamente a partir do nome'
                                }
                                required
                                styles={{
                                    description: {
                                        color: slugStatus === 'available' ? 'var(--mantine-color-green-6)' :
                                            slugStatus === 'taken' ? 'var(--mantine-color-red-6)' :
                                                slugStatus === 'checking' ? 'var(--mantine-color-blue-6)' :
                                                    undefined
                                    }
                                }}
                                {...form.getInputProps('slug')}
                                onChange={(e) => {
                                    form.setFieldValue('slug', slugify(e.currentTarget.value));
                                    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
                                    slugCheckTimer.current = setTimeout(() => {
                                        checkSlugAvailability(slugify(e.currentTarget.value));
                                    }, 500);
                                }}
                            />
                        )}

                        {(() => {
                            const hasActivePlans = editingCompany && (stats[editingCompany.id]?.products_count || 0) > 0;
                            return (
                                <TextInput
                                    label="CNPJ"
                                    placeholder="00.000.000/0000-00"
                                    disabled={!!hasActivePlans}
                                    description={hasActivePlans ? '🔒 CNPJ não pode ser alterado com planos ativos' : undefined}
                                    styles={hasActivePlans ? {
                                        description: { color: 'var(--mantine-color-orange-6)' }
                                    } : undefined}
                                    {...form.getInputProps('cnpj')}
                                />
                            );
                        })()}

                        <Autocomplete
                            label="Segmento"
                            placeholder="Digite para buscar..."
                            data={segments}
                            limit={10}
                            {...form.getInputProps('description')}
                        />

                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={() => setModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" loading={loading}>
                                {editingCompany ? 'Salvar' : 'Criar'}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
}
