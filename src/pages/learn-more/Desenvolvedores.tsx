import { SimpleGrid, Card, Text, Group, Box, Button, ThemeIcon, Badge, Code } from '@mantine/core';
import { IconApi, IconCode, IconWebhook, IconTerminal, IconBrandGithub, IconBook, IconRocket } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const resources = [
    {
        icon: IconApi,
        title: 'REST API',
        description: 'API completa com suporte a todos os módulos da plataforma',
        badge: 'v3.0',
        color: 'blue',
    },
    {
        icon: IconWebhook,
        title: 'Webhooks',
        description: 'Receba notificações em tempo real sobre eventos',
        badge: 'Real-time',
        color: 'teal',
    },
    {
        icon: IconCode,
        title: 'SDKs',
        description: 'Bibliotecas oficiais para 6+ linguagens',
        badge: 'Open Source',
        color: 'violet',
    },
    {
        icon: IconTerminal,
        title: 'CLI',
        description: 'Ferramenta de linha de comando para desenvolvedores',
        badge: 'Beta',
        color: 'orange',
    },
];

const codeExample = `// Exemplo de integração com Sincla API
import { SinclaClient } from '@sincla/sdk';

const client = new SinclaClient({
  apiKey: process.env.SINCLA_API_KEY
});

// Buscar funcionários
const employees = await client.rh.employees.list({
  department: 'engineering',
  status: 'active'
});

console.log(employees);`;

export function Desenvolvedores() {
    return (
        <PageTemplate
            title="Recursos de Desenvolvedores"
            subtitle="Tudo que você precisa para construir integrações poderosas com a Sincla"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Saiba Mais' },
                { label: 'Desenvolvedores' },
            ]}
        >
            {/* Quick Actions */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" mb="xl">
                {resources.map((resource, index) => (
                    <Card
                        key={index}
                        padding="lg"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <Group justify="space-between" mb="md">
                            <ThemeIcon size={40} radius="md" variant="light" color={resource.color}>
                                <resource.icon size={20} />
                            </ThemeIcon>
                            <Badge color={resource.color} variant="light" size="sm">
                                {resource.badge}
                            </Badge>
                        </Group>
                        <Text fw={600} c="white" mb="xs">{resource.title}</Text>
                        <Text size="sm" c="dimmed">{resource.description}</Text>
                    </Card>
                ))}
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                {/* Code Example */}
                <Box>
                    <Text fw={600} size="lg" c="white" mb="md">
                        Comece em Minutos
                    </Text>
                    <Card
                        padding="lg"
                        radius="md"
                        style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <Group justify="space-between" mb="md">
                            <Group gap="xs">
                                <Box w={12} h={12} style={{ borderRadius: '50%', background: '#ff5f57' }} />
                                <Box w={12} h={12} style={{ borderRadius: '50%', background: '#febc2e' }} />
                                <Box w={12} h={12} style={{ borderRadius: '50%', background: '#28c840' }} />
                            </Group>
                            <Text size="xs" c="dimmed">JavaScript</Text>
                        </Group>
                        <Code
                            block
                            style={{
                                background: 'transparent',
                                color: 'rgba(255, 255, 255, 0.85)',
                                fontSize: '0.8rem',
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {codeExample}
                        </Code>
                    </Card>
                    <Group mt="md">
                        <Button
                            variant="gradient"
                            gradient={{ from: '#0087ff', to: '#00c6ff' }}
                            leftSection={<IconRocket size={16} />}
                        >
                            Começar agora
                        </Button>
                        <Button
                            variant="light"
                            color="gray"
                            leftSection={<IconBrandGithub size={16} />}
                        >
                            Ver no GitHub
                        </Button>
                    </Group>
                </Box>

                {/* Resources */}
                <Box>
                    <Text fw={600} size="lg" c="white" mb="md">
                        Recursos Úteis
                    </Text>
                    <Card
                        padding={0}
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            overflow: 'hidden',
                        }}
                    >
                        {[
                            { icon: IconBook, title: 'Documentação da API', desc: 'Referência completa' },
                            { icon: IconCode, title: 'Exemplos de Código', desc: '50+ exemplos prontos' },
                            { icon: IconTerminal, title: 'Postman Collection', desc: 'Importe e teste rapidamente' },
                            { icon: IconWebhook, title: 'Sandbox', desc: 'Ambiente de testes' },
                        ].map((item, index) => (
                            <Group
                                key={index}
                                p="md"
                                style={{
                                    borderBottom: index < 3 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <ThemeIcon size={36} radius="md" variant="light" color="blue">
                                    <item.icon size={18} />
                                </ThemeIcon>
                                <Box>
                                    <Text fw={500} c="white" size="sm">{item.title}</Text>
                                    <Text size="xs" c="dimmed">{item.desc}</Text>
                                </Box>
                            </Group>
                        ))}
                    </Card>

                    {/* Community */}
                    <Card
                        padding="lg"
                        radius="md"
                        mt="lg"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0, 135, 255, 0.1) 0%, rgba(0, 198, 255, 0.05) 100%)',
                            border: '1px solid rgba(0, 135, 255, 0.2)',
                        }}
                    >
                        <Text fw={600} c="white" mb="xs">Comunidade de Desenvolvedores</Text>
                        <Text size="sm" c="dimmed" mb="md">
                            Junte-se a milhares de desenvolvedores no Discord
                        </Text>
                        <Button variant="light" color="blue" fullWidth>
                            Entrar no Discord
                        </Button>
                    </Card>
                </Box>
            </SimpleGrid>
        </PageTemplate>
    );
}
