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
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMail, IconLock, IconArrowLeft } from '@tabler/icons-react';
import { SignatureVisual } from '../../components/signature-visual';
import { useAuth } from '../../shared/contexts';
import classes from './Auth.module.css';

export function Login() {
    const navigate = useNavigate();
    const { signInWithPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (import.meta.env.DEV) console.log('%c[Login] Submetendo...', 'color: #098eee; font-weight: bold;');
        setLoading(true);
        try {
            if (import.meta.env.DEV) console.log('%c[Login] Chamando signInWithPassword...', 'color: #098eee; font-weight: bold;');
            const { error } = await signInWithPassword(email, password);
            if (import.meta.env.DEV) console.log('%c[Login] signInWithPassword retornou', 'color: #098eee; font-weight: bold;', error ? `Erro: ${error.message}` : 'OK');
            if (error) {
                notifications.show({
                    title: 'Erro ao entrar',
                    message: error.message === 'Invalid login credentials'
                        ? 'Email ou senha incorretos'
                        : error.message,
                    color: 'red',
                });
            } else {
                if (import.meta.env.DEV) console.log('%c[Login] Navegando para /painel...', 'color: #098eee; font-weight: bold;');
                navigate('/painel');
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
                            <TextInput
                                label="Email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                leftSection={<IconMail size={18} />}
                                required
                                classNames={{ input: classes.input }}
                            />

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
