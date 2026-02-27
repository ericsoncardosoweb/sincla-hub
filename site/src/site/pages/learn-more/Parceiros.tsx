import { SimpleGrid, Card, Text, Group, Box, Button, ThemeIcon } from '@mantine/core';
import { IconUsers, IconBuildingStore, IconCode, IconCertificate, IconArrowRight } from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const partnerTypes = [
    {
        icon: IconBuildingStore,
        title: 'Parceiro Revendedor',
        description: 'Revenda as soluções Sincla e aumente sua receita',
        benefits: ['Comissões atrativas', 'Treinamento completo', 'Material de marketing'],
        color: 'blue',
    },
    {
        icon: IconCode,
        title: 'Parceiro de Tecnologia',
        description: 'Integre suas soluções com a plataforma Sincla',
        benefits: ['APIs abertas', 'Suporte técnico dedicado', 'Visibilidade no Marketplace'],
        color: 'violet',
    },
    {
        icon: IconCertificate,
        title: 'Parceiro Consultor',
        description: 'Implemente e customize soluções para clientes',
        benefits: ['Certificação oficial', 'Leads qualificados', 'Ferramentas exclusivas'],
        color: 'teal',
    },
];

const featuredPartners = [
    { name: 'Microsoft', type: 'Tecnologia' },
    { name: 'Totvs', type: 'Integração' },
    { name: 'AWS', type: 'Infraestrutura' },
    { name: 'Contabilizei', type: 'Serviços' },
    { name: 'Gupy', type: 'RH' },
    { name: 'Pagar.me', type: 'Pagamentos' },
];

export function Parceiros() {
    return (
        <PageTemplate
            title="Programa de Parceiros"
            subtitle="Junte-se ao ecossistema Sincla e cresça junto conosco"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Saiba Mais' },
                { label: 'Parceiros' },
            ]}
        >
            {/* Partner Types */}
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mb="xl">
                {partnerTypes.map((type, index) => (
                    <Card
                        key={index}
                        padding="xl"
                        radius="md"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <ThemeIcon
                            size={60}
                            radius="md"
                            variant="gradient"
                            gradient={{ from: '#0087ff', to: '#00c6ff' }}
                            mb="md"
                        >
                            <type.icon size={30} />
                        </ThemeIcon>
                        <Text fw={700} size="lg" c="white" mb="xs">
                            {type.title}
                        </Text>
                        <Text c="dimmed" size="sm" mb="md">
                            {type.description}
                        </Text>
                        <Box mb="md">
                            {type.benefits.map((benefit, i) => (
                                <Group key={i} gap="xs" mb="xs">
                                    <IconArrowRight size={14} color="#0087ff" />
                                    <Text size="sm" c="dimmed">{benefit}</Text>
                                </Group>
                            ))}
                        </Box>
                        <Button variant="light" color={type.color} fullWidth>
                            Saiba mais
                        </Button>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Featured Partners */}
            <Card
                padding="xl"
                radius="md"
                style={{
                    background: 'linear-gradient(135deg, rgba(0, 135, 255, 0.08) 0%, rgba(0, 198, 255, 0.04) 100%)',
                    border: '1px solid rgba(0, 135, 255, 0.15)',
                }}
            >
                <Group justify="space-between" mb="lg" wrap="wrap">
                    <Box>
                        <Text fw={600} size="lg" c="white">Parceiros em Destaque</Text>
                        <Text c="dimmed" size="sm">Empresas que confiam e integram com a Sincla</Text>
                    </Box>
                    <Button variant="subtle" color="blue" rightSection={<IconArrowRight size={16} />}>
                        Ver todos
                    </Button>
                </Group>
                <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md">
                    {featuredPartners.map((partner, index) => (
                        <Card
                            key={index}
                            padding="md"
                            radius="md"
                            ta="center"
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                        >
                            <Text fw={600} c="white" size="sm">{partner.name}</Text>
                            <Text c="dimmed" size="xs">{partner.type}</Text>
                        </Card>
                    ))}
                </SimpleGrid>
            </Card>

            {/* CTA */}
            <Card
                padding="xl"
                radius="md"
                mt="xl"
                ta="center"
                style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <ThemeIcon size={60} radius="xl" variant="light" color="blue" mx="auto" mb="md">
                    <IconUsers size={30} />
                </ThemeIcon>
                <Text fw={700} size="xl" c="white" mb="xs">
                    Quer se tornar um parceiro?
                </Text>
                <Text c="dimmed" mb="lg" maw={500} mx="auto">
                    Preencha o formulário e nossa equipe entrará em contato para discutir as oportunidades.
                </Text>
                <Button
                    variant="gradient"
                    gradient={{ from: '#0087ff', to: '#00c6ff' }}
                    size="lg"
                >
                    Candidatar-se agora
                </Button>
            </Card>
        </PageTemplate>
    );
}
