import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    Alert, Anchor, Badge, Button, Card, Center, Container, Divider, Group, Loader, Paper,
    PasswordInput, Stack, Table, Text, TextInput, ThemeIcon, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    IconAlertCircle, IconCircleCheck, IconExternalLink, IconFileInvoice, IconLock, IconLogout,
} from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';
import { formatCurrency } from '../../shared/services/asaasService';
import { formatTokens, subscriptionInviteService } from '../../shared/services/subscriptionInviteService';
import { PasswordStrengthFields, isPasswordFormReady } from '../../components/shared/PasswordStrengthFields';
import { translatePasswordAuthError } from '../../shared/utils/passwordRules';

const formatDate = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
};

export function SubscriptionInvitePage() {
    const { token = '' } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, signInWithPassword, signOut } = useAuth();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [accepted, setAccepted] = useState<{ invoiceUrl: string | null } | null>(null);

    const queryKey = ['subscription-invite', token, user?.id ?? 'anon'];
    const inviteQuery = useQuery({
        queryKey,
        queryFn: () => subscriptionInviteService.get(token),
        retry: false,
        staleTime: 0,
    });

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['subscription-invite', token] });

    const signIn = async (email: string, pwd: string) => {
        const { error } = await signInWithPassword(email, pwd);
        if (error) throw new Error(translatePasswordAuthError(error.message));
    };

    const acceptWithPassword = useMutation({
        mutationFn: async () => {
            const invite = inviteQuery.data!.invite;
            const result = await subscriptionInviteService.accept(token, password);
            await signIn(invite.email, password).catch(() => undefined);
            return result;
        },
        onSuccess: (result) => setAccepted({ invoiceUrl: result.invoice_url }),
        onError: (error: Error) => notifications.show({ color: 'red', title: 'Não foi possível aceitar', message: error.message }),
    });

    const createPasswordOnly = useMutation({
        mutationFn: async () => {
            const invite = inviteQuery.data!.invite;
            await subscriptionInviteService.setPassword(token, password);
            await signIn(invite.email, password);
        },
        onSuccess: () => {
            notifications.show({ color: 'green', title: 'Senha criada', message: 'Agora revise os planos e confirme a assinatura.' });
            refresh();
        },
        onError: (error: Error) => notifications.show({ color: 'red', title: 'Não foi possível criar a senha', message: error.message }),
    });

    const login = useMutation({
        mutationFn: async () => signIn(inviteQuery.data!.invite.email, loginPassword),
        onSuccess: () => refresh(),
        onError: (error: Error) => notifications.show({ color: 'red', title: 'Não foi possível entrar', message: error.message }),
    });

    const acceptLoggedIn = useMutation({
        mutationFn: () => subscriptionInviteService.accept(token),
        onSuccess: (result) => setAccepted({ invoiceUrl: result.invoice_url }),
        onError: (error: Error) => notifications.show({ color: 'red', title: 'Não foi possível aceitar', message: error.message }),
    });

    const shell = (children: ReactNode) => (
        <Container size="sm" py={{ base: 'md', sm: 48 }}>
            <Stack gap="lg">
                <Group justify="center">
                    <Title order={3} c="blue.7">Sincla</Title>
                </Group>
                {children}
            </Stack>
        </Container>
    );

    if (inviteQuery.isLoading) {
        return shell(<Center py="xl"><Loader /></Center>);
    }

    if (inviteQuery.isError || !inviteQuery.data) {
        return shell(
            <Alert color="red" icon={<IconAlertCircle size={16} />} title="Convite não encontrado">
                {(inviteQuery.error as Error)?.message || 'Verifique se o link está completo ou peça um novo convite.'}
            </Alert>,
        );
    }

    const { invite, needs_password, is_invited_user } = inviteQuery.data;
    const cycleLabel = invite.billing_cycle === 'yearly' ? '/ano' : '/mês';
    const invoiceUrl = accepted?.invoiceUrl ?? invite.invoice_url;

    if (accepted || invite.status === 'accepted') {
        return shell(
            <Paper withBorder radius="md" p="xl">
                <Stack align="center" gap="md">
                    <ThemeIcon size={56} radius="xl" color="green" variant="light">
                        <IconCircleCheck size={32} />
                    </ThemeIcon>
                    <Title order={3} ta="center">Assinatura confirmada</Title>
                    <Text ta="center" c="dimmed">
                        O acesso de <strong>{invite.company_name}</strong> já está liberado.
                        {invite.total_amount > 0 && ` A cobrança foi enviada para ${invite.email}, com vencimento em ${formatDate(invite.due_date)}.`}
                    </Text>
                    {invoiceUrl && (
                        <Button
                            component="a"
                            href={invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="light"
                            leftSection={<IconFileInvoice size={16} />}
                            rightSection={<IconExternalLink size={14} />}
                        >
                            Ver fatura e pagar
                        </Button>
                    )}
                    <Button onClick={() => navigate(user ? '/painel' : '/login')}>
                        {user ? 'Ir para o painel' : 'Entrar no painel'}
                    </Button>
                </Stack>
            </Paper>,
        );
    }

    if (invite.status === 'canceled' || invite.status === 'expired') {
        return shell(
            <Alert color="orange" icon={<IconAlertCircle size={16} />} title={invite.status === 'canceled' ? 'Convite cancelado' : 'Convite expirado'}>
                {invite.status === 'canceled'
                    ? 'Este convite não está mais disponível. Fale com a equipe Sincla para receber um novo.'
                    : 'O prazo deste convite terminou. Fale com a equipe Sincla para receber um novo envio.'}
            </Alert>,
        );
    }

    const loggedAsOther = !!user && !is_invited_user;
    const busy = acceptWithPassword.isPending || createPasswordOnly.isPending || login.isPending || acceptLoggedIn.isPending;
    const passwordReady = isPasswordFormReady(password, confirmPassword);

    return shell(
        <>
            <Paper withBorder radius="md" p={{ base: 'md', sm: 'xl' }}>
                <Stack gap="md">
                    <div>
                        <Text c="dimmed" size="sm">Olá, {invite.contact_name}!</Text>
                        <Title order={3}>Sua assinatura para {invite.company_name}</Title>
                        <Text size="sm" c="dimmed" mt={4}>
                            Revise os planos e valores abaixo. A cobrança só é gerada depois da sua confirmação.
                        </Text>
                    </div>

                    <Table.ScrollContainer minWidth={420}>
                        <Table verticalSpacing="sm">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Produto e plano</Table.Th>
                                    <Table.Th ta="right">Valor</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {invite.items.map((item, i) => (
                                    <Table.Tr key={i}>
                                        <Table.Td>
                                            <Text size="sm" fw={600}>{item.product_name}</Text>
                                            <Text size="sm">{item.plan_name}</Text>
                                            {item.ai_tokens != null && (
                                                <Text size="xs" c="dimmed">{formatTokens(item.ai_tokens)} tokens de IA por mês</Text>
                                            )}
                                        </Table.Td>
                                        <Table.Td ta="right">
                                            <Text size="sm" fw={600}>{formatCurrency(item.price)}{cycleLabel}</Text>
                                            {item.price < item.list_price && (
                                                <Text size="xs" c="dimmed" td="line-through">{formatCurrency(item.list_price)}</Text>
                                            )}
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>

                    <Card withBorder radius="md" padding="md" bg="var(--mantine-color-blue-light)">
                        <Group justify="space-between" align="flex-start">
                            <Stack gap={2}>
                                <Text size="sm" c="dimmed">Total</Text>
                                <Text size="xl" fw={700}>{formatCurrency(invite.total_amount)}<Text span size="sm" c="dimmed">{cycleLabel}</Text></Text>
                            </Stack>
                            <Stack gap={2} align="flex-end">
                                <Badge variant="light">{invite.billing_cycle === 'yearly' ? 'Cobrança anual' : 'Cobrança mensal'}</Badge>
                                {invite.total_amount > 0 && (
                                    <Text size="xs" c="dimmed">1º vencimento: {formatDate(invite.due_date)}</Text>
                                )}
                            </Stack>
                        </Group>
                        {invite.storage_gb != null && (
                            <Text size="xs" c="dimmed" mt="xs">Armazenamento inicial: {Number(invite.storage_gb).toLocaleString('pt-BR')} GB</Text>
                        )}
                        {invite.total_amount > 0 && (
                            <Text size="xs" c="dimmed" mt={4}>Você escolhe pagar por boleto, Pix ou cartão na fatura.</Text>
                        )}
                    </Card>
                </Stack>
            </Paper>

            <Paper withBorder radius="md" p={{ base: 'md', sm: 'xl' }}>
                {is_invited_user ? (
                    <Stack gap="sm">
                        <Text size="sm">Você está conectado como <strong>{invite.email}</strong>.</Text>
                        <Button size="md" loading={acceptLoggedIn.isPending} disabled={busy} onClick={() => acceptLoggedIn.mutate()}>
                            Aceitar e confirmar assinatura
                        </Button>
                    </Stack>
                ) : loggedAsOther ? (
                    <Stack gap="sm">
                        <Alert color="orange" icon={<IconAlertCircle size={16} />}>
                            Você está conectado com outra conta ({user?.email}). Este convite é para <strong>{invite.email}</strong>.
                        </Alert>
                        <Button variant="light" leftSection={<IconLogout size={16} />} onClick={async () => { await signOut(); refresh(); }}>
                            Sair e continuar
                        </Button>
                    </Stack>
                ) : needs_password ? (
                    <Stack gap="md">
                        <div>
                            <Title order={4}>Crie sua senha</Title>
                            <Text size="sm" c="dimmed">Sua conta de acesso será <strong>{invite.email}</strong>.</Text>
                        </div>
                        <PasswordStrengthFields
                            password={password}
                            confirmPassword={confirmPassword}
                            onPasswordChange={setPassword}
                            onConfirmChange={setConfirmPassword}
                            fieldPrefix="convite"
                            passwordLabel="Senha"
                            confirmLabel="Confirmar senha"
                            disabled={busy}
                        />
                        <Button size="md" loading={acceptWithPassword.isPending} disabled={!passwordReady || busy} onClick={() => acceptWithPassword.mutate()}>
                            Criar senha e aceitar assinatura
                        </Button>
                        <Divider label="ou" labelPosition="center" />
                        <Button variant="subtle" loading={createPasswordOnly.isPending} disabled={!passwordReady || busy} onClick={() => createPasswordOnly.mutate()}>
                            Só criar a senha agora e revisar depois
                        </Button>
                    </Stack>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); if (loginPassword) login.mutate(); }}>
                        <Stack gap="sm">
                            <div>
                                <Title order={4}>Entre para aceitar</Title>
                                <Text size="sm" c="dimmed">Esta conta já tem senha. Entre para confirmar a assinatura.</Text>
                            </div>
                            <TextInput label="E-mail" value={invite.email} readOnly />
                            <PasswordInput
                                label="Senha"
                                leftSection={<IconLock size={16} />}
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.currentTarget.value)}
                                autoComplete="current-password"
                            />
                            <Button type="submit" loading={login.isPending} disabled={!loginPassword || busy}>Entrar</Button>
                            <Anchor component={Link} to="/esqueci-senha" size="sm" ta="center">Esqueci minha senha</Anchor>
                        </Stack>
                    </form>
                )}
            </Paper>

            <Text size="xs" c="dimmed" ta="center">
                Convite válido até {formatDate(invite.expires_at)}.
            </Text>
        </>,
    );
}
