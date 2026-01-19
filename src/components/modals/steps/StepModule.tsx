import { SimpleGrid, Stack, Title, Text, Box, Badge } from '@mantine/core';
import { IconUsers, IconBook, IconWallet, IconChartBar, IconCalendar, IconBuilding } from '@tabler/icons-react';
import classes from './Steps.module.css';

interface StepModuleProps {
    selectedModule: string | null;
    onSelectModule: (module: string) => void;
}

const modules = [
    {
        id: 'rh',
        name: 'Sincla RH',
        icon: IconUsers,
        tagline: 'Gestão de pessoas completa',
        features: ['Até 5 colaboradores', 'Cadastro e documentos', 'Organograma básico'],
        available: true,
    },
    {
        id: 'ead',
        name: 'Sincla EAD',
        icon: IconBook,
        tagline: 'Cursos e treinamentos',
        features: ['1 curso', '10 alunos', 'Certificado'],
        available: true,
    },
    {
        id: 'bolso',
        name: 'Sincla Bolso',
        icon: IconWallet,
        tagline: 'Finanças pessoais',
        features: ['Dashboards', 'Categorias', 'Metas'],
        available: true,
    },
    {
        id: 'leads',
        name: 'Sincla Leads',
        icon: IconChartBar,
        tagline: 'Páginas de conversão',
        features: ['1 página', '100 leads/mês', 'Analytics'],
        available: true,
    },
    {
        id: 'agenda',
        name: 'Sincla Agenda',
        icon: IconCalendar,
        tagline: 'Produtividade pessoal',
        features: ['Calendário', 'Tarefas', 'Lembretes'],
        available: true,
    },
    {
        id: 'intranet',
        name: 'Sincla Intranet',
        icon: IconBuilding,
        tagline: 'Comunicação interna',
        features: ['Mural', 'Documentos', 'Chat'],
        available: false,
    },
];

export function StepModule({ selectedModule, onSelectModule }: StepModuleProps) {
    return (
        <Stack gap="lg">
            <Box>
                <Title order={3} mb={8}>Escolha seu primeiro módulo</Title>
                <Text size="sm" c="dimmed">
                    Você pode ativar outros módulos a qualquer momento.
                    Seus dados já estarão lá.
                </Text>
            </Box>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {modules.map((module) => (
                    <Box
                        key={module.id}
                        className={`${classes.moduleCard} ${selectedModule === module.name ? classes.moduleCardSelected : ''} ${!module.available ? classes.moduleCardDisabled : ''}`}
                        onClick={() => module.available && onSelectModule(module.name)}
                    >
                        {!module.available && (
                            <Badge className={classes.comingSoonBadge} size="xs" color="gray">
                                Em breve
                            </Badge>
                        )}

                        <Box className={classes.moduleIcon}>
                            <module.icon size={28} stroke={1.5} />
                        </Box>

                        <Text fw={600} size="sm" mt="xs">{module.name}</Text>
                        <Text size="xs" c="dimmed">{module.tagline}</Text>

                        <Box mt="sm">
                            <Text size="xs" c="dimmed" mb={4}>Inclui no plano grátis:</Text>
                            {module.features.map((feature, idx) => (
                                <Text key={idx} size="xs" c="dimmed">• {feature}</Text>
                            ))}
                        </Box>
                    </Box>
                ))}
            </SimpleGrid>

            <Box className={classes.infoBox}>
                <Text size="xs" c="dimmed">
                    ✨ Ao acessar o módulo, seus dados pessoais e da empresa
                    já estarão preenchidos. Magia? Não, cadastro único.
                </Text>
            </Box>
        </Stack>
    );
}
