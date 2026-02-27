import { useState, useEffect } from 'react';
import {
    Container, Title, Text, Card, Group, Stack,
    TextInput, Textarea, Button, Table, Badge, Switch,
    Modal, ActionIcon, Tooltip, CopyButton,
    SimpleGrid, Paper,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
    IconFileText, IconPlus, IconEdit, IconTrash,
    IconEye, IconVariable, IconCopy, IconCheck,
} from '@tabler/icons-react';
import { supabase } from '../../shared/lib/supabase';

// ============================
// Types
// ============================

interface LegalPage {
    id: string;
    slug: string;
    title: string;
    content: string;
    is_published: boolean;
    version: number;
    published_at: string;
    created_at: string;
    updated_at: string;
}

// ============================
// Variables available
// ============================

const TEMPLATE_VARIABLES = [
    { key: '{{empresa_nome}}', label: 'Nome da Empresa', example: 'Sincla Tecnologia Ltda' },
    { key: '{{empresa_cnpj}}', label: 'CNPJ', example: '00.000.000/0000-00' },
    { key: '{{empresa_endereco}}', label: 'Endereço', example: 'São Paulo, SP - Brasil' },
    { key: '{{empresa_whatsapp}}', label: 'WhatsApp', example: '(11) 99999-9999' },
    { key: '{{empresa_telefone}}', label: 'Telefone', example: '(11) 3333-3333' },
    { key: '{{empresa_email}}', label: 'Email', example: 'contato@sincla.com.br' },
    { key: '{{site_url}}', label: 'URL do Site', example: 'https://sincla.com.br' },
    { key: '{{app_url}}', label: 'URL do App', example: 'https://app.sincla.com.br' },
];

// ============================
// Component
// ============================

export function AdminLegalPages() {
    const [pages, setPages] = useState<LegalPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpened, setModalOpened] = useState(false);
    const [editingPage, setEditingPage] = useState<LegalPage | null>(null);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const form = useForm({
        initialValues: {
            title: '',
            slug: '',
            content: '',
            is_published: true,
        },
        validate: {
            title: (v) => (v.trim().length < 2 ? 'Título é obrigatório' : null),
            slug: (v) => (v.trim().length < 2 ? 'Slug é obrigatório' : null),
        },
    });

    // ============================
    // Load data
    // ============================

    const loadPages = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('legal_pages')
                .select('*')
                .order('title');

            if (error) throw error;
            setPages(data || []);
        } catch (error: any) {
            console.error('Error loading legal pages:', error);
            notifications.show({
                title: 'Erro',
                message: 'Falha ao carregar páginas legais',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPages();
    }, []);

    // ============================
    // Auto-generate slug
    // ============================

    useEffect(() => {
        if (!editingPage) {
            const slug = form.values.title
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
            form.setFieldValue('slug', slug);
        }
    }, [form.values.title, editingPage]);

    // ============================
    // CRUD
    // ============================

    const handleOpenCreate = () => {
        setEditingPage(null);
        form.reset();
        setModalOpened(true);
    };

    const handleOpenEdit = (page: LegalPage) => {
        setEditingPage(page);
        form.setValues({
            title: page.title,
            slug: page.slug,
            content: page.content,
            is_published: page.is_published,
        });
        setModalOpened(true);
    };

    const handleSave = async (values: typeof form.values) => {
        setSaving(true);
        try {
            if (editingPage) {
                // Update
                const { error } = await supabase
                    .from('legal_pages')
                    .update({
                        title: values.title,
                        slug: values.slug,
                        content: values.content,
                        is_published: values.is_published,
                        version: editingPage.version + 1,
                        updated_at: new Date().toISOString(),
                        published_at: values.is_published ? new Date().toISOString() : editingPage.published_at,
                    })
                    .eq('id', editingPage.id);

                if (error) throw error;

                notifications.show({
                    title: 'Sucesso',
                    message: `"${values.title}" atualizado com sucesso`,
                    color: 'green',
                });
            } else {
                // Create
                const { error } = await supabase
                    .from('legal_pages')
                    .insert({
                        title: values.title,
                        slug: values.slug,
                        content: values.content,
                        is_published: values.is_published,
                    });

                if (error) throw error;

                notifications.show({
                    title: 'Sucesso',
                    message: `"${values.title}" criado com sucesso`,
                    color: 'green',
                });
            }

            setModalOpened(false);
            form.reset();
            await loadPages();
        } catch (error: any) {
            console.error('Error saving page:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Falha ao salvar',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (page: LegalPage) => {
        if (!confirm(`Tem certeza que deseja excluir "${page.title}"?`)) return;

        try {
            const { error } = await supabase
                .from('legal_pages')
                .delete()
                .eq('id', page.id);

            if (error) throw error;

            notifications.show({
                title: 'Sucesso',
                message: `"${page.title}" excluído`,
                color: 'green',
            });
            await loadPages();
        } catch (error: any) {
            notifications.show({
                title: 'Erro',
                message: error.message || 'Falha ao excluir',
                color: 'red',
            });
        }
    };

    const handleTogglePublish = async (page: LegalPage) => {
        try {
            const { error } = await supabase
                .from('legal_pages')
                .update({
                    is_published: !page.is_published,
                    updated_at: new Date().toISOString(),
                    published_at: !page.is_published ? new Date().toISOString() : page.published_at,
                })
                .eq('id', page.id);

            if (error) throw error;
            await loadPages();
        } catch (error: any) {
            notifications.show({
                title: 'Erro',
                message: 'Falha ao alterar status',
                color: 'red',
            });
        }
    };

    const insertVariable = (variable: string) => {
        const currentContent = form.values.content;
        form.setFieldValue('content', currentContent + variable);
    };

    const handlePreview = async (page: LegalPage) => {
        // Load platform settings to replace variables
        try {
            const { data: settings } = await supabase
                .from('platform_settings')
                .select('key, value');

            let html = page.content;
            if (settings) {
                settings.forEach(s => {
                    html = html.replace(new RegExp(`\\{\\{${s.key}\\}\\}`, 'g'), s.value);
                });
            }
            setPreviewHtml(html);
        } catch {
            setPreviewHtml(page.content);
        }
    };

    // ============================
    // Render
    // ============================

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                {/* Header */}
                <Group justify="space-between">
                    <div>
                        <Title order={2}>Políticas e Termos</Title>
                        <Text c="dimmed">Gerencie documentos legais da plataforma</Text>
                    </div>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={handleOpenCreate}
                    >
                        Nova Página Legal
                    </Button>
                </Group>

                {/* KPIs */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text c="dimmed" size="sm">Total de Documentos</Text>
                                <Title order={3}>{pages.length}</Title>
                            </div>
                            <IconFileText size={28} color="gray" />
                        </Group>
                    </Card>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text c="dimmed" size="sm">Publicados</Text>
                                <Title order={3}>{pages.filter(p => p.is_published).length}</Title>
                            </div>
                            <IconEye size={28} color="green" />
                        </Group>
                    </Card>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Group justify="space-between">
                            <div>
                                <Text c="dimmed" size="sm">Rascunhos</Text>
                                <Title order={3}>{pages.filter(p => !p.is_published).length}</Title>
                            </div>
                            <IconEdit size={28} color="orange" />
                        </Group>
                    </Card>
                </SimpleGrid>

                {/* Table */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Título</Table.Th>
                                <Table.Th>Slug</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Versão</Table.Th>
                                <Table.Th>Atualizado em</Table.Th>
                                <Table.Th>Ações</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {loading ? (
                                <Table.Tr>
                                    <Table.Td colSpan={6}>
                                        <Text ta="center" c="dimmed" py="xl">Carregando...</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : pages.length === 0 ? (
                                <Table.Tr>
                                    <Table.Td colSpan={6}>
                                        <Text ta="center" c="dimmed" py="xl">Nenhuma página legal cadastrada</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : (
                                pages.map(page => (
                                    <Table.Tr key={page.id}>
                                        <Table.Td>
                                            <Text fw={500}>{page.title}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" c="dimmed" ff="monospace">/{page.slug}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Switch
                                                checked={page.is_published}
                                                onChange={() => handleTogglePublish(page)}
                                                label={page.is_published ? 'Publicado' : 'Rascunho'}
                                                size="sm"
                                            />
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge variant="light" color="gray">v{page.version}</Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">
                                                {new Date(page.updated_at).toLocaleDateString('pt-BR')}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap="xs">
                                                <Tooltip label="Visualizar">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="blue"
                                                        onClick={() => handlePreview(page)}
                                                    >
                                                        <IconEye size={16} />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="Editar">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="yellow"
                                                        onClick={() => handleOpenEdit(page)}
                                                    >
                                                        <IconEdit size={16} />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="Excluir">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="red"
                                                        onClick={() => handleDelete(page)}
                                                    >
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))
                            )}
                        </Table.Tbody>
                    </Table>
                </Card>

                {/* Variables Reference */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Title order={4} mb="md">
                        <Group gap="xs">
                            <IconVariable size={20} />
                            Variáveis Disponíveis
                        </Group>
                    </Title>
                    <Text size="sm" c="dimmed" mb="md">
                        Use estas variáveis no conteúdo dos documentos. Elas serão substituídas pelos valores
                        configurados nas Configurações da plataforma.
                    </Text>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
                        {TEMPLATE_VARIABLES.map(v => (
                            <Paper key={v.key} p="sm" withBorder radius="md">
                                <Group justify="space-between" mb={4}>
                                    <Text size="xs" fw={600} ff="monospace">{v.key}</Text>
                                    <CopyButton value={v.key}>
                                        {({ copied, copy }) => (
                                            <ActionIcon size="xs" variant="subtle" onClick={copy}>
                                                {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                                            </ActionIcon>
                                        )}
                                    </CopyButton>
                                </Group>
                                <Text size="xs" c="dimmed">{v.label}</Text>
                                <Text size="xs" c="dimmed" fs="italic">{v.example}</Text>
                            </Paper>
                        ))}
                    </SimpleGrid>
                </Card>
            </Stack>

            {/* Edit/Create Modal */}
            <Modal
                opened={modalOpened}
                onClose={() => setModalOpened(false)}
                title={editingPage ? `Editar: ${editingPage.title}` : 'Nova Página Legal'}
                size="xl"
                centered
            >
                <form onSubmit={form.onSubmit(handleSave)}>
                    <Stack gap="md">
                        <TextInput
                            label="Título"
                            placeholder="Política de Privacidade"
                            required
                            {...form.getInputProps('title')}
                        />
                        <TextInput
                            label="Slug (URL)"
                            placeholder="politica-privacidade"
                            description="Usado na URL: sincla.com.br/{slug}"
                            required
                            leftSection={<Text size="xs" c="dimmed">/</Text>}
                            {...form.getInputProps('slug')}
                        />

                        {/* Variables toolbar */}
                        <div>
                            <Text size="sm" fw={500} mb={4}>Inserir Variável</Text>
                            <Group gap="xs" wrap="wrap">
                                {TEMPLATE_VARIABLES.map(v => (
                                    <Button
                                        key={v.key}
                                        size="xs"
                                        variant="light"
                                        color="blue"
                                        leftSection={<IconVariable size={12} />}
                                        onClick={() => insertVariable(v.key)}
                                    >
                                        {v.label}
                                    </Button>
                                ))}
                            </Group>
                        </div>

                        <Textarea
                            label="Conteúdo (HTML)"
                            placeholder="<h1>Título</h1><p>Conteúdo...</p>"
                            description="Use HTML para formatar o documento. As variáveis {{...}} serão substituídas automaticamente."
                            minRows={15}
                            autosize
                            {...form.getInputProps('content')}
                        />

                        <Switch
                            label="Publicado"
                            description="Documentos publicados ficam visíveis no site"
                            {...form.getInputProps('is_published', { type: 'checkbox' })}
                        />

                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={() => setModalOpened(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" loading={saving}>
                                {editingPage ? 'Salvar Alterações' : 'Criar Documento'}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            {/* Preview Modal */}
            <Modal
                opened={previewHtml !== null}
                onClose={() => setPreviewHtml(null)}
                title="Pré-visualização"
                size="lg"
                centered
            >
                {previewHtml && (
                    <div
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                        style={{
                            padding: '16px',
                            lineHeight: 1.7,
                            fontFamily: 'inherit',
                        }}
                    />
                )}
            </Modal>
        </Container>
    );
}
