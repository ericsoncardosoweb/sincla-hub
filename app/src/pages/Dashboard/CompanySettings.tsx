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
import { IconSettings, IconPalette, IconBell, IconUpload, IconWorld, IconCopy, IconCheck, IconX, IconTrash, IconPlugConnected } from '@tabler/icons-react';
import { useAuth, useCompany } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { uploadEmpresaLogo, uploadEmpresaAsset, deleteFile } from '../../shared/services/storage';
import { PageHeader, EmptyState } from '../../components/shared';
import { ConnectedAccountsBlock } from './components/ConnectedAccountsBlock';

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
    const [removedLogo, setRemovedLogo] = useState(false);
    const [removedFavicon, setRemovedFavicon] = useState(false);
    const [slugValue, setSlugValue] = useState('');
    const [slugError, setSlugError] = useState('');
    const [slugChecking, setSlugChecking] = useState(false);

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
            custom_domain: '',
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
                custom_domain: (currentCompany as any).custom_domain || '',
            });
            // Reset upload state
            setUploadedLogoUrl(null);
            setLogoPreview(null);
            setLogoFile(null);
            setUploadedFaviconUrl(null);
            setFaviconPreview(null);
            setFaviconFile(null);
            setRemovedLogo(false);
            setRemovedFavicon(false);
            setSlugValue(normalizeSlug(currentCompany.slug || ''));
            setSlugError('');
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

    // Normalizar slug: lowercase, sem acentos, espaços→hífens, sem especiais
    const normalizeSlug = (val: string) => {
        return val
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remover acentos
            .replace(/[^a-z0-9-]/g, '-') // substituir tudo que não é alfanumérico
            .replace(/-+/g, '-') // colapsar hífens múltiplos
            .replace(/^-|-$/g, ''); // remover hífens de borda
    };

    const handleSlugChange = (val: string) => {
        const normalized = normalizeSlug(val);
        setSlugValue(normalized);
        setSlugError('');
    };

    const validateSlugUniqueness = async (): Promise<boolean> => {
        if (!slugValue.trim() || !currentCompany) return false;
        if (slugValue === currentCompany.slug) return true; // não mudou

        setSlugChecking(true);
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('id')
                .eq('slug', slugValue)
                .neq('id', currentCompany.id)
                .maybeSingle();

            if (error) {
                setSlugError('Erro ao validar slug');
                return false;
            }
            if (data) {
                setSlugError('Este slug já está em uso por outra empresa');
                return false;
            }
            setSlugError('');
            return true;
        } catch {
            setSlugError('Erro ao validar slug');
            return false;
        } finally {
            setSlugChecking(false);
        }
    };

    const handleSubmit = async (values: typeof form.values) => {
        if (!currentCompany) return;

        setLoading(true);
        try {
            // Resolver URLs: remoção > novo upload > manter existente
            let logoUrl: string | null = null;
            if (removedLogo) {
                logoUrl = null;
            } else if (uploadedLogoUrl) {
                logoUrl = uploadedLogoUrl.split('?')[0] + `?v=${Date.now()}`;
            } else {
                logoUrl = (currentCompany as any).logo_url || null;
            }

            let faviconUrl: string | null = null;
            if (removedFavicon) {
                faviconUrl = null;
            } else if (uploadedFaviconUrl) {
                faviconUrl = uploadedFaviconUrl.split('?')[0] + `?v=${Date.now()}`;
            } else {
                faviconUrl = (currentCompany as any).favicon_url || null;
            }

            // Validate slug uniqueness if changed
            const finalSlug = slugValue.trim() || currentCompany.slug;
            if (finalSlug !== currentCompany.slug) {
                const isUnique = await validateSlugUniqueness();
                if (!isUnique) {
                    setLoading(false);
                    return;
                }
            }

            // Update company — usar .select().single() para verificar se RLS permitiu
            const { data: updatedData, error } = await supabase
                .from('companies')
                .update({
                    name: values.name,
                    cnpj: values.cnpj || null,
                    slug: finalSlug,
                    primary_color: values.primary_color,
                    secondary_color: values.secondary_color,
                    logo_url: logoUrl || null,
                    favicon_url: faviconUrl || null,
                    custom_domain: values.custom_domain?.trim() || null,
                    // Store extra info in settings JSONB
                    settings: {
                        ...((currentCompany as any).settings || {}),
                        email: values.email || null,
                        phone: values.phone || null,
                        address: values.address || null,
                        website: values.website || null,
                    },
                })
                .eq('id', currentCompany.id)
                .select()
                .single();

            if (error) throw error;

            if (!updatedData) {
                throw new Error('Não foi possível salvar. Verifique suas permissões.');
            }

            // Limpar cache de branding para forçar reload
            localStorage.removeItem('sincla_tenant_branding');

            notifications.show({
                title: 'Sucesso',
                message: 'Configurações salvas com sucesso',
                color: 'green',
            });

            // Se o slug mudou, forçar reload para atualizar toda a navegação
            if (finalSlug !== currentCompany.slug) {
                notifications.show({
                    title: 'Slug atualizado',
                    message: `O link da empresa agora é: app.sincla.com.br/${finalSlug}`,
                    color: 'blue',
                });
                // Limpar cache de empresas para forçar refetch
                localStorage.removeItem('currentEmpresaId');
                // Refresh completo para atualizar navegação
                await refreshCompanies();
                window.location.reload();
                return;
            }

            await refreshCompanies();
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
                        <Tabs.Tab value="integrations" leftSection={<IconPlugConnected size={16} />}>
                            Integrações
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
                                            src={removedLogo ? null : (logoPreview || (currentCompany as any).logo_url)}
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
                                            onChange={(file) => { setRemovedLogo(false); handleLogoChange(file); }}
                                            disabled={!canEdit || uploading}
                                        />
                                        {(logoPreview || (currentCompany as any).logo_url) && !removedLogo && (
                                            <Tooltip label="Remover logo">
                                                <ActionIcon
                                                    variant="light"
                                                    color="red"
                                                    size="lg"
                                                    onClick={() => {
                                                        setRemovedLogo(true);
                                                        setLogoFile(null);
                                                        setLogoPreview(null);
                                                        setUploadedLogoUrl(null);
                                                    }}
                                                    disabled={!canEdit}
                                                >
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        )}
                                        {removedLogo && (
                                            <Text size="xs" c="red">Logo será removido ao salvar</Text>
                                        )}
                                    </Group>
                                </div>

                                <Divider my="sm" />

                                <div>
                                    <Text size="sm" fw={500} mb="xs">Favicon da Empresa</Text>
                                    <Text size="xs" c="dimmed" mb="sm">Recomendado: imagem quadrada (PNG, SVG, ICO ou JPG)</Text>
                                    <Group>
                                        <Avatar
                                            src={removedFavicon ? null : (faviconPreview || (currentCompany as any).favicon_url)}
                                            size={48}
                                            radius="sm"
                                            color="blue"
                                        >
                                            {currentCompany.name.charAt(0)}
                                        </Avatar>
                                        <FileInput
                                            placeholder="Selecionar favicon"
                                            accept="image/*"
                                            leftSection={<IconUpload size={16} />}
                                            value={faviconFile}
                                            onChange={(file) => { setRemovedFavicon(false); handleFaviconChange(file); }}
                                            disabled={!canEdit || uploading}
                                        />
                                        {(faviconPreview || (currentCompany as any).favicon_url) && !removedFavicon && (
                                            <Tooltip label="Remover favicon">
                                                <ActionIcon
                                                    variant="light"
                                                    color="red"
                                                    size="lg"
                                                    onClick={() => {
                                                        setRemovedFavicon(true);
                                                        setFaviconFile(null);
                                                        setFaviconPreview(null);
                                                        setUploadedFaviconUrl(null);
                                                    }}
                                                    disabled={!canEdit}
                                                >
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        )}
                                        {removedFavicon && (
                                            <Text size="xs" c="red">Favicon será removido ao salvar</Text>
                                        )}
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
                                    <Text size="xs" c="dimmed" mb="sm">Este é o endereço público da sua empresa na plataforma Sincla. Você pode personalizar o slug.</Text>

                                    <Group gap="xs" align="flex-start">
                                        <TextInput
                                            value={slugValue}
                                            onChange={(e) => handleSlugChange(e.target.value)}
                                            onBlur={validateSlugUniqueness}
                                            leftSection={<Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>app.sincla.com.br/</Text>}
                                            leftSectionWidth={140}
                                            error={slugError}
                                            disabled={!canEdit}
                                            style={{ flex: 1 }}
                                            styles={{ input: { fontFamily: 'monospace', fontWeight: 500 } }}
                                            rightSection={
                                                slugChecking ? <IconCheck size={16} color="gray" /> :
                                                    slugError ? <IconX size={16} color="var(--mantine-color-red-6)" /> :
                                                        slugValue && slugValue !== currentCompany.slug ? <IconCheck size={16} color="var(--mantine-color-green-6)" /> :
                                                            null
                                            }
                                        />
                                        <CopyButton value={`https://app.sincla.com.br/${slugValue}`}>
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
                                                onClick={() => window.open(`https://app.sincla.com.br/${slugValue}`, '_blank')}
                                            >
                                                <IconWorld size={16} />
                                            </ActionIcon>
                                        </Tooltip>
                                    </Group>
                                    {slugValue !== currentCompany.slug && !slugError && (
                                        <Text size="xs" c="green" mt={4}>Slug alterado. Clique em "Salvar Alterações" para aplicar.</Text>
                                    )}
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
                                        description={form.values.custom_domain
                                            ? `✅ Domínio atual: ${form.values.custom_domain}`
                                            : 'Deixe vazio para usar o domínio padrão Sincla'
                                        }
                                        disabled={!canEdit}
                                        leftSection={<IconWorld size={16} />}
                                        {...form.getInputProps('custom_domain')}
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

                    {/* Integrations Settings */}
                    <Tabs.Panel value="integrations">
                        <ConnectedAccountsBlock />
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
