import { useState, useMemo } from 'react';
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
    Progress,
} from '@mantine/core';
import {
    IconMail,
    IconLock,
    IconUser,
    IconBrandGoogle,
    IconBrandGithub,
    IconCheck,
    IconX,
} from '@tabler/icons-react';
import { SignatureVisual } from '../../components/signature-visual';
import classes from './Auth.module.css';

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
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [loading, setLoading] = useState(false);

    const strength = useMemo(() => getStrength(password), [password]);

    const requirements = [
        { re: /.{8,}/, label: 'Mínimo de 8 caracteres' },
        { re: /[a-z]/, label: 'Inclui letra minúscula' },
        { re: /[A-Z]/, label: 'Inclui letra maiúscula' },
        { re: /[0-9]/, label: 'Inclui número' },
        { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Inclui caractere especial' },
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
            return;
        }
        setLoading(true);
        // TODO: Implement registration logic
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

                {/* Register Card */}
                <Paper className={classes.card} radius="lg" p="xl">
                    <Title order={2} className={classes.title} ta="center">
                        Criar sua conta
                    </Title>
                    <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
                        Comece a transformar sua gestão hoje
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

                    <Divider label="ou cadastre com email" labelPosition="center" my="lg" />

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
                                    <>
                                        <Progress
                                            value={strength}
                                            color={getStrengthColor(strength)}
                                            size="xs"
                                            mt="xs"
                                        />
                                        <Stack gap={4} mt="xs">
                                            {checks}
                                        </Stack>
                                    </>
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
                                        <Anchor href="#" className={classes.link}>
                                            Termos de Uso
                                        </Anchor>{' '}
                                        e a{' '}
                                        <Anchor href="#" className={classes.link}>
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

                    <Text c="dimmed" size="sm" ta="center" mt={20}>
                        Já tem uma conta?{' '}
                        <Anchor component={Link} to="/login" className={classes.link}>
                            Entrar
                        </Anchor>
                    </Text>
                </Paper>
            </Container>
        </div>
    );
}
