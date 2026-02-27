import { SimpleGrid, Card, Text, Group, Box, Button, ThemeIcon, List, Badge } from '@mantine/core';
import { IconBuilding, IconHeadset, IconSettings, IconShieldCheck, IconRocket, IconCheck, IconUsers } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const services = [
    {
        icon: IconSettings,
        title: 'Implementação Personalizada',
        description: 'Nossa equipe configura a plataforma de acordo com suas necessidades específicas',
        features: [
            'Análise de requisitos',
            'Configuração customizada',
            'Migração de dados',
            'Testes e validação',
        ],
    },
    {
        icon: IconHeadset,
        title: 'Suporte Dedicado',
        description: 'Atendimento prioritário 24/7 com SLA garantido',
        features: [
            'Gerente de conta exclusivo',
            'Suporte técnico 24/7',
            'SLA de até 1 hora',
            'Canal direto de comunicação',
        ],
    },
    {
        icon: IconUsers,
        title: 'Treinamento In-Company',
        description: 'Capacitação presencial ou remota para sua equipe',
        features: [
            'Treinamento personalizado',
            'Material exclusivo',
            'Certificação incluída',
            'Acompanhamento pós-treinamento',
        ],
    },
    {
        icon: IconShieldCheck,
        title: 'Consultoria de Segurança',
        description: 'Auditoria e adequação às melhores práticas de segurança',
        features: [
            'Auditoria de segurança',
            'Adequação LGPD',
            'Políticas de acesso',
            'Relatórios de compliance',
        ],
    },
];

const benefits = [
    'Redução de até 60% no tempo de implantação',
    'ROI comprovado em até 6 meses',
    'Suporte especializado durante todo o projeto',
    'Garantia de satisfação',
];

export function ServicosCorporativos() {
    return (
        <PageTemplate
            title="Serviços Corporativos"
            subtitle="Soluções personalizadas para empresas que precisam de mais que uma plataforma"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Saiba Mais' },
                { label: 'Serviços Corporativos' },
            ]}
        >
            {/* Services Grid */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="xl">
                {services.map((service, index) => (
                    <Card
                        key={index}
                        padding="xl"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <Group mb="md">
                            <ThemeIcon
                                size={50}
                                radius="md"
                                variant="gradient"
                                gradient={{ from: '#0087ff', to: '#00c6ff' }}
                            >
                                <service.icon size={26} />
                            </ThemeIcon>
                            <Box>
                                <Text fw={700} size="lg" c="white">
                                    {service.title}
                                </Text>
                            </Box>
                        </Group>
                        <Text c="dimmed" size="sm" mb="md">
                            {service.description}
                        </Text>
                        <List
                            spacing="xs"
                            size="sm"
                            c="dimmed"
                            icon={
                                <ThemeIcon color="teal" size={18} radius="xl">
                                    <IconCheck size={10} />
                                </ThemeIcon>
                            }
                        >
                            {service.features.map((feature, i) => (
                                <List.Item key={i}>{feature}</List.Item>
                            ))}
                        </List>
                    </Card>
                ))}
            </SimpleGrid>

            {/* CTA Card */}
            <Card
                padding="xl"
                radius="md"
                style={{
                    background: 'linear-gradient(135deg, rgba(0, 135, 255, 0.15) 0%, rgba(0, 198, 255, 0.08) 100%)',
                    border: '1px solid rgba(0, 135, 255, 0.3)',
                }}
            >
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                    <Box>
                        <Group mb="md">
                            <ThemeIcon size={50} radius="md" variant="light" color="blue">
                                <IconBuilding size={26} />
                            </ThemeIcon>
                            <Box>
                                <Text fw={700} size="xl" c="white">
                                    Enterprise
                                </Text>
                                <Badge color="blue" variant="light">Para grandes empresas</Badge>
                            </Box>
                        </Group>
                        <Text c="dimmed" mb="md">
                            Solução completa para empresas com mais de 500 colaboradores que precisam de
                            personalização avançada, integrações complexas e suporte dedicado.
                        </Text>
                        <Button
                            variant="gradient"
                            gradient={{ from: '#0087ff', to: '#00c6ff' }}
                            size="lg"
                            leftSection={<IconRocket size={18} />}
                        >
                            Falar com especialista
                        </Button>
                    </Box>
                    <Box>
                        <Text fw={600} c="white" mb="md">Por que escolher Enterprise?</Text>
                        <List
                            spacing="sm"
                            size="sm"
                            c="dimmed"
                            icon={
                                <ThemeIcon color="teal" size={20} radius="xl">
                                    <IconCheck size={12} />
                                </ThemeIcon>
                            }
                        >
                            {benefits.map((benefit, i) => (
                                <List.Item key={i}>{benefit}</List.Item>
                            ))}
                        </List>
                    </Box>
                </SimpleGrid>
            </Card>
        </PageTemplate>
    );
}
