import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Text,
    Card,
    Stack,
    TextInput,
    Textarea,
    Button,
    Group,
    Tabs,
    ColorInput,
    FileInput,
    Avatar,
    Divider,
    Switch,
    CopyButton,
    ActionIcon,
    Tooltip,
    Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconSettings, IconPalette, IconBell, IconUpload, IconLink, IconWorld, IconCopy } from '@tabler/icons-react';
import { useAuth, useCompany } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { uploadEmpresaLogo, uploadEmpresaAsset, deleteFile } from '../../shared/services/storage';
import { PageHeader, EmptyState } from '../../components/shared';

export function CompanySettings() {
    const navigate = useNavigate();
    const { currentCompany, refreshCompanies } = useAuth();
    const { isOwner, isAdmin } = useCompany();
    const [loading, setLoading] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
    const [faviconFile, setFaviconFile] = useState<File | null>(null);
    const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
    const [uploadedFaviconUrl, setUploadedFaviconUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const form = useForm({
        initialValues: {
            name: '',
            cnpj: '',
            email: '',
            phone: '',
            address: '',
            website: '',
            primary_color: '#228be6',
            secondary_color: '#1971c2',
        },
    });

    useEffect(() => {
        if (currentCompany) {
            const s = (currentCompany as any).settings || {};
            form.setValues({
                name: currentCompany.name,
                cnpj: currentCompany.cnpj || '',
                email: s.email || '',
                phone: s.phone || '',
                address: s.address || '',
                website: s.website || '',
                primary_color: currentCompany.primary_color || '#228be6',
                secondary_color: currentCompany.secondary_color || '#1971c2',
            });
            // Reset upload state
            setUploadedLogoUrl(null);
            setLogoPreview(null);
            setLogoFile(null);
            setUploadedFaviconUrl(null);
            setFaviconPreview(null);
            setFaviconFile(null);
        }
    }, [currentCompany]);

    // Handle logo file selection => immediate upload
    const handleLogoChange = async (file: File | null) => {
        if (!file || !currentCompany) return;
        setLogoFile(file);

        // Show local preview immediately
        setLogoPreview(URL.createObjectURL(file));

        // Upload to Bunny CDN
        setUploading(true);
        try {
            // Delete old logo if exists
            const oldLogoUrl = (currentCompany as any).logo_url;
            if (oldLogoUrl && oldLogoUrl.includes('sincla-storage.b-cdn.net')) {
                const oldPath = oldLogoUrl.replace('https://sincla-storage.b-cdn.net/', '');
                await deleteFile(oldPath);
            }

            const result = await uploadEmpresaLogo(currentCompany.slug, file);
            if (result.success && result.url) {
                setUploadedLogoUrl(result.url);
                notifications.show({
                    title: 'Logo enviado',
                    message: 'Logo carregado com sucesso! Clique em Salvar para confirmar.',
                    color: 'green',
                });
            } else {
                notifications.show({
                    title: 'Erro no upload',
                    message: result.error || 'Não foi possível enviar o logo',
                    color: 'red',
                });
                setLogoPreview(null);
                setLogoFile(null);
            }
        } catch {
            notifications.show({
                title: 'Erro no upload',
                message: 'Falha ao enviar o logo',
                color: 'red',
            });
            setLogoPreview(null);
            setLogoFile(null);
        } finally {
            setUploading(false);
        }
    };

    // Handle favicon file selection => immediate upload
    const handleFaviconChange = async (file: File | null) => {
        if (!file || !currentCompany) return;
        setFaviconFile(file);
        setFaviconPreview(URL.createObjectURL(file));

        setUploading(true);
        try {
            const oldFaviconUrl = (currentCompany as any).favicon_url;
            if (oldFaviconUrl && oldFaviconUrl.includes('sincla-storage.b-cdn.net')) {
                const oldPath = oldFaviconUrl.replace('https://sincla-storage.b-cdn.net/', '');
                await deleteFile(oldPath);
            }

            const result = await uploadEmpresaAsset(currentCompany.slug, 'favicon', file);
            if (result.success && result.url) {
                setUploadedFaviconUrl(result.url);
                notifications.show({
                    title: 'Favicon enviado',
                    message: 'Favicon carregado com sucesso! Clique em Salvar para confirmar.',
                    color: 'green',
                });
            } else {
                notifications.show({
                    title: 'Erro no upload',
                    message: result.error || 'Não foi possível enviar o favicon',
                    color: 'red',
                });
                setFaviconPreview(null);
                setFaviconFile(null);
            }
        } catch {
            notifications.show({
                title: 'Erro no upload',
                message: 'Falha ao enviar o favicon',
                color: 'red',
            });
            setFaviconPreview(null);
            setFaviconFile(null);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (values: typeof form.values) => {
        if (!currentCompany) return;

        setLoading(true);
        try {
            // Use uploaded URLs or keep existing
            const logoUrl = uploadedLogoUrl || (currentCompany as any).logo_url || null;
            const faviconUrl = uploadedFaviconUrl || (currentCompany as any).favicon_url || null;

            // Update company - only columns that exist in the table
            const { error } = await supabase
                .from('companies')
                .update({
                    name: values.name,
                    cnpj: values.cnpj || null,
                    primary_color: values.primary_color,
                    secondary_color: values.secondary_color,
                    logo_url: logoUrl || null,
                    favicon_url: faviconUrl || null,
                    // Store extra info in settings JSONB
                    settings: {
                        ...((currentCompany as any).settings || {}),
                        email: values.email || null,
                        phone: values.phone || null,
                        address: values.address || null,
                        website: values.website || null,
                    },
                })
                .eq('id', currentCompany.id);

            if (error) throw error;

            notifications.show({
                title: 'Sucesso',
                message: 'Configurações salvas com sucesso',
                color: 'green',
            });

            refreshCompanies();
        } catch (error: any) {
            console.error('Error saving settings:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível salvar as configurações',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const canEdit = isOwner || isAdmin;

    if (!currentCompany) {
        return (
            <Container size="md" py="md">
                <PageHeader
                    title="Configurações da Empresa"
                    subtitle="Personalize os dados da sua empresa"
                    helpContent="Aqui você configura dados cadastrais, branding e notificações da empresa."
                />
                <EmptyState
                    icon={<IconSettings size={28} />}
                    title="Nenhuma empresa selecionada"
                    description="Selecione ou crie uma empresa para acessar as configurações."
                    actionLabel="Ir para Empresas"
                    onAction={() => navigate('/painel/empresas')}
                />
            </Container>
        );
    }

    return (
        <Container size="md" py="md">
            <PageHeader
                title="Configurações da Empresa"
                subtitle={`Personalize ${currentCompany.name}`}
                helpContent={
                    <>
                        <Text size="sm">Neste módulo você configura os dados cadastrais, branding, domínio e notificações da empresa selecionada.</Text>
                        <Text size="sm" component="ul" ml="md">
                            <li>Aba Geral: nome, CNPJ, contato e endereço</li>
                            <li>Aba Branding: logo e cores da marca</li>
                            <li>Aba Domínio: link da empresa e domínio personalizado</li>
                            <li>Aba Notificações: preferências de comunicação</li>
                        </Text>
                    </>
                }
            />

            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Tabs defaultValue="general">
                    <Tabs.List mb="lg">
                        <Tabs.Tab value="general" leftSection={<IconSettings size={16} />}>
                            Geral
                        </Tabs.Tab>
                        <Tabs.Tab value="branding" leftSection={<IconPalette size={16} />}>
                            Branding
                        </Tabs.Tab>
                        <Tabs.Tab value="domain" leftSection={<IconWorld size={16} />}>
                            Domínio
                        </Tabs.Tab>
                        <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>
                            Notificações
                        </Tabs.Tab>
                    </Tabs.List>

                    {/* General Settings */}
                    <Tabs.Panel value="general">
                        <Card shadow="sm" padding="lg" radius="md">
                            <Stack gap="md">
                                <TextInput
                                    label="Nome da Empresa"
                                    placeholder="Minha Empresa Ltda"
                                    disabled={!canEdit}
                                    {...form.getInputProps('name')}
                                />

                                <Group grow>
                                    <TextInput
                                        label="CNPJ"
                                        placeholder="00.000.000/0000-00"
                                        disabled={!canEdit}
                                        {...form.getInputProps('cnpj')}
                                    />
                                    <TextInput
                                        label="Telefone"
                                        placeholder="(11) 99999-9999"
                                        disabled={!canEdit}
                                        {...form.getInputProps('phone')}
                                    />
                                </Group>

                                <TextInput
                                    label="Email"
                                    placeholder="contato@empresa.com"
                                    disabled={!canEdit}
                                    {...form.getInputProps('email')}
                                />

                                <TextInput
                                    label="Website"
                                    placeholder="https://www.empresa.com"
                                    disabled={!canEdit}
                                    {...form.getInputProps('website')}
                                />

                                <Textarea
                                    label="Endereço"
                                    placeholder="Rua, número, bairro, cidade - UF"
                                    disabled={!canEdit}
                                    {...form.getInputProps('address')}
                                />
                            </Stack>
                        </Card>
                    </Tabs.Panel>

                    {/* Branding Settings */}
                    <Tabs.Panel value="branding">
                        <Card shadow="sm" padding="lg" radius="md">
                            <Stack gap="md">
                                <div>
                                    <Text size="sm" fw={500} mb="xs">Logo da Empresa</Text>
                                    <Group>
                                        <Avatar
                                            src={logoPreview || (currentCompany as any).logo_url}
                                            size="xl"
                                            radius="md"
                                            color="blue"
                                        >
                                            {currentCompany.name.charAt(0)}
                                        </Avatar>
                                        <FileInput
                                            placeholder="Selecionar arquivo"
                                            accept="image/*"
                                            leftSection={<IconUpload size={16} />}
                                            value={logoFile}
                                            onChange={handleLogoChange}
                                            disabled={!canEdit || uploading}
                                        />
                                    </Group>
                                </div>

                                <Divider my="sm" />

                                <div>
                                    <Text size="sm" fw={500} mb="xs">Favicon da Empresa</Text>
                                    <Text size="xs" c="dimmed" mb="sm">Recomendado: imagem quadrada de 192x192 pixels (PNG ou SVG)</Text>
                                    <Group>
                                        <Avatar
                                            src={faviconPreview || (currentCompany as any).favicon_url}
                                            size={48}
                                            radius="sm"
                                            color="blue"
                                        >
                                            {currentCompany.name.charAt(0)}
                                        </Avatar>
                                        <FileInput
                                            placeholder="Selecionar favicon"
                                            accept="image/png,image/svg+xml,image/x-icon,image/ico"
                                            leftSection={<IconUpload size={16} />}
                                            value={faviconFile}
                                            onChange={handleFaviconChange}
                                            disabled={!canEdit || uploading}
                                        />
                                    </Group>
                                </div>

                                <Divider my="sm" />

                                <Group grow>
                                    <ColorInput
                                        label="Cor Primária"
                                        description="Cor principal da marca"
                                        disabled={!canEdit}
                                        {...form.getInputProps('primary_color')}
                                    />
                                    <ColorInput
                                        label="Cor Secundária"
                                        description="Cor de destaque"
                                        disabled={!canEdit}
                                        {...form.getInputProps('secondary_color')}
                                    />
                                </Group>

                                <div>
                                    <Text size="sm" fw={500} mb="xs">Preview</Text>
                                    <Group>
                                        <div
                                            style={{
                                                width: 100,
                                                height: 40,
                                                borderRadius: 8,
                                                backgroundColor: form.values.primary_color,
                                            }}
                                        />
                                        <div
                                            style={{
                                                width: 100,
                                                height: 40,
                                                borderRadius: 8,
                                                backgroundColor: form.values.secondary_color,
                                            }}
                                        />
                                    </Group>
                                </div>
                            </Stack>
                        </Card>
                    </Tabs.Panel>

                    {/* Domain Settings */}
                    <Tabs.Panel value="domain">
                        <Card shadow="sm" padding="lg" radius="md">
                            <Stack gap="lg">
                                <div>
                                    <Text size="sm" fw={500} mb="xs">Link da sua Empresa</Text>
                                    <Text size="xs" c="dimmed" mb="sm">Este é o endereço público da sua empresa na plataforma Sincla.</Text>
                                    <Group gap="xs">
                                        <TextInput
                                            value={`app.sincla.com.br/${currentCompany.slug}`}
                                            readOnly
                                            leftSection={<IconLink size={16} />}
                                            style={{ flex: 1 }}
                                            styles={{ input: { fontFamily: 'monospace', fontWeight: 500 } }}
                                        />
                                        <CopyButton value={`https://app.sincla.com.br/${currentCompany.slug}`}>
                                            {({ copied, copy }) => (
                                                <Tooltip label={copied ? 'Copiado!' : 'Copiar link'} withArrow>
                                                    <ActionIcon
                                                        variant={copied ? 'filled' : 'light'}
                                                        color={copied ? 'green' : 'blue'}
                                                        size="lg"
                                                        onClick={copy}
                                                    >
                                                        <IconCopy size={16} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                        </CopyButton>
                                        <Tooltip label="Abrir em nova guia" withArrow>
                                            <ActionIcon
                                                variant="light"
                                                color="blue"
                                                size="lg"
                                                onClick={() => window.open(`https://app.sincla.com.br/${currentCompany.slug}`, '_blank')}
                                            >
                                                <IconWorld size={16} />
                                            </ActionIcon>
                                        </Tooltip>
                                    </Group>
                                </div>

                                <Divider />

                                <div>
                                    <Text size="sm" fw={500} mb="xs">Domínio Personalizado</Text>
                                    <Text size="xs" c="dimmed" mb="sm">
                                        Aponte um domínio próprio para sua empresa. Configure um CNAME no seu DNS apontando para <strong>app.sincla.com.br</strong>.
                                    </Text>
                                    <TextInput
                                        label="Domínio personalizado"
                                        placeholder="app.meudominio.com.br"
                                        description={currentCompany.custom_domain
                                            ? `✅ Domínio atual: ${currentCompany.custom_domain}`
                                            : 'Deixe vazio para usar o domínio padrão Sincla'
                                        }
                                        disabled={!canEdit}
                                        defaultValue={currentCompany.custom_domain || ''}
                                        leftSection={<IconWorld size={16} />}
                                    />
                                    <Alert variant="light" color="blue" mt="md" title="Como configurar?">
                                        <Text size="xs">
                                            1. Acesse o painel do seu provedor de DNS<br />
                                            2. Crie um registro <strong>CNAME</strong> apontando para <code>app.sincla.com.br</code><br />
                                            3. Preencha o campo acima com seu domínio e salve
                                        </Text>
                                    </Alert>
                                </div>
                            </Stack>
                        </Card>
                    </Tabs.Panel>

                    {/* Notifications Settings */}
                    <Tabs.Panel value="notifications">
                        <Card shadow="sm" padding="lg" radius="md">
                            <Stack gap="md">
                                <Switch
                                    label="Assinatura e segurança (Email)"
                                    description="Receba notificações sobre sua assinatura e segurança no email da empresa"
                                    defaultChecked
                                />
                                <Switch
                                    label="Assinatura e segurança (WhatsApp)"
                                    description="Receba notificações sobre sua assinatura e segurança no WhatsApp da empresa"
                                    defaultChecked
                                />
                                <Switch
                                    label="Produtos e novidades"
                                    description="Receba notificações sobre nossos produtos e novidades"
                                    defaultChecked
                                />
                            </Stack>
                        </Card>
                    </Tabs.Panel>
                </Tabs>

                {canEdit && (
                    <Group justify="flex-end" mt="xl">
                        <Button type="submit" loading={loading}>
                            Salvar Alterações
                        </Button>
                    </Group>
                )}
            </form>
        </Container>
    );
}
