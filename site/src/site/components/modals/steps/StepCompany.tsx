import { TextInput, Select, Stack, Title, Text, Box, Anchor } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import classes from './Steps.module.css';

const segmentos = [
    { value: 'tecnologia', label: 'Tecnologia e Software' },
    { value: 'comercio', label: 'Comércio e Varejo' },
    { value: 'servicos', label: 'Serviços Profissionais' },
    { value: 'industria', label: 'Indústria e Manufatura' },
    { value: 'saude', label: 'Saúde e Bem-estar' },
    { value: 'educacao', label: 'Educação' },
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'construcao', label: 'Construção e Imobiliário' },
    { value: 'alimentacao', label: 'Alimentação e Bebidas' },
    { value: 'outro', label: 'Outro' },
];

const colaboradores = [
    { value: '1', label: 'Apenas eu (1)' },
    { value: '2-10', label: '2 a 10' },
    { value: '11-50', label: '11 a 50' },
    { value: '51-200', label: '51 a 200' },
    { value: '201-500', label: '201 a 500' },
    { value: '500+', label: 'Mais de 500' },
];

export function StepCompany() {
    return (
        <Stack gap="lg">
            <Box>
                <Title order={3} mb={8}>Cadastre sua empresa</Title>
                <Text size="sm" c="dimmed">
                    Essas informações serão compartilhadas automaticamente
                    em todos os módulos que você ativar.
                </Text>
            </Box>

            <TextInput
                label="CNPJ"
                placeholder="00.000.000/0001-00"
                required
                classNames={{ input: classes.input }}
            />

            <TextInput
                label="Nome fantasia"
                placeholder="Nome da sua empresa"
                required
                classNames={{ input: classes.input }}
            />

            <Select
                label="Segmento de atuação"
                placeholder="Selecione o segmento"
                data={segmentos}
                required
                classNames={{ input: classes.input }}
            />

            <Select
                label="Número de colaboradores"
                placeholder="Selecione a faixa"
                data={colaboradores}
                required
                classNames={{ input: classes.input }}
            />

            <Anchor size="sm" c="dimmed" className={classes.noCnpjLink}>
                Ainda não tenho CNPJ
            </Anchor>

            <Box className={classes.infoBox}>
                <IconLock size={16} />
                <Text size="xs" c="dimmed">
                    Seus dados empresariais são protegidos e usados apenas
                    para personalizar sua experiência no ecossistema Sincla.
                </Text>
            </Box>
        </Stack>
    );
}
