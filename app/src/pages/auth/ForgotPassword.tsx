import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Container,
    Paper,
    Title,
    Text,
    TextInput,
    Button,
    Anchor,
    Stack,
    Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconMail, IconArrowLeft, IconMailCheck } from '@tabler/icons-react';
import { supabase } from '../../shared/lib/supabase';
import { SignatureVisual } from '../../components/signature-visual';
import classes from './Auth.module.css';

export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
            });

            if (error) throw error;

            setSubmitted(true);
        } catch (error: any) {
            console.error('Error sending reset email:', error);
            notifications.show({
                title: 'Erro',
                message: error.message || 'Não foi possível enviar o email de recuperação. Tente novamente.',
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

                {/* Forgot Password Card */}
                <Paper className={classes.card} radius="lg" p="xl">
                    {/* Back Link */}
                    <Anchor component={Link} to="/login" className={classes.backLink}>
                        <IconArrowLeft size={16} />
                        Voltar para o login
                    </Anchor>

                    {!submitted ? (
                        <>
                            <Title order={2} className={classes.title} ta="center">
                                Esqueceu sua senha?
                            </Title>
                            <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
                                Não se preocupe! Digite seu email e enviaremos
                                instruções para recuperar sua senha.
                            </Text>

                            {/* Forgot Password Form */}
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

                                    <Button
                                        type="submit"
                                        fullWidth
                                        mt="md"
                                        loading={loading}
                                        className={classes.submitButton}
                                    >
                                        Enviar instruções
                                    </Button>
                                </Stack>
                            </form>
                        </>
                    ) : (
                        <>
                            {/* Success State */}
                            <Box className={classes.successIcon}>
                                <IconMailCheck size={40} />
                            </Box>

                            <Title order={2} className={classes.title} ta="center">
                                Email enviado!
                            </Title>
                            <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
                                Enviamos um email para <strong>{email}</strong> com
                                instruções para redefinir sua senha.
                            </Text>

                            <Text c="dimmed" size="xs" ta="center" mb={20}>
                                Não recebeu o email? Verifique sua pasta de spam ou{' '}
                                <Anchor
                                    component="button"
                                    type="button"
                                    className={classes.link}
                                    onClick={() => setSubmitted(false)}
                                >
                                    tente novamente
                                </Anchor>
                            </Text>

                            <Button
                                component={Link}
                                to="/login"
                                fullWidth
                                variant="light"
                            >
                                Voltar para o login
                            </Button>
                        </>
                    )}

                    <Text c="dimmed" size="sm" ta="center" mt={30}>
                        Lembrou sua senha?{' '}
                        <Anchor component={Link} to="/login" className={classes.link}>
                            Fazer login
                        </Anchor>
                    </Text>
                </Paper>
            </Container>
        </div>
    );
}
