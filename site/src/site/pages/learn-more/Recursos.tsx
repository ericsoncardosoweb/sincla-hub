import { SimpleGrid, Card, Text, Group, ThemeIcon } from '@mantine/core';
import { Link } from 'react-router-dom';
import {
    IconBook,
    IconUsers,
    IconCertificate,
    IconCode,
    IconBuilding,
    IconHeadset,
    IconShoppingCart,
    IconApps,
    IconUser,
    IconArrowRight,
} from '@tabler/icons-react';
import { PageTemplate } from '../../components/page-template';

const resources = [
    {
        icon: IconBook,
        title: 'Documentação',
        description: 'Guias, tutoriais e referência da API',
        href: '/documentacao',
        color: 'blue',
    },
    {
        icon: IconCertificate,
        title: 'Treinamento e Certificação',
        description: 'Cursos e certificações oficiais',
        href: '/treinamento',
        color: 'violet',
    },
    {
        icon: IconCode,
        title: 'Recursos de Desenvolvedores',
        description: 'APIs, SDKs e ferramentas de integração',
        href: '/desenvolvedores',
        color: 'teal',
    },
    {
        icon: IconUsers,
        title: 'Programa de Parceiros',
        description: 'Junte-se ao ecossistema Sincla',
        href: '/parceiros',
        color: 'orange',
    },
    {
        icon: IconBuilding,
        title: 'Serviços Corporativos',
        description: 'Implementação e consultoria personalizada',
        href: '/servicos-corporativos',
        color: 'pink',
    },
    {
        icon: IconHeadset,
        title: 'Suporte Técnico',
        description: 'Central de ajuda e atendimento',
        href: '/suporte',
        color: 'cyan',
    },
    {
        icon: IconUsers,
        title: 'Comunidade',
        description: 'Fórum e comunidade de usuários',
        href: '/comunidade',
        color: 'grape',
    },
    {
        icon: IconShoppingCart,
        title: 'Compras e Licenciamento',
        description: 'Planos, preços e licenças',
        href: '/compras',
        color: 'lime',
    },
    {
        icon: IconApps,
        title: 'Marketplace',
        description: 'Apps, integrações e templates',
        href: '/marketplace',
        color: 'indigo',
    },
    {
        icon: IconUser,
        title: 'Minha Conta',
        description: 'Configurações e preferências',
        href: '/minha-conta',
        color: 'gray',
    },
];

export function Recursos() {
    return (
        <PageTemplate
            title="Todos os Recursos"
            subtitle="Explore tudo que a Sincla oferece para ajudar você e sua empresa"
            breadcrumbs={[
                { label: 'Início', href: '/' },
                { label: 'Recursos' },
            ]}
        >
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {resources.map((resource, index) => (
                    <Card
                        key={index}
                        padding="lg"
                        radius="md"
                        component={Link}
                        to={resource.href}
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            transition: 'border-color 0.2s, transform 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(0, 135, 255, 0.3)';
                            e.currentTarget.style.transform = 'translateY(-4px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <Group justify="space-between" mb="md">
                            <ThemeIcon
                                size={50}
                                radius="md"
                                variant="light"
                                color={resource.color}
                            >
                                <resource.icon size={26} />
                            </ThemeIcon>
                            <IconArrowRight size={20} color="#868e96" />
                        </Group>
                        <Text fw={600} c="white" mb="xs">
                            {resource.title}
                        </Text>
                        <Text size="sm" c="dimmed">
                            {resource.description}
                        </Text>
                    </Card>
                ))}
            </SimpleGrid>
        </PageTemplate>
    );
}
