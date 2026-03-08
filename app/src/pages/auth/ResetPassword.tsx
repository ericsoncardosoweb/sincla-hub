import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    Title,
    Text,
    PasswordInput,
    Button,
    Stack,
    Box,
    Progress,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLock, IconCheck, IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';
import { supabase } from '../../shared/lib/supabase';
import { SignatureVisual } from '../../components/signature-visual';
import classes from './Auth.module.css';

export function ResetPassword() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
    const [success, setSuccess] = useState(false);

    // Verificar se há uma sessão válida (token de recuperação)
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsValidSession(!!session);
        };
        checkSession();

        // Listener para mudanças de auth (quando o token é processado)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsValidSession(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Calcular força da senha
    const getPasswordStrength = (pwd: string) => {
        let strength = 0;
        if (pwd.length >= 6) strength += 25;
        if (pwd.length >= 8) strength += 25;
        if (/[A-Z]/.test(pwd)) strength += 25;
        if (/[0-9]/.test(pwd)) strength += 25;
        return strength;
    };

    const passwordStrength = getPasswordStrength(password);
    const strengthColor = passwordStrength <= 25 ? 'red' : passwordStrength <= 50 ? 'orange' : passwordStrength <= 75 ? 'yellow' : 'green';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            notifications.show({
                title: 'Campos obrigatórios',
                message: 'Por favor, preencha todos os campos',
                color: 'red',
            });
            return;
        }

        if (password.length < 6) {
            notifications.show({
                title: 'Senha muito curta',
                message: 'A senha deve ter pelo menos 6 caracteres',
                color: 'red',
            });
            return;
        }

        if (password !== confirmPassword) {
            notifications.show({
                title: 'Senhas não conferem',
                message: 'As senhas digitadas não são iguais',
                color: 'red',
            });
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password,
            });

            if (error) throw error;

            setSuccess(true);
            notifications.show({
                title: 'Senha redefinida!',
                message: 'Sua senha foi alterada com sucesso.',
                color: 'green',
            });

            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error: any) {
            console.error('Erro ao redefinir senha:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Erro ao redefinir senha. O link pode ter expirado.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    // Estado de carregamento
    if (isValidSession === null) {
        return (
            <div className={classes.wrapper}>
                <SignatureVisual />
                <Container size={480} className={classes.container}>
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
                    <Paper className={classes.card} radius="lg" p="xl">
                        <Text ta="center" c="dimmed">Verificando...</Text>
                    </Paper>
                </Container>
            </div>
        );
    }

    // Sessão inválida
    if (!isValidSession) {
        return (
            <div className={classes.wrapper}>
                <SignatureVisual />
                <Container size={480} className={classes.container}>
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
                    <Paper className={classes.card} radius="lg" p="xl">
                        <Stack gap="md" align="center">
                            <Box className={classes.successIcon} style={{ color: '#ffa502' }}>
                                <IconAlertCircle size={40} />
                            </Box>
                            <Title order={2} className={classes.title} ta="center">
                                Link inválido ou expirado
                            </Title>
                            <Text c="dimmed" size="sm" ta="center">
                                Este link de recuperação não é mais válido.
                                Solicite um novo link de recuperação.
                            </Text>
                            <Button
                                component={Link}
                                to="/esqueci-senha"
                                fullWidth
                                mt="md"
                                className={classes.submitButton}
                            >
                                Solicitar novo link
                            </Button>
                        </Stack>
                    </Paper>
                </Container>
            </div>
        );
    }

    return (
        <div className={classes.wrapper}>
            <SignatureVisual />

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

                {/* Reset Password Card */}
                <Paper className={classes.card} radius="lg" p="xl">
                    {success ? (
                        <>
                            <Box className={classes.successIcon}>
                                <IconCheck size={40} />
                            </Box>
                            <Title order={2} className={classes.title} ta="center">
                                Senha redefinida!
                            </Title>
                            <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
                                Sua senha foi alterada com sucesso.
                                Você será redirecionado para o login em instantes.
                            </Text>
                            <Button
                                component={Link}
                                to="/login"
                                fullWidth
                                variant="light"
                            >
                                Ir para o login
                            </Button>
                        </>
                    ) : (
                        <>
                            <Title order={2} className={classes.title} ta="center">
                                Redefinir senha
                            </Title>
                            <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
                                Digite sua nova senha abaixo.
                            </Text>

                            <form onSubmit={handleSubmit}>
                                <Stack>
                                    <div>
                                        <PasswordInput
                                            label="Nova senha"
                                            placeholder="Mínimo 6 caracteres"
                                            leftSection={<IconLock size={18} />}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            classNames={{ input: classes.input }}
                                        />
                                        {password && (
                                            <Progress
                                                value={passwordStrength}
                                                color={strengthColor}
                                                size="xs"
                                                mt="xs"
                                            />
                                        )}
                                    </div>

                                    <PasswordInput
                                        label="Confirmar senha"
                                        placeholder="Digite novamente"
                                        leftSection={<IconLock size={18} />}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        classNames={{ input: classes.input }}
                                        error={confirmPassword && password !== confirmPassword ? 'As senhas não conferem' : undefined}
                                    />

                                    <Button
                                        type="submit"
                                        fullWidth
                                        mt="md"
                                        loading={loading}
                                        className={classes.submitButton}
                                        leftSection={<IconCheck size={18} />}
                                    >
                                        Redefinir senha
                                    </Button>
                                </Stack>
                            </form>
                        </>
                    )}

                    <Text c="dimmed" size="sm" ta="center" mt={30}>
                        <Link to="/login" className={classes.link}>
                            <IconArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Voltar para o login
                        </Link>
                    </Text>
                </Paper>
            </Container>
        </div>
    );
}
