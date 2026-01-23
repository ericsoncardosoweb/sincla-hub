import { useState } from 'react';
import { Link } from 'react-router-dom';
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
} from '@mantine/core';
import { IconMail, IconLock, IconBrandGoogle, IconBrandGithub } from '@tabler/icons-react';
import { SignatureVisual } from '../../components/signature-visual';
import classes from './Auth.module.css';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // TODO: Implement login logic
        setTimeout(() => setLoading(false), 1500);
    };

    return (
        <div className={classes.wrapper}>
            {/* 3D Animated Background */}
            <SignatureVisual />

            <Container size={480} className={classes.container}>
                {/* Logo */}
                <Box className={classes.logoWrapper}>
                    <Link to="/" className={classes.logo}>
                        <img
                            src="/logos/sincla.svg"
                            alt="Sincla"
                            height={40}
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

                    {/* Social Login */}
                    <Group grow mb="md">
                        <Button
                            variant="default"
                            className={classes.socialButton}
                            leftSection={<IconBrandGoogle size={18} />}
                        >
                            Google
                        </Button>
                        <Button
                            variant="default"
                            className={classes.socialButton}
                            leftSection={<IconBrandGithub size={18} />}
                        >
                            GitHub
                        </Button>
                    </Group>

                    <Divider label="ou continue com email" labelPosition="center" my="lg" />

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

                            <Group justify="space-between" mt="xs">
                                <Checkbox
                                    label="Lembrar de mim"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.currentTarget.checked)}
                                    size="sm"
                                />
                                <Anchor
                                    component={Link}
                                    to="/esqueci-senha"
                                    size="sm"
                                    className={classes.link}
                                >
                                    Esqueceu a senha?
                                </Anchor>
                            </Group>

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
