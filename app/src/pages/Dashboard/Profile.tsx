import { useState, useRef } from 'react';
import {
    Container, Text, Card, Group, Stack,
    TextInput, Button, Avatar, Divider, PasswordInput, Title,
    FileButton, ActionIcon, Tooltip, Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconUser, IconMail, IconPhone, IconId, IconLock, IconCamera, IconAlertCircle } from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { storageService } from '../../shared/services/storage';
import { PageHeader } from '../../components/shared';

export function Profile() {
    const { subscriber, user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(subscriber?.avatar_url || null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const resetRef = useRef<() => void>(null);

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

                <Divider />
                <Text size="xs" c="dimmed" ta="center">
                    ID: {subscriber?.id?.slice(0, 8)}... | Email: {user?.email}
                </Text>
            </Stack>
        </Container>
    );
}
