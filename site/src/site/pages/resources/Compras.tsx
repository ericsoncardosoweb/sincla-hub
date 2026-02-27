import { SimpleGrid, Card, Text, Group, Box, Button, ThemeIcon, List, Badge } from '@mantine/core';
import { IconCreditCard, IconReceipt, IconRefresh, IconShieldCheck, IconCheck } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const plans = [
    {
        name: 'Starter',
        price: 'R$ 99',
        period: '/mês',
        features: ['Até 10 usuários', '5GB de armazenamento', 'Suporte por email', '1 produto incluso'],
        popular: false,
    },
    {
        name: 'Professional',
        price: 'R$ 299',
        period: '/mês',
        features: ['Até 50 usuários', '50GB de armazenamento', 'Suporte prioritário', '3 produtos inclusos', 'Integrações avançadas'],
        popular: true,
    },
    {
        name: 'Enterprise',
        price: 'Sob consulta',
        period: '',
        features: ['Usuários ilimitados', 'Armazenamento ilimitado', 'Suporte 24/7 dedicado', 'Todos os produtos', 'SLA personalizado'],
        popular: false,
    },
];

export function Compras() {
    return (
        <PageTemplate
            title="Compras e Licenciamento"
            subtitle="Escolha o plano ideal para sua empresa"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Recursos', href: '/recursos' },
                { label: 'Compras' },
            ]}
        >
            {/* Plans */}
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mb="xl">
                {plans.map((plan, index) => (
                    <Card
                        key={index}
                        padding="xl"
                        radius="md"
                        style={{
                            background: plan.popular
                                ? 'linear-gradient(135deg, rgba(0, 135, 255, 0.15) 0%, rgba(0, 198, 255, 0.08) 100%)'
                                : 'rgba(255, 255, 255, 0.03)',
                            border: plan.popular
                                ? '2px solid rgba(0, 135, 255, 0.4)'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                            position: 'relative',
                        }}
                    >
                        {plan.popular && (
                            <Badge
                                color="blue"
                                style={{ position: 'absolute', top: -10, right: 20 }}
                            >
                                Mais popular
                            </Badge>
                        )}
                        <Text fw={600} size="lg" c="white" mb="xs">
                            {plan.name}
                        </Text>
                        <Group align="baseline" gap={4} mb="md">
                            <Text fw={700} size="xl" c="white">
                                {plan.price}
                            </Text>
                            <Text c="dimmed" size="sm">
                                {plan.period}
                            </Text>
                        </Group>
                        <List
                            spacing="xs"
                            size="sm"
                            c="dimmed"
                            icon={
                                <ThemeIcon color="teal" size={20} radius="xl">
                                    <IconCheck size={12} />
                                </ThemeIcon>
                            }
                            mb="lg"
                        >
                            {plan.features.map((feature, i) => (
                                <List.Item key={i}>{feature}</List.Item>
                            ))}
                        </List>
                        <Button
                            fullWidth
                            variant={plan.popular ? 'gradient' : 'light'}
                            gradient={{ from: '#0087ff', to: '#00c6ff' }}
                            color="blue"
                        >
                            {plan.price === 'Sob consulta' ? 'Falar com vendas' : 'Começar agora'}
                        </Button>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Info Cards */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                {[
                    { icon: IconCreditCard, title: 'Pagamento Seguro', desc: 'Cartão, boleto ou PIX' },
                    { icon: IconReceipt, title: 'Nota Fiscal', desc: 'Emissão automática' },
                    { icon: IconRefresh, title: 'Cancelamento', desc: 'Sem multa ou fidelidade' },
                    { icon: IconShieldCheck, title: 'Garantia', desc: '30 dias de teste grátis' },
                ].map((item, index) => (
                    <Card
                        key={index}
                        padding="md"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <Group>
                            <ThemeIcon size={36} radius="md" variant="light" color="blue">
                                <item.icon size={18} />
                            </ThemeIcon>
                            <Box>
                                <Text fw={500} c="white" size="sm">{item.title}</Text>
                                <Text c="dimmed" size="xs">{item.desc}</Text>
                            </Box>
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>
        </PageTemplate>
    );
}
