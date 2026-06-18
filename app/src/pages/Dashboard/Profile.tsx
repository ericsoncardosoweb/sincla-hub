import { useState, useRef, useEffect } from 'react';
import {
    Container, Text, Card, Group, Stack,
    TextInput, Button, Avatar, Divider, PasswordInput, Title,
    FileButton, ActionIcon, Tooltip, Alert, Modal, Badge,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
    IconUser, IconMail, IconPhone, IconId, IconLock, IconCamera,
    IconAlertCircle, IconShield, IconDownload, IconTrash, IconBuilding
} from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { storageService } from '../../shared/services/storage';
import { PageHeader } from '../../components/shared';

export function Profile() {
    const { subscriber, user, companies } = useAuth();
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(subscriber?.avatar_url || null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [deleteModalOpened, setDeleteModalOpened] = useState(false);
    const resetRef = useRef<() => void>(null);
    const [userProductAccess, setUserProductAccess] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;
        const fetchProductAccess = async () => {
            try {
                // 1. Buscar os membros de empresa para o usuário ativo
                const { data: members, error: membersError } = await supabase
                    .from('company_members')
                    .select('id, company_id')
                    .eq('user_id', user.id);

                if (membersError || !members || members.length === 0) return;

                const memberIds = members.map(m => m.id);

                // 2. Buscar produtos associados
                const { data: accessData, error: accessError } = await supabase
                    .from('member_product_access')
                    .select('company_member_id, product_id, products(id, name, slug)')
                    .in('company_member_id', memberIds);

                if (accessError || !accessData) return;

                const mapped = accessData.map((acc: any) => {
                    const member = members.find(m => m.id === acc.company_member_id);
                    return {
                        company_id: member?.company_id,
                        product: acc.products,
                    };
                });

                setUserProductAccess(mapped);
            } catch (err) {
                console.error('Erro ao carregar permissões de produto:', err);
            }
        };

        fetchProductAccess();
    }, [user]);

    const handleExportData = async () => {
        if (!subscriber || !user) return;
        setExporting(true);
        try {
            const userData = {
                tipo_documento: "Portabilidade de Dados Pessoais (Art. 18, V da LGPD)",
                data_emissao: new Date().toISOString(),
                plataforma: "Sincla Hub",
                titular: {
                    id: subscriber.id,
                    nome: subscriber.name,
                    email: subscriber.email || user.email,
                    telefone: subscriber.phone,
                    documento_identificação: subscriber.cpf_cnpj,
                    criado_em: subscriber.created_at,
                },
                autenticacao: {
                    ultimo_login: user.last_sign_in_at,
                    provedores_identidade: user.app_metadata?.providers || [user.app_metadata?.provider],
                },
                empresas_vinculadas: companies.map(c => ({
                    id: c.id,
                    nome: c.name,
                    slug: c.slug,
                    status: c.status,
                    cadastrado_em: c.created_at
                }))
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userData, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `sincla-portabilidade-dados-${subscriber.id.slice(0, 8)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();

            notifications.show({
                title: 'Exportação Concluída',
                message: 'Seus dados foram exportados com sucesso no formato JSON.',
                color: 'green',
            });
        } catch (error: any) {
            console.error('Error exporting user data:', error);
            notifications.show({
                title: 'Erro na exportação',
                message: error.message || 'Não foi possível exportar seus dados no momento.',
                color: 'red',
            });
        } finally {
            setExporting(false);
        }
    };

    const form = useForm({
        initialValues: {
            name: subscriber?.name || '',
            phone: subscriber?.phone || '',
            cpf_cnpj: subscriber?.cpf_cnpj || '',
        },
    });

    const passwordForm = useForm({
        initialValues: {
            password: '',
            confirmPassword: '',
        },
        validate: {
            password: (v) => (v.length < 6 ? 'Mínimo 6 caracteres' : null),
            confirmPassword: (v, values) => (v !== values.password ? 'Senhas não conferem' : null),
        },
    });

    const handleAvatarUpload = async (file: File | null) => {
        if (!file || !subscriber) return;

        // Validar tipo e tamanho
        if (!file.type.startsWith('image/')) {
            notifications.show({
                title: 'Arquivo inválido',
                message: 'Por favor, selecione uma imagem (JPG, PNG, etc.)',
                color: 'red',
            });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            notifications.show({
                title: 'Arquivo muito grande',
                message: 'A imagem deve ter no máximo 2MB',
                color: 'red',
            });
            return;
        }

        setUploadingAvatar(true);
        try {
            // Upload via Bunny CDN (Edge Function upload-asset)
            const result = await storageService.uploadAvatar(subscriber.id, file);
            if (!result.success) throw new Error(result.error || 'Falha no upload');

            const newAvatarUrl = `${result.url}?t=${Date.now()}`;

            // Atualizar no perfil
            const { error: updateError } = await supabase
                .from('subscribers')
                .update({
                    avatar_url: newAvatarUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', subscriber.id);

            if (updateError) throw updateError;

            setAvatarUrl(newAvatarUrl);
            notifications.show({
                title: 'Sucesso',
                message: 'Foto de perfil atualizada!',
                color: 'green',
            });
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            notifications.show({
                title: 'Erro ao enviar foto',
                message: error.message || 'Falha ao atualizar a foto de perfil',
                color: 'red',
            });
        } finally {
            setUploadingAvatar(false);
            resetRef.current?.();
        }
    };

    const handleSaveProfile = async (values: typeof form.values) => {
        if (!subscriber) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('subscribers')
                .update({
                    name: values.name || null,
                    phone: values.phone || null,
                    cpf_cnpj: values.cpf_cnpj || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', subscriber.id);

            if (error) throw error;

            notifications.show({
                title: 'Sucesso',
                message: 'Perfil atualizado com sucesso',
                color: 'green',
            });
        } catch (error: any) {
            console.error('Error saving profile:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Falha ao salvar perfil. Verifique suas permissões.',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (values: typeof passwordForm.values) => {
        setChangingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: values.password,
            });

            if (error) throw error;

            passwordForm.reset();
            notifications.show({
                title: 'Sucesso',
                message: 'Senha alterada com sucesso',
                color: 'green',
            });
        } catch (error: any) {
            console.error('Error changing password:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Falha ao alterar senha',
                color: 'red',
            });
        } finally {
            setChangingPassword(false);
        }
    };

    // Verificar se o login foi feito via Google (sem senha)
    const isOAuthUser = user?.app_metadata?.provider === 'google' || user?.app_metadata?.providers?.includes('google');

    return (
        <Container size="sm" py="md">
            <Stack gap="lg">
                <PageHeader
                    title="Meu Perfil"
                    subtitle="Gerencie suas informações pessoais"
                    helpContent="Aqui você pode atualizar seu nome, telefone, CPF/CNPJ, foto de perfil e alterar sua senha de acesso."
                />

                {/* Avatar + Email */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group>
                        <div style={{ position: 'relative' }}>
                            <Avatar
                                src={avatarUrl}
                                size={80}
                                radius="xl"
                                color="blue"
                            >
                                {(subscriber?.name || subscriber?.email || '?').charAt(0).toUpperCase()}
                            </Avatar>
                            <FileButton
                                resetRef={resetRef}
                                onChange={handleAvatarUpload}
                                accept="image/png,image/jpeg,image/webp"
                            >
                                {(props) => (
                                    <Tooltip label="Trocar foto de perfil" withArrow>
                                        <ActionIcon
                                            {...props}
                                            variant="filled"
                                            color="blue"
                                            size="sm"
                                            radius="xl"
                                            loading={uploadingAvatar}
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                border: '2px solid white',
                                            }}
                                        >
                                            <IconCamera size={12} />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </FileButton>
                        </div>
                        <div>
                            <Text size="lg" fw={600}>{subscriber?.name || 'Sem nome'}</Text>
                            <Group gap={4}>
                                <IconMail size={14} color="gray" />
                                <Text size="sm" c="dimmed">{user?.email}</Text>
                            </Group>
                            <Text size="xs" c="dimmed" mt={4}>
                                Membro desde {subscriber?.created_at ? new Date(subscriber.created_at).toLocaleDateString('pt-BR') : '—'}
                            </Text>
                        </div>
                    </Group>
                </Card>

                {/* Profile Form */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Title order={4} mb="md">Informações Pessoais</Title>
                    <form onSubmit={form.onSubmit(handleSaveProfile)}>
                        <Stack gap="md">
                            <TextInput
                                label="Nome Completo"
                                placeholder="Seu nome"
                                leftSection={<IconUser size={16} />}
                                {...form.getInputProps('name')}
                            />
                            <TextInput
                                label="WhatsApp / Telefone"
                                placeholder="(11) 99999-9999"
                                leftSection={<IconPhone size={16} />}
                                {...form.getInputProps('phone')}
                            />
                            <TextInput
                                label="CPF / CNPJ"
                                placeholder="000.000.000-00"
                                leftSection={<IconId size={16} />}
                                {...form.getInputProps('cpf_cnpj')}
                            />
                            <Group justify="flex-end">
                                <Button type="submit" loading={saving}>
                                    Salvar Alterações
                                </Button>
                            </Group>
                        </Stack>
                    </form>
                </Card>

                {/* Change Password */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Title order={4} mb="md">Alterar Senha</Title>

                    {isOAuthUser && (
                        <Alert
                            icon={<IconAlertCircle size={16} />}
                            color="blue"
                            variant="light"
                            radius="md"
                            mb="md"
                        >
                            Você entrou com Google. Para definir uma senha para acesso direto, preencha os campos abaixo.
                        </Alert>
                    )}

                    <form onSubmit={passwordForm.onSubmit(handleChangePassword)}>
                        <Stack gap="md">
                            <PasswordInput
                                label="Nova Senha"
                                placeholder="Mínimo 6 caracteres"
                                leftSection={<IconLock size={16} />}
                                {...passwordForm.getInputProps('password')}
                            />
                            <PasswordInput
                                label="Confirmar Nova Senha"
                                placeholder="Repita a nova senha"
                                leftSection={<IconLock size={16} />}
                                {...passwordForm.getInputProps('confirmPassword')}
                            />
                            <Group justify="flex-end">
                                <Button
                                    type="submit"
                                    variant="outline"
                                    color="orange"
                                    loading={changingPassword}
                                >
                                    Alterar Senha
                                </Button>
                            </Group>
                        </Stack>
                    </form>
                </Card>

                {/* Privacidade e Direitos (LGPD) Card */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Title order={4} mb="sm" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconShield size={20} color="var(--mantine-color-blue-6)" />
                        Privacidade e Direitos LGPD
                    </Title>
                    <Text size="xs" c="dimmed" mb="md">
                        De acordo com a Lei Geral de Proteção de Dados (LGPD), você possui direitos fundamentais sobre as suas informações pessoais. Disponibilizamos ferramentas diretas para exercê-los:
                    </Text>

                    <Stack gap="sm">
                        <Group justify="space-between" align="center" style={{ flexWrap: 'nowrap' }}>
                            <div>
                                <Text size="sm" fw={500}>Portabilidade dos Dados</Text>
                                <Text size="xs" c="dimmed">Exporte uma cópia completa de suas informações pessoais cadastradas em nossa plataforma.</Text>
                            </div>
                            <Button 
                                variant="light" 
                                color="blue" 
                                leftSection={<IconDownload size={16} />}
                                onClick={handleExportData}
                                loading={exporting}
                            >
                                Exportar Dados
                            </Button>
                        </Group>

                        <Divider />

                        <Group justify="space-between" align="center" style={{ flexWrap: 'nowrap' }}>
                            <div>
                                <Text size="sm" fw={500}>Exclusão e Anonimização</Text>
                                <Text size="xs" c="dimmed">Solicite a remoção ou anonimização de suas informações pessoais da plataforma.</Text>
                            </div>
                            <Button 
                                variant="light" 
                                color="red" 
                                leftSection={<IconTrash size={16} />}
                                onClick={() => setDeleteModalOpened(true)}
                            >
                                Solicitar Exclusão
                            </Button>
                        </Group>
                    </Stack>
                </Card>

                {/* LGPD Exclusion Modal */}
                <Modal
                    opened={deleteModalOpened}
                    onClose={() => setDeleteModalOpened(false)}
                    title={
                        <Group gap="xs">
                            <IconShield size={20} color="var(--mantine-color-red-6)" />
                            <Text fw={600}>Solicitar Exclusão de Dados Pessoais</Text>
                        </Group>
                    }
                    size="md"
                    radius="md"
                >
                    <Stack gap="md">
                        <Text size="sm">
                            A Sincla atua como <strong>Operadora</strong> técnica dos seus dados pessoais. Seus dados estão vinculados a empresas que utilizam nossas ferramentas e atuam como <strong>Controladoras</strong> dos dados.
                        </Text>

                        <Alert color="orange" title="Atenção" icon={<IconAlertCircle size={16} />}>
                            <Text size="xs">
                                Informações financeiras ou fiscais (como notas fiscais, cobranças e históricos de pagamentos da sua assinatura) são mantidas para cumprimento de obrigações legais (Artigo 16, I da LGPD) e não podem ser excluídas imediatamente.
                            </Text>
                        </Alert>

                        {companies.length > 0 && (
                            <div>
                                <Text size="xs" fw={600} c="dimmed" mb="xs">SOLICITAÇÕES PARA AS CONTROLADORAS (EMPRESAS):</Text>
                                <Text size="xs" c="dimmed" mb="sm">
                                    Veja abaixo a destinação das solicitações de acordo com as ferramentas ativas em cada empresa contratante:
                                </Text>
                                <Stack gap="md">
                                    {companies.map(c => {
                                        const privacy = (c.settings as any)?.privacy || {};
                                        const dpoName = privacy.dpo_name;
                                        const dpoEmail = privacy.dpo_email || c.email;
                                        const dpoPhone = privacy.dpo_phone || c.phone;
                                        
                                        // Filtrar produtos que este usuário acessa nesta empresa específica
                                        const companyProducts = userProductAccess
                                            .filter(acc => acc.company_id === c.id)
                                            .map(acc => acc.product);

                                        // Determinar se tem acesso ao Sincla RH ou outras ferramentas
                                        const hasRhAccess = companyProducts.some(p => p?.slug === 'rh' || p?.name?.toLowerCase().includes('rh'));
                                        const hasSatelliteAccess = companyProducts.some(p => p?.slug !== 'rh' && !p?.name?.toLowerCase().includes('rh'));

                                        const mailtoLink = dpoEmail ? `mailto:${dpoEmail}?subject=Solicitação de Exclusão de Dados (LGPD) - Sincla&body=Olá,%0D%0A%0D%0AEu, ${subscriber?.name || 'Titular dos dados'}, cadastrado sob o e-mail ${user?.email}, venho solicitar a exclusão de minhas informações pessoais processadas por sua organização no âmbito da plataforma Sincla, nos termos da Lei Geral de Proteção de Dados (LGPD).%0D%0A%0D%0AAtenciosamente,%0D%0A${subscriber?.name || ''}` : '#';

                                        return (
                                            <Card key={c.id} withBorder padding="md" radius="sm" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                                                <Stack gap="xs">
                                                    <Group justify="space-between">
                                                        <Group gap={6}>
                                                            <IconBuilding size={16} color="var(--mantine-color-blue-6)" />
                                                            <Text size="sm" fw={600}>{c.name}</Text>
                                                        </Group>
                                                        <Group gap="xs">
                                                            {companyProducts.map(p => (
                                                                <Badge key={p?.id} size="xs" variant="outline" color={p?.slug === 'rh' ? 'red' : 'blue'}>
                                                                    {p?.name}
                                                                </Badge>
                                                            ))}
                                                        </Group>
                                                    </Group>

                                                    {dpoEmail && (
                                                        <Group justify="space-between" align="center" mt="xs">
                                                            <div>
                                                                {dpoName ? (
                                                                    <Text size="xs" fw={500}>DPO: {dpoName}</Text>
                                                                ) : (
                                                                    <Text size="xs" fw={500}>Canal de Privacidade (DPO):</Text>
                                                                )}
                                                                <Text size="xs" c="dimmed">{dpoEmail} {dpoPhone ? `| ${dpoPhone}` : ''}</Text>
                                                            </div>
                                                            <Button 
                                                                component="a" 
                                                                href={mailtoLink} 
                                                                size="xs" 
                                                                variant="outline"
                                                                color="blue"
                                                            >
                                                                Contatar DPO
                                                            </Button>
                                                        </Group>
                                                    )}

                                                    {/* Explicação detalhada de responsabilidade com base na ferramenta */}
                                                    {hasRhAccess && (
                                                        <Alert variant="light" color="red" title="Vínculo Trabalhista (Sincla RH)" style={{ padding: '8px' }}>
                                                            <Text size="xs" style={{ lineHeight: 1.4 }}>
                                                                Como colaborador do **Sincla RH**, você cedeu seus dados diretamente a esta empresa (Controladora). Por lei, ela é a única responsável legal. A exclusão de dados de folha ou registro trabalhista deve ser solicitada e resolvida diretamente com o setor de RH ou DPO da empresa.
                                                            </Text>
                                                        </Alert>
                                                    )}

                                                    {hasSatelliteAccess && (
                                                        <Alert variant="light" color="blue" title="Outros Cadastros (EAD / Currículos)" style={{ padding: '8px' }}>
                                                            <Text size="xs" style={{ lineHeight: 1.4 }}>
                                                                Dados cadastrais, currículos ou progresso de cursos de outras ferramentas podem ser solicitados e excluídos diretamente. Caso queira a remoção, contate o DPO acima para que a empresa efetue a exclusão imediata na plataforma.
                                                            </Text>
                                                        </Alert>
                                                    )}
                                                </Stack>
                                            </Card>
                                        );
                                    })}
                                </Stack>
                            </div>
                        )}

                        <Divider />

                        <div>
                            <Text size="xs" fw={600} c="dimmed" mb="xs">SOLICITAÇÃO PARA A CONTA GLOBAL (SINCLA HUB):</Text>
                            <Text size="xs" c="dimmed" mb="sm">
                                Se você deseja excluir totalmente o seu perfil global de usuário (dados de acesso ao Hub e cadastro do assinante), envie sua solicitação para a nossa central de privacidade:
                            </Text>
                            <Button
                                component="a"
                                href={`mailto:privacidade@sincla.com.br?subject=Solicitação de Exclusão de Conta Global - Sincla Hub&body=Olá,%0D%0A%0D%0ASolicito a exclusão total do meu cadastro global no Sincla Hub.%0D%0A%0D%0ANome: ${subscriber?.name || ''}%0D%0AEmail: ${user?.email || ''}%0D%0AID do Usuário: ${subscriber?.id || ''}`}
                                color="red"
                                variant="filled"
                                fullWidth
                            >
                                Enviar E-mail de Exclusão
                            </Button>
                        </div>
                    </Stack>
                </Modal>

                <Divider />
                <Text size="xs" c="dimmed" ta="center">
                    ID: {subscriber?.id?.slice(0, 8)}... | Email: {user?.email}
                </Text>
            </Stack>
        </Container>
    );
}
