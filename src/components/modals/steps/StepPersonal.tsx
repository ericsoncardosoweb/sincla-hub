import { TextInput, PasswordInput, Stack, Title, Text, Box, Progress } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import classes from './Steps.module.css';

export function StepPersonal() {
    return (
        <Stack gap="lg">
            <Box>
                <Title order={3} mb={8}>Crie sua identidade pessoal</Title>
                <Text size="sm" c="dimmed">
                    Esses dados serão usados em todas as plataformas Sincla.
                </Text>
            </Box>

            <TextInput
                label="Nome completo"
                placeholder="Seu nome e sobrenome"
                required
                classNames={{ input: classes.input }}
            />

            <TextInput
                label="E-mail"
                placeholder="seuemail@exemplo.com"
                type="email"
                required
                classNames={{ input: classes.input }}
            />

            <TextInput
                label="Telefone"
                placeholder="(11) 99999-9999"
                description="Opcional"
                classNames={{ input: classes.input }}
            />

            <PasswordInput
                label="Senha"
                placeholder="Mínimo 8 caracteres"
                required
                classNames={{ input: classes.input }}
            />

            <Box>
                <Text size="xs" c="dimmed" mb={4}>Força da senha</Text>
                <Progress value={60} color="yellow" size="sm" />
                <Text size="xs" c="dimmed" mt={4}>Média — Adicione números e maiúsculas</Text>
            </Box>

            <PasswordInput
                label="Confirmar senha"
                placeholder="Digite a senha novamente"
                required
                classNames={{ input: classes.input }}
            />

            <Box className={classes.infoBox}>
                <IconInfoCircle size={16} />
                <Text size="xs" c="dimmed">
                    Seu e-mail será seu login único para todo o ecossistema Sincla.
                </Text>
            </Box>
        </Stack>
    );
}
