import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    SimpleGrid,
    Card,
    Group,
    Badge,
    Button,
    Stack,
    ThemeIcon,
    Skeleton,
    ScrollArea,
    ActionIcon,
    Tooltip,
    Modal,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconUsers,
    IconSchool,
    IconTarget,
    IconCalendar,
    IconBuildingCommunity,
    IconPlus,
    IconBuilding,
    IconCreditCard,
    IconUserCircle,
    IconHeadset,
    IconExternalLink,
    IconRocket,
    IconArrowRight,
    IconShoppingCart,
    IconMessage,
    IconChartBar,
    IconEdit,
    IconSwitchHorizontal,
    IconShare,
    IconCheck,
    IconAlertCircle,
} from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { redirectToProduct } from '../../shared/services/cross-auth';
import styles from './Dashboard.module.css';

// ============================
// Types
// ============================

interface ProductWithSubscription {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    base_url: string;
    brand_color: string | null;
    landing_url: string | null;
    hasPlans: boolean;
    subscription?: {
        id: string;
        plan: string;
        status: string;
        seats_used: number;
        seats_limit: number;
    };
}

const iconMap: Record<string, typeof IconUsers> = {
    IconUsers,
    IconSchool,
    IconTarget,
    IconCalendar,
    IconBuildingCommunity,
    IconShoppingCart,
    IconMessage,
    IconChartBar,
};

// ============================
// Component
// ============================

export function DashboardHome() {
    const { subscriber, companies = [], currentCompany, setCurrentCompany } = useAuth();
    const navigate = useNavigate();

    const [products, setProducts] = useState<ProductWithSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedToolId, setCopiedToolId] = useState<string | null>(null);

    // Modal de troca de empresa
    const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
    const [pendingEditCompany, setPendingEditCompany] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        loadProducts();
    }, [currentCompany]);

    // Redirect pós-troca de empresa
    useEffect(() => {
        const pendingRedirect = localStorage.getItem('sincla_pending_redirect');
        if (pendingRedirect && !loading) {
            localStorage.removeItem('sincla_pending_redirect');
            navigate(pendingRedirect);
        }
    }, [loading, navigate]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            // Load all active products
            const { data: allProducts } = await supabase
                .from('products')
                .select('id, name, description, icon, base_url, brand_color, landing_url, is_active, sort_order')
                .eq('is_active', true)
                .order('sort_order');

            // Load which products have active plans
            const { data: plansData } = await supabase
                .from('product_plans')
                .select('product_id')
                .eq('is_active', true);

            const productsWithPlans = new Set((plansData || []).map(p => p.product_id));

            let subsMap: Record<string, any> = {};
            if (currentCompany) {
                const { data: subscriptions } = await supabase
                    .from('subscriptions')
                    .select('id, product_id, plan, status, seats_used, seats_limit')
                    .eq('company_id', currentCompany.id);

                (subscriptions || []).forEach(s => {
                    subsMap[s.product_id] = s;
                });
            }

            const mapped: ProductWithSubscription[] = (allProducts || []).map(p => ({
                ...p,
                hasPlans: productsWithPlans.has(p.id),
                subscription: subsMap[p.id] ? {
                    id: subsMap[p.id].id,
                    plan: subsMap[p.id].plan,
                    status: subsMap[p.id].status,
                    seats_used: subsMap[p.id].seats_used || 0,
                    seats_limit: subsMap[p.id].seats_limit || 0,
                } : undefined,
            }));

            setProducts(mapped);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccessProduct = async (product: ProductWithSubscription) => {
        if (!currentCompany) return;
        try {
            await redirectToProduct(
                { id: product.id, base_url: product.base_url } as any,
                currentCompany as any
            );
        } catch (error) {
            console.error('Error redirecting:', error);
        }
    };

    const handleActivateProduct = (product: ProductWithSubscription) => {
        navigate(`/painel/assinaturas?produto=${product.id}`);
    };

    // Greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    const firstName = subscriber?.name?.split(' ')[0] || 'Usuário';

    // Build login URL for a tool (custom_domain or default)
    const getToolLoginUrl = (tool: ProductWithSubscription) => {
        const slug = currentCompany?.slug || '';
        if (currentCompany?.custom_domain) {
            return `https://${currentCompany.custom_domain}/${slug}/login`;
        }
        return `${window.location.origin}${tool.base_url}/${slug}/login`;
    };

    const handleCopyToolLink = (tool: ProductWithSubscription) => {
        const url = getToolLoginUrl(tool);
        navigator.clipboard.writeText(url);
        setCopiedToolId(tool.id);
        setTimeout(() => setCopiedToolId(null), 2000);
    };
    const activeProducts = products.filter(p => p.subscription && ['active', 'trial'].includes(p.subscription.status));
    const allTools = products;

    // Handler de edição de empresa com verificação de empresa ativa
    const handleEditCompany = useCallback((company: { id: string; name: string }) => {
        if (currentCompany?.id === company.id) {
            // Empresa já ativa — navegar direto
            navigate('/painel/configuracoes');
        } else {
            // Empresa inativa — abrir modal de confirmação
            setPendingEditCompany(company);
            openEditModal();
        }
    }, [currentCompany, navigate, openEditModal]);

    const handleConfirmSwitchAndEdit = useCallback(() => {
        if (!pendingEditCompany) return;
        localStorage.setItem('sincla_pending_redirect', '/painel/configuracoes');
        setCurrentCompany(pendingEditCompany.id);
        closeEditModal();
    }, [pendingEditCompany, setCurrentCompany, closeEditModal]);

    // Quick access links
    const quickLinks = [
        { icon: IconRocket, label: 'Meu Onboarding', path: '/painel/onboarding', color: '#f50057' },
        { icon: IconUsers, label: 'Gestão de Usuários', path: '/painel/equipe', color: '#6200ea' },
        { icon: IconCreditCard, label: 'Minhas Assinaturas', path: '/painel/assinaturas', color: '#00c853' },
        { icon: IconUserCircle, label: 'Perfil e Senha', path: '/painel/perfil', color: '#0087ff' },
        { icon: IconHeadset, label: 'Suporte', path: '/painel/contatos', color: '#ff8c00' },
    ];

    return (
        <Container size="xl" py="md">
            {/* Modal de confirmação de troca de empresa */}
            <Modal
                opened={editModalOpened}
                onClose={closeEditModal}
                title={
                    <Group gap="xs">
                        <IconAlertCircle size={20} color="#ff8c00" />
                        <Text fw={600}>Trocar de empresa</Text>
                    </Group>
                }
                centered
                radius="md"
            >
                <Stack gap="md">
                    <Text size="sm">
                        Você está conectado à empresa <strong>{currentCompany?.name}</strong>, mas está tentando editar a empresa <strong>{pendingEditCompany?.name}</strong>.
                    </Text>
                    <Text size="sm" c="dimmed">
                        Para editar, é necessário mudar para essa empresa. Deseja continuar?
                    </Text>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={closeEditModal}>
                            Cancelar
                        </Button>
                        <Button
                            style={{ backgroundColor: '#ff8c00' }}
                            onClick={handleConfirmSwitchAndEdit}
                            leftSection={<IconSwitchHorizontal size={16} />}
                        >
                            Mudar e Editar
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Greeting */}
            <div className={styles.greeting}>
                <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
                    <div>
                        <Title order={2}>
                            {getGreeting()}, {firstName}! 👋
                        </Title>
                        <Text c="dimmed" size="sm">
                            Gerencie seus produtos e empresas no Sincla Hub
                        </Text>
                    </div>
                    {currentCompany && (
                        <Badge
                            size="lg"
                            radius="md"
                            className={styles.connectedBadge}
                            leftSection={<IconBuilding size={14} />}
                        >
                            Conectado como: {currentCompany.name}
                        </Badge>
                    )}
                </Group>
            </div>

            {/* 3 Main Cards */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" mb="xl">
                {/* Card A: Meus APPs */}
                <Card withBorder radius="md" className={styles.mainCard}>
                    <Card.Section withBorder inheritPadding py="xs">
                        <Group justify="space-between">
                            <Text fw={600} size="sm">Meus APPs</Text>
                            <Badge variant="light" color="blue" size="sm">
                                {activeProducts.length}
                            </Badge>
                        </Group>
                    </Card.Section>
                    <Stack gap="xs" mt="md" className={styles.mainCardBody}>
                        {loading ? (
                            <>
                                <Skeleton height={36} radius="md" />
                                <Skeleton height={36} radius="md" />
                            </>
                        ) : activeProducts.length > 0 ? (
                            activeProducts.map(product => {
                                const IconComp = iconMap[product.icon] || IconUsers;
                                const color = product.brand_color || '#0087ff';
                                return (
                                    <Group
                                        key={product.id}
                                        className={styles.listItem}
                                        wrap="nowrap"
                                    >
                                        <ThemeIcon
                                            size={28}
                                            radius="md"
                                            variant="light"
                                            style={{ backgroundColor: `${color}18`, color }}
                                        >
                                            <IconComp size={16} />
                                        </ThemeIcon>
                                        <Text size="sm" fw={500} style={{ flex: 1 }}>{product.name}</Text>
                                        <Group gap={4} wrap="nowrap">
                                            <Tooltip label={copiedToolId === product.id ? 'Link copiado!' : 'Compartilhar link'} withArrow>
                                                <ActionIcon
                                                    variant="subtle"
                                                    size="sm"
                                                    color={copiedToolId === product.id ? 'green' : 'gray'}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopyToolLink(product);
                                                    }}
                                                >
                                                    {copiedToolId === product.id ? <IconCheck size={14} /> : <IconShare size={14} />}
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Acessar ferramenta" withArrow>
                                                <ActionIcon
                                                    variant="light"
                                                    size="sm"
                                                    color="blue"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAccessProduct(product);
                                                    }}
                                                >
                                                    <IconExternalLink size={14} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </Group>
                                );
                            })
                        ) : (
                            <div className={styles.emptyState}>
                                <IconRocket size={32} color="var(--mantine-color-gray-4)" />
                                <Text size="sm" c="dimmed" ta="center">
                                    Nenhum produto ativo
                                </Text>
                                <Button
                                    size="xs"
                                    variant="light"
                                    leftSection={<IconPlus size={14} />}
                                    onClick={() => {
                                        const el = document.getElementById('tools-carousel');
                                        el?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                >
                                    Adicione seu primeiro
                                </Button>
                            </div>
                        )}
                    </Stack>
                </Card>

                {/* Card B: Minhas Empresas */}
                <Card withBorder radius="md" className={styles.mainCard}>
                    <Card.Section withBorder inheritPadding py="xs">
                        <Group justify="space-between">
                            <Text fw={600} size="sm">Minhas Empresas</Text>
                            <Badge variant="light" color="teal" size="sm">
                                {companies.length}
                            </Badge>
                        </Group>
                    </Card.Section>
                    <Stack gap="xs" mt="md" className={styles.mainCardBody}>
                        {loading ? (
                            <>
                                <Skeleton height={36} radius="md" />
                                <Skeleton height={36} radius="md" />
                            </>
                        ) : (
                            <>
                                {companies.map(company => (
                                    <Group
                                        key={company.id}
                                        className={styles.listItem}
                                        wrap="nowrap"
                                    >
                                        <ThemeIcon size={28} radius="md" variant="light" color="teal">
                                            <IconBuilding size={16} />
                                        </ThemeIcon>
                                        <Text size="sm" fw={500} style={{ flex: 1 }} lineClamp={1}>{company.name}</Text>
                                        {currentCompany?.id === company.id && (
                                            <Badge size="xs" variant="dot" color="teal">Ativa</Badge>
                                        )}
                                        <Group gap={4} wrap="nowrap">
                                            {currentCompany?.id !== company.id && (
                                                <Tooltip label="Acessar empresa" withArrow>
                                                    <ActionIcon
                                                        variant="subtle"
                                                        size="sm"
                                                        color="teal"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCurrentCompany(company.id);
                                                        }}
                                                    >
                                                        <IconSwitchHorizontal size={14} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                            <Tooltip label="Editar empresa" withArrow>
                                                <ActionIcon
                                                    variant="subtle"
                                                    size="sm"
                                                    color="gray"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditCompany(company);
                                                    }}
                                                >
                                                    <IconEdit size={14} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </Group>
                                ))}
                                <Button
                                    variant="subtle"
                                    size="xs"
                                    leftSection={<IconPlus size={14} />}
                                    fullWidth
                                    className={styles.addButton}
                                    onClick={() => navigate('/painel/empresas?criar=true')}
                                >
                                    Nova Empresa
                                </Button>
                            </>
                        )}
                    </Stack>
                </Card>

                {/* Card C: Acesso Rápido */}
                <Card withBorder radius="md" className={styles.mainCard}>
                    <Card.Section withBorder inheritPadding py="xs">
                        <Text fw={600} size="sm">Acesso Rápido</Text>
                    </Card.Section>
                    <Stack gap="xs" mt="md" className={styles.mainCardBody}>
                        {quickLinks.map(link => (
                            <Group
                                key={link.path}
                                className={styles.listItem}
                                onClick={() => navigate(link.path)}
                            >
                                <ThemeIcon
                                    size={28}
                                    radius="md"
                                    variant="light"
                                    style={{ backgroundColor: `${link.color}18`, color: link.color }}
                                >
                                    <link.icon size={16} />
                                </ThemeIcon>
                                <Text size="sm" fw={500} style={{ flex: 1 }}>{link.label}</Text>
                                <IconArrowRight size={14} color="var(--mantine-color-gray-4)" />
                            </Group>
                        ))}
                    </Stack>
                </Card>
            </SimpleGrid>

            {/* Tools Carousel */}
            <div id="tools-carousel">
                <Group justify="space-between" mb="md">
                    <div>
                        <Title order={4}>Ferramentas Sincla</Title>
                        <Text size="sm" c="dimmed">Explore e ative as soluções do ecossistema</Text>
                    </div>
                </Group>

                {loading ? (
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                        {Array(4).fill(0).map((_, i) => <Skeleton key={i} height={200} radius="md" />)}
                    </SimpleGrid>
                ) : (
                    <ScrollArea type="auto" offsetScrollbars>
                        <div className={styles.toolsCarousel}>
                            {allTools.map(tool => {
                                const IconComp = iconMap[tool.icon] || IconUsers;
                                const color = tool.brand_color || '#0087ff';
                                const isActive = tool.subscription && ['active', 'trial'].includes(tool.subscription.status);

                                return (
                                    <Card
                                        key={tool.id}
                                        withBorder
                                        radius="md"
                                        className={`${styles.toolCard} ${isActive ? styles.toolCardActive : ''}`}
                                        style={{ '--tool-color': color } as React.CSSProperties}
                                    >
                                        {/* Top: icon + status + share */}
                                        <Group justify="space-between" mb="md">
                                            <ThemeIcon
                                                size={48}
                                                radius="md"
                                                variant="light"
                                                style={{ backgroundColor: `${color}18`, color }}
                                            >
                                                <IconComp size={24} />
                                            </ThemeIcon>
                                            <Group gap={6}>
                                                {isActive && (
                                                    <Tooltip
                                                        label={copiedToolId === tool.id ? 'Link copiado!' : 'Copiar link de login'}
                                                        withArrow
                                                        position="top"
                                                        opened={copiedToolId === tool.id ? true : undefined}
                                                        color={copiedToolId === tool.id ? 'green' : undefined}
                                                    >
                                                        <ActionIcon
                                                            variant="subtle"
                                                            size="sm"
                                                            color={copiedToolId === tool.id ? 'green' : 'gray'}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopyToolLink(tool);
                                                            }}
                                                        >
                                                            {copiedToolId === tool.id ? <IconCheck size={14} /> : <IconShare size={14} />}
                                                        </ActionIcon>
                                                    </Tooltip>
                                                )}
                                                <Badge
                                                    variant="light"
                                                    color={isActive ? 'green' : 'gray'}
                                                    size="sm"
                                                >
                                                    {isActive
                                                        ? (tool.subscription?.status === 'trial' ? 'Trial' : 'Ativo')
                                                        : 'Disponível'}
                                                </Badge>
                                            </Group>
                                        </Group>

                                        {/* Name + desc */}
                                        <Text fw={600} size="sm" mb={4}>{tool.name}</Text>
                                        <Text size="xs" c="dimmed" lineClamp={2} mb="md" className={styles.toolDesc}>
                                            {tool.description || 'Plataforma Sincla'}
                                        </Text>

                                        {/* CTAs */}
                                        <Group gap="xs" mt="auto">
                                            {!tool.hasPlans && !isActive ? (
                                                <Badge
                                                    variant="light"
                                                    color="gray"
                                                    size="lg"
                                                    style={{ flex: 1, textAlign: 'center' }}
                                                >
                                                    Em Breve
                                                </Badge>
                                            ) : (
                                                <>
                                                    {tool.landing_url && (
                                                        <Button
                                                            variant="light"
                                                            size="xs"
                                                            color="gray"
                                                            component="a"
                                                            href={tool.landing_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            leftSection={<IconExternalLink size={14} />}
                                                            style={{ flex: 1 }}
                                                        >
                                                            Conhecer
                                                        </Button>
                                                    )}
                                                    {isActive ? (
                                                        <Button
                                                            size="xs"
                                                            style={{ flex: 1, backgroundColor: color }}
                                                            onClick={() => handleAccessProduct(tool)}
                                                        >
                                                            Acessar
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="xs"
                                                            variant="filled"
                                                            style={{ flex: 1, backgroundColor: color }}
                                                            onClick={() => handleActivateProduct(tool)}
                                                        >
                                                            Ativar
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </Group>
                                    </Card>
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </Container>
    );
}
