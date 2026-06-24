import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Container,
    Paper,
    Title,
    Text,
    TextInput,
    PasswordInput,
    Button,
    Checkbox,
    Group,
    Anchor,
    Stack,
    Divider,
    Box,
    Progress,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconMail,
    IconLock,
    IconUser,

    IconCheck,
    IconX,
    IconArrowLeft,
} from '@tabler/icons-react';
import { SignatureVisual } from '../../components/signature-visual';
import { LegalDocModal } from '../../components/legal/LegalDocModal';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import classes from './Auth.module.css';

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

// ===== Affiliate Code Tracking =====
const REF_COOKIE_NAME = 'sincla_ref';
const REF_STORAGE_KEY = 'sincla_affiliate_ref';
const REF_COOKIE_DAYS = 30;

function saveRefCode(code: string) {
    // Cookie (30 days)
    const expires = new Date(Date.now() + REF_COOKIE_DAYS * 86400000).toUTCString();
    document.cookie = `${REF_COOKIE_NAME}=${encodeURIComponent(code)};expires=${expires};path=/;SameSite=Lax`;
    // localStorage backup
    localStorage.setItem(REF_STORAGE_KEY, code);
}

function getRefCode(): string | null {
    // Try cookie first
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${REF_COOKIE_NAME}=([^;]*)`));
    if (match) return decodeURIComponent(match[1]);
    // Fallback to localStorage
    return localStorage.getItem(REF_STORAGE_KEY);
}

function PasswordRequirement({ meets, label }: { meets: boolean; label: string }) {
    return (
        <Text
            c={meets ? 'teal' : 'dimmed'}
            size="xs"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
            {meets ? <IconCheck size={14} /> : <IconX size={14} />}
            {label}
        </Text>
    );
}

function getStrength(password: string) {
    let multiplier = 0;

    if (password.length >= 6) multiplier += 1;
    if (/[a-z]/.test(password)) multiplier += 1;
    if (/[A-Z]/.test(password)) multiplier += 1;
    if (/[0-9]/.test(password)) multiplier += 1;
    if (/[$&+,:;=?@#|'<>.^*()%!-]/.test(password)) multiplier += 1;

    return Math.min(100, (multiplier / 5) * 100);
}

function getStrengthColor(strength: number) {
    if (strength < 40) return 'red';
    if (strength < 80) return 'yellow';
    return 'teal';
}

function getStrengthLabel(strength: number) {
    if (strength < 40) return { text: 'Fraca', color: 'red' };
    if (strength < 80) return { text: 'Moderada', color: 'yellow' };
    return { text: 'Forte', color: 'teal' };
}

export function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { signUp } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [legalSlug, setLegalSlug] = useState<string | null>(null);

    // Captura código de afiliado e email de convite da URL
    useEffect(() => {
        const ref = searchParams.get('ref');
        if (ref) saveRefCode(ref);

        const inviteEmail = searchParams.get('email');
        if (inviteEmail) {
            setEmail(decodeURIComponent(inviteEmail));
        }
    }, [searchParams]);


    const strength = useMemo(() => getStrength(password), [password]);

    const strengthLabel = useMemo(() => getStrengthLabel(strength), [strength]);

    const requirements = [
        { re: /.{6,}/, label: 'Mínimo de 6 caracteres' },
        { re: /[A-Z]/, label: 'Letra maiúscula (A-Z)' },
        { re: /[0-9]/, label: 'Número (0-9)' },
        { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Símbolo (!@#$%...)' },
    ];

    const checks = requirements.map((requirement, index) => (
        <PasswordRequirement
            key={index}
            label={requirement.label}
            meets={requirement.re.test(password)}
        />
    ));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            notifications.show({
                title: 'Erro',
                message: 'As senhas não coincidem',
                color: 'red',
            });
            return;
        }
        setLoading(true);
        try {
            const refCode = getRefCode();
            const { error } = await signUp(email, password, name, refCode || undefined);
            if (error) {
                notifications.show({
                    title: 'Erro ao criar conta',
                    message: error.message,
                    color: 'red',
                });
            } else {
                notifications.show({
                    title: 'Conta criada com sucesso!',
                    message: 'Verifique seu email para confirmar a conta.',
                    color: 'teal',
                    autoClose: 8000,
                });
                navigate('/login');
            }
        } catch {
            notifications.show({
                title: 'Erro inesperado',
                message: 'Tente novamente em alguns instantes',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'github') => {
        const refCode = getRefCode();
        const redirectUrl = refCode
            ? `${window.location.origin}/auth/callback?ref=${encodeURIComponent(refCode)}`
            : `${window.location.origin}/auth/callback`;

        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: redirectUrl },
        });
        if (error) {
            notifications.show({
                title: 'Erro',
                message: `Falha ao entrar com ${provider}: ${error.message}`,
                color: 'red',
            });
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
                            height={40}
                            style={{ display: 'block' }}
                        />
                    </Link>
                </Box>

                {/* Register Card */}
                <Paper className={classes.card} radius="lg" p="xl">
                    <Title order={2} className={classes.title} ta="center">
                        Criar sua conta
                    </Title>
                    <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
                        Comece a transformar sua gestão hoje
                    </Text>

                    {/* Register Form */}
                    <form onSubmit={handleSubmit}>
                        <Stack>
                            <TextInput
                                label="Nome completo"
                                placeholder="Seu nome"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                leftSection={<IconUser size={18} />}
                                required
                                classNames={{ input: classes.input }}
                            />

                            <TextInput
                                label="Email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                leftSection={<IconMail size={18} />}
                                required
                                classNames={{ input: classes.input }}
                                disabled={!!searchParams.get('email')}
                            />


                            <div>
                                <PasswordInput
                                    label="Senha"
                                    placeholder="Crie uma senha forte"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    leftSection={<IconLock size={18} />}
                                    required
                                    classNames={{ input: classes.input }}
                                />
                                {password.length > 0 && (
                                    <Box className={classes.strengthContainer}>
                                        <Group justify="space-between" mb={5}>
                                            <Text size="xs" c="dimmed">
                                                Força da senha:
                                            </Text>
                                            <Text
                                                size="xs"
                                                fw={600}
                                                c={strengthLabel.color}
                                                className={classes.strengthLabel}
                                            >
                                                {strengthLabel.text}
                                            </Text>
                                        </Group>
                                        <Progress
                                            value={strength}
                                            color={getStrengthColor(strength)}
                                            size="sm"
                                            radius="xl"
                                            className={classes.strengthBar}
                                        />
                                        <Text size="xs" c="dimmed" mt="sm" mb={8}>
                                            Sua senha deve conter:
                                        </Text>
                                        <Stack gap={6}>
                                            {checks}
                                        </Stack>
                                    </Box>
                                )}
                            </div>

                            <PasswordInput
                                label="Confirmar senha"
                                placeholder="Repita sua senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                leftSection={<IconLock size={18} />}
                                required
                                error={
                                    confirmPassword && password !== confirmPassword
                                        ? 'As senhas não coincidem'
                                        : null
                                }
                                classNames={{ input: classes.input }}
                            />

                            <Checkbox
                                label={
                                    <Text size="sm">
                                        Eu aceito os{' '}
                                        <Anchor
                                            component="button"
                                            type="button"
                                            className={classes.link}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setLegalSlug('termos-de-uso');
                                            }}
                                        >
                                            Termos de Uso
                                        </Anchor>{' '}
                                        e a{' '}
                                        <Anchor
                                            component="button"
                                            type="button"
                                            className={classes.link}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setLegalSlug('politica-privacidade');
                                            }}
                                        >
                                            Política de Privacidade
                                        </Anchor>
                                    </Text>
                                }
                                checked={acceptTerms}
                                onChange={(e) => setAcceptTerms(e.currentTarget.checked)}
                                mt="xs"
                            />

                            <Button
                                type="submit"
                                fullWidth
                                mt="md"
                                loading={loading}
                                disabled={!acceptTerms || password !== confirmPassword}
                                className={classes.submitButton}
                            >
                                Criar conta
                            </Button>
                        </Stack>
                    </form>

                    <Divider label="ou" labelPosition="center" my="lg" />

                    {/* Google Login */}
                    <Button
                        variant="default"
                        fullWidth
                        leftSection={<GoogleIcon />}
                        onClick={() => handleSocialLogin('google')}
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
                        Já tem uma conta?{' '}
                        <Anchor component={Link} to="/login" className={classes.link}>
                            Entrar
                        </Anchor>
                    </Text>
                </Paper>
            </Container>

            <LegalDocModal
                opened={legalSlug !== null}
                onClose={() => setLegalSlug(null)}
                slug={legalSlug || ''}
                onAccept={() => setAcceptTerms(true)}
            />
        </div>
    );
}
