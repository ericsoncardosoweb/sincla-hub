import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    Title,
    Text,
    TextInput,
    PasswordInput,
    Button,
    Anchor,
    Stack,
    Box,
    Divider,
    Alert,
    SegmentedControl,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMail, IconLock, IconArrowLeft, IconAlertCircle, IconId } from '@tabler/icons-react';

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);
import { SignatureVisual } from '../../components/signature-visual';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { formatCpf, validateCpf } from '../../shared/services/asaasService';
import classes from './Auth.module.css';

export function Login() {
    const navigate = useNavigate();
    const { signInWithPassword, signInWithGoogle } = useAuth();
    const [loginMode, setLoginMode] = useState<'email' | 'cpf'>('email');
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError(null);
        try {
            const { error: authError } = await signInWithGoogle();
            if (authError) {
                const msg = `Falha ao entrar com Google: ${authError.message}`;
                setError(msg);
                notifications.show({
                    title: 'Erro',
                    message: msg,
                    color: 'red',
                });
            }
        } catch {
            const msg = 'Tente novamente em alguns instantes';
            setError(msg);
            notifications.show({
                title: 'Erro inesperado',
                message: msg,
                color: 'red',
            });
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (import.meta.env.DEV) console.log('%c[Login] Submetendo...', 'color: #098eee; font-weight: bold;');
        setLoading(true);
        setError(null);
        try {
            let loginEmail = email.trim();

            if (loginMode === 'cpf') {
                const cpfDigits = cpf.replace(/\D/g, '');
                if (!validateCpf(cpfDigits)) {
                    const msg = 'CPF inválido. Verifique os dígitos informados.';
                    setError(msg);
                    notifications.show({ title: 'Erro', message: msg, color: 'red' });
                    return;
                }

                const { data: resolvedEmail, error: rpcError } = await supabase.rpc('resolve_cpf_to_email', {
                    p_cpf: cpfDigits,
                });

                if (rpcError || !resolvedEmail) {
                    const msg = 'CPF não encontrado. Cadastre seu CPF no perfil ou crie uma conta com CPF.';
                    setError(msg);
                    notifications.show({ title: 'Erro', message: msg, color: 'red' });
                    return;
                }

                loginEmail = resolvedEmail as string;
            }

            if (import.meta.env.DEV) console.log('%c[Login] Chamando signInWithPassword...', 'color: #098eee; font-weight: bold;');
            const { error: authError } = await signInWithPassword(loginEmail, password);
            if (import.meta.env.DEV) console.log('%c[Login] signInWithPassword retornou', 'color: #098eee; font-weight: bold;', authError ? `Erro: ${authError.message}` : 'OK');
            if (authError) {
                const msg = authError.message === 'Invalid login credentials'
                    ? 'Email ou senha incorretos'
                    : authError.message;
                setError(msg);
                notifications.show({
                    title: 'Erro ao entrar',
                    message: msg,
                    color: 'red',
                });
            } else {
                if (import.meta.env.DEV) console.log('%c[Login] Navegando para /painel...', 'color: #098eee; font-weight: bold;');
                navigate('/painel');
            }
        } catch {
            const msg = 'Tente novamente em alguns instantes';
            setError(msg);
            notifications.show({
                title: 'Erro inesperado',
                message: msg,
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={classes.wrapper}>
            {/* 3D Animated Background */}
            <SignatureVisual />

            {/* Back Button - Top Left */}
            <Link to="/" className={classes.backLinkTop}>
                <IconArrowLeft size={16} />
                Voltar para o início
            </Link>

            <Container size={480} className={classes.container}>
                {/* Logo */}
                <Box className={classes.logoWrapper}>
                    <Link to="/" className={classes.logo}>
                        <img
                            src="/logos/logo-sincla-branco.svg"
                            alt="Sincla"
                            height={56}
                            style={{ display: 'block' }}
                        />
                    </Link>
                </Box>

                {/* Login Card */}
                <Paper className={classes.card} radius="lg" p="xl">
                    <Title order={2} className={classes.title} ta="center">
                        Bem-vindo de volta
                    </Title>
                    <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
                        Entre com sua conta para continuar
                    </Text>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit}>
                        <Stack>
                            {error && (
                                <Alert
                                    icon={<IconAlertCircle size={16} />}
                                    color="red"
                                    variant="light"
                                    radius="md"
                                    withCloseButton
                                    onClose={() => setError(null)}
                                >
                                    {error}
                                </Alert>
                            )}
                            <SegmentedControl
                                value={loginMode}
                                onChange={(v) => {
                                    setLoginMode(v as 'email' | 'cpf');
                                    setError(null);
                                }}
                                data={[
                                    { value: 'email', label: 'Email' },
                                    { value: 'cpf', label: 'CPF' },
                                ]}
                                fullWidth
                                radius="md"
                                mb="xs"
                            />

                            {loginMode === 'email' ? (
                                <TextInput
                                    label="Email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    leftSection={<IconMail size={18} />}
                                    required
                                    classNames={{ input: classes.input }}
                                />
                            ) : (
                                <TextInput
                                    label="CPF"
                                    placeholder="000.000.000-00"
                                    value={cpf}
                                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                                    leftSection={<IconId size={18} />}
                                    required
                                    maxLength={14}
                                    classNames={{ input: classes.input }}
                                />
                            )}

                            <PasswordInput
                                label="Senha"
                                placeholder="Sua senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                leftSection={<IconLock size={18} />}
                                required
                                classNames={{ input: classes.input }}
                            />

                            <Anchor
                                component={Link}
                                to="/esqueci-senha"
                                size="sm"
                                className={classes.link}
                                style={{ textAlign: 'right', display: 'block' }}
                            >
                                Esqueceu a senha?
                            </Anchor>

                            <Button
                                type="submit"
                                fullWidth
                                mt="xl"
                                loading={loading}
                                className={classes.submitButton}
                            >
                                Entrar
                            </Button>
                        </Stack>
                    </form>

                    <Divider label="ou" labelPosition="center" my="lg" />

                    {/* Google Login */}
                    <Button
                        variant="default"
                        fullWidth
                        leftSection={<GoogleIcon />}
                        onClick={handleGoogleLogin}
                        loading={googleLoading}
                        styles={{
                            root: {
                                backgroundColor: '#fff',
                                color: '#3c4043',
                                border: '1px solid #dadce0',
                                '&:hover': {
                                    backgroundColor: '#f8f9fa',
                                },
                            },
                        }}
                    >
                        Continuar com Google
                    </Button>

                    <Text c="dimmed" size="sm" ta="center" mt={20}>
                        Não tem uma conta?{' '}
                        <Anchor component={Link} to="/cadastro" className={classes.link}>
                            Criar conta
                        </Anchor>
                    </Text>
                </Paper>

                {/* Footer */}
                <Text c="dimmed" size="xs" ta="center" mt={20}>
                    Ao entrar, você concorda com nossos{' '}
                    <Anchor href="#" className={classes.footerLink}>
                        Termos de Uso
                    </Anchor>{' '}
                    e{' '}
                    <Anchor href="#" className={classes.footerLink}>
                        Política de Privacidade
                    </Anchor>
                </Text>
            </Container>
        </div>
    );
}
