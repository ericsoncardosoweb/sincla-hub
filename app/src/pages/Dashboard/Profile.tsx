import { useState } from 'react';
import {
    Container, Text, Card, Group, Stack,
    TextInput, Button, Avatar, Divider, PasswordInput, Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconUser, IconMail, IconPhone, IconId, IconLock } from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { PageHeader } from '../../components/shared';

export function Profile() {
    const { subscriber, user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

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
                message: error.message || 'Falha ao salvar perfil',
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

    return (
        <Container size="sm" py="md">
            <Stack gap="lg">
                <PageHeader
                    title="Meu Perfil"
                    subtitle="Gerencie suas informações pessoais"
                    helpContent="Aqui você pode atualizar seu nome, telefone, CPF/CNPJ e alterar sua senha de acesso."
                />

                {/* Avatar + Email */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group>
                        <Avatar
                            src={subscriber?.avatar_url}
                            size={80}
                            radius="xl"
                            color="blue"
                        >
                            {(subscriber?.name || subscriber?.email || '?').charAt(0).toUpperCase()}
                        </Avatar>
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
                                label="Telefone"
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
