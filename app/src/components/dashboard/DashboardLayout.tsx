import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Outlet, Link, Navigate } from 'react-router-dom';
import {
    AppShell,
    Group,
    Text,
    UnstyledButton,
    Stack,
    Avatar,
    Menu,
    Divider,
    Badge,
    Loader,
    Center,
    Select,
    Tooltip,
    Burger,
    Drawer,
    Popover,
    SimpleGrid,
    ThemeIcon,
    ActionIcon,
    rem,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
    IconLayoutDashboard,
    IconBuilding,
    IconSettings,
    IconCreditCard,
    IconUsers,
    IconPlugConnected,
    IconAddressBook,
    IconLogout,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconHeartHandshake,
    IconShield,
    IconGridDots,
    IconSchool,
    IconTarget,
    IconCalendar,
    IconBuildingCommunity,
    IconExternalLink,
    IconBrandWhatsapp,
    IconLifebuoy,
    IconWorld,
    IconBook,
    IconEye,
} from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';
import { supabase } from '../../shared/lib/supabase';
import { redirectToProduct } from '../../shared/services/cross-auth';
import styles from './DashboardLayout.module.css';

// ============================
// Types
// ============================

interface NavItem {
    icon: typeof IconLayoutDashboard;
    label: string;
    path: string;
    badge?: string;
}

interface ToolProduct {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    base_url: string;
    brand_color: string | null;
    landing_url: string | null;
    is_active: boolean;
    hasSubscription: boolean;
}

const mainNavItems: NavItem[] = [
    { icon: IconLayoutDashboard, label: 'Dashboard', path: '/painel' },
    { icon: IconBuilding, label: 'Empresas', path: '/painel/empresas' },
    { icon: IconAddressBook, label: 'Contatos', path: '/painel/contatos' },
    { icon: IconUsers, label: 'Equipe', path: '/painel/equipe' },
    { icon: IconPlugConnected, label: 'Integrações', path: '/painel/integracoes' },
    { icon: IconCreditCard, label: 'Assinaturas', path: '/painel/assinaturas' },
];

const iconMap: Record<string, typeof IconUsers> = {
    IconUsers,
    IconSchool,
    IconTarget,
    IconCalendar,
    IconBuildingCommunity,
};

export function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, subscriber, companies, currentCompany, setCurrentCompany, signOut, loading } = useAuth();

    // Responsive breakpoints
    const isCompact = useMediaQuery('(max-width: 1439px)');
    const isMobile = useMediaQuery('(max-width: 1023px)');

    // Sidebar state
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpened, setMobileOpened] = useState(false);
    const [toolsOpened, setToolsOpened] = useState(false);
    const [toolProducts, setToolProducts] = useState<ToolProduct[]>([]);

    // Auto-collapse based on screen size
    useEffect(() => {
        if (isMobile) {
            setCollapsed(false);
            setMobileOpened(false);
        } else if (isCompact) {
            setCollapsed(true);
        } else {
            setCollapsed(false);
        }
    }, [isCompact, isMobile]);

    // Load products for tools grid
    useEffect(() => {
        loadToolProducts();
    }, [currentCompany]);

    const loadToolProducts = async () => {
        try {
            const { data: allProducts } = await supabase
                .from('products')
                .select('id, name, description, icon, base_url, brand_color, landing_url, is_active, sort_order')
                .eq('is_active', true)
                .order('sort_order');

            let activeSubs: string[] = [];
            if (currentCompany) {
                const { data: subscriptions } = await supabase
                    .from('subscriptions')
                    .select('product_id')
                    .eq('company_id', currentCompany.id)
                    .in('status', ['active', 'trial']);

                activeSubs = (subscriptions || []).map(s => s.product_id);
            }

            const mapped: ToolProduct[] = (allProducts || []).map(p => ({
                ...p,
                hasSubscription: activeSubs.includes(p.id),
            }));

            mapped.sort((a, b) => {
                if (a.hasSubscription && !b.hasSubscription) return -1;
                if (!a.hasSubscription && b.hasSubscription) return 1;
                return 0; // preserve sort_order from DB
            });

            setToolProducts(mapped);
        } catch (error) {
            console.error('Error loading tools:', error);
        }
    };

    const toggleSidebar = useCallback(() => {
        if (isMobile) {
            setMobileOpened(prev => !prev);
        } else {
            setCollapsed(prev => !prev);
        }
    }, [isMobile]);

    // Loading state
    if (loading) {
        return (
            <Center h="100vh">
                <Loader size="lg" color="blue" />
            </Center>
        );
    }

    // Not authenticated
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const handleCompanyChange = (companyId: string | null) => {
        if (companyId) {
            localStorage.setItem('sincla_current_company', companyId);
            setCurrentCompany(companyId);
            // Force full reload to ensure clean data
            window.location.reload();
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const handleNavClick = (path: string) => {
        navigate(path);
        if (isMobile) setMobileOpened(false);
    };

    const sidebarWidth = collapsed ? 70 : 260;

    // Check if user is a partner
    const isPartner = (subscriber as any)?.is_partner;

    // Company URL for external link
    const companyUrl = currentCompany?.slug
        ? `https://app.sincla.com.br/${currentCompany.slug}`
        : null;

    const handleShareWhatsApp = () => {
        const text = encodeURIComponent(
            `Conheça o Sincla! Plataforma completa para gestão de negócios: https://sincla.com.br`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    // Sidebar content (reusable for both desktop and mobile drawer)
    const sidebarContent = (
        <>
            {/* Logo area at top of sidebar */}
            <div className={styles.sidebarLogoArea}>
                <Link to="/painel" className={styles.logoLink}>
                    {collapsed && !isMobile ? (
                        <img
                            src="/favicon.svg"
                            alt="Sincla"
                            height={36}
                            style={{ display: 'block' }}
                        />
                    ) : (
                        <img
                            src="/logos/logo-sincla.svg"
                            alt="Sincla"
                            height={30}
                            style={{ display: 'block' }}
                        />
                    )}
                </Link>

            </div>

            {/* Collapse/Expand toggle — floats at sidebar edge */}
            {!isMobile && (
                <UnstyledButton
                    onClick={toggleSidebar}
                    className={styles.sidebarToggle}
                    aria-label={collapsed ? 'Expandir menu' : 'Comprimir menu'}
                >
                    {collapsed ? (
                        <IconChevronRight size={14} />
                    ) : (
                        <IconChevronLeft size={14} />
                    )}
                </UnstyledButton>
            )}

            <Divider mb="sm" />

            <Stack gap={4} className={styles.navList}>
                {mainNavItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const navButton = (
                        <UnstyledButton
                            key={item.path}
                            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''} ${collapsed && !isMobile ? styles.navLinkCollapsed : ''}`}
                            onClick={() => handleNavClick(item.path)}
                        >
                            <item.icon
                                size={20}
                                stroke={1.5}
                                className={styles.navIcon}
                            />
                            {(!collapsed || isMobile) && (
                                <>
                                    <Text size="sm" className={styles.navLabel}>{item.label}</Text>
                                    {item.badge && (
                                        <Badge size="xs" variant="filled" color="blue" ml="auto">
                                            {item.badge}
                                        </Badge>
                                    )}
                                </>
                            )}
                        </UnstyledButton>
                    );

                    if (collapsed && !isMobile) {
                        return (
                            <Tooltip key={item.path} label={item.label} position="right" withArrow>
                                {navButton}
                            </Tooltip>
                        );
                    }
                    return navButton;
                })}
            </Stack>

            {/* Secondary Navigation */}
            <Divider my="sm" />
            <Stack gap={4} className={styles.navList}>
                {/* Parceiro - conditional */}
                {(() => {
                    const partnerItem = isPartner
                        ? { icon: IconEye, label: 'Visão de Parceiro', path: '/painel/parceiro' }
                        : { icon: IconHeartHandshake, label: 'Seja um Parceiro', path: '/painel/parceiro' };
                    const isActive = location.pathname === partnerItem.path;
                    const btn = (
                        <UnstyledButton
                            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''} ${collapsed && !isMobile ? styles.navLinkCollapsed : ''}`}
                            onClick={() => handleNavClick(partnerItem.path)}
                        >
                            <partnerItem.icon size={20} stroke={1.5} className={styles.navIcon} />
                            {(!collapsed || isMobile) && (
                                <Text size="sm" className={styles.navLabel}>{partnerItem.label}</Text>
                            )}
                        </UnstyledButton>
                    );
                    return collapsed && !isMobile
                        ? <Tooltip label={partnerItem.label} position="right" withArrow>{btn}</Tooltip>
                        : btn;
                })()}

                {/* Configurações */}
                {(() => {
                    const isActive = location.pathname === '/painel/configuracoes';
                    const btn = (
                        <UnstyledButton
                            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''} ${collapsed && !isMobile ? styles.navLinkCollapsed : ''}`}
                            onClick={() => handleNavClick('/painel/configuracoes')}
                        >
                            <IconSettings size={20} stroke={1.5} className={styles.navIcon} />
                            {(!collapsed || isMobile) && (
                                <Text size="sm" className={styles.navLabel}>Configurações</Text>
                            )}
                        </UnstyledButton>
                    );
                    return collapsed && !isMobile
                        ? <Tooltip label="Configurações" position="right" withArrow>{btn}</Tooltip>
                        : btn;
                })()}

                {/* External links - only visible when expanded */}
                {(!collapsed || isMobile) && (
                    <>
                        <UnstyledButton
                            className={styles.navLink}
                            onClick={() => window.open('https://sincla.com.br/tutoriais', '_blank')}
                        >
                            <IconBook size={20} stroke={1.5} className={styles.navIcon} />
                            <Text size="sm" className={styles.navLabel}>Tutoriais</Text>
                        </UnstyledButton>

                        <UnstyledButton
                            className={styles.navLink}
                            onClick={() => window.open('https://sincla.com.br/suporte', '_blank')}
                        >
                            <IconLifebuoy size={20} stroke={1.5} className={styles.navIcon} />
                            <Text size="sm" className={styles.navLabel}>Suporte</Text>
                        </UnstyledButton>

                        <UnstyledButton
                            className={styles.navLink}
                            onClick={() => window.open('https://sincla.com.br', '_blank')}
                        >
                            <IconWorld size={20} stroke={1.5} className={styles.navIcon} />
                            <Text size="sm" className={styles.navLabel}>Site Sincla</Text>
                        </UnstyledButton>

                        <Divider my="xs" />

                        <UnstyledButton
                            className={styles.navLink}
                            onClick={handleShareWhatsApp}
                            style={{ color: '#25D366' }}
                        >
                            <IconBrandWhatsapp size={20} stroke={1.5} className={styles.navIcon} />
                            <Text size="sm" className={styles.navLabel} fw={500}>Indique o Sincla!</Text>
                        </UnstyledButton>
                    </>
                )}
            </Stack>



            {/* Company Info Footer */}
            {(!collapsed || isMobile) && (
                <div className={styles.navbarFooter}>
                    <Divider my="md" />
                    <UnstyledButton
                        className={styles.companyInfo}
                        onClick={() => navigate('/painel/configuracoes')}
                        style={{ width: '100%' }}
                    >
                        <Group gap="sm" wrap="nowrap">
                            <Avatar
                                src={(currentCompany as any)?.favicon_url || (currentCompany as any)?.logo_url}
                                size={32}
                                radius="sm"
                                color="blue"
                            >
                                {currentCompany?.name?.charAt(0) || 'E'}
                            </Avatar>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Text size="sm" fw={500} lineClamp={1}>
                                    {currentCompany?.name || 'Nenhuma'}
                                </Text>
                                {currentCompany?.cnpj && (
                                    <Text size="xs" c="dimmed">{currentCompany.cnpj}</Text>
                                )}
                            </div>
                        </Group>
                    </UnstyledButton>
                </div>
            )}
        </>
    );

    // Tools grid content
    const activeTools = toolProducts.filter(t => t.hasSubscription);
    const availableTools = toolProducts.filter(t => !t.hasSubscription);

    const renderToolItem = (tool: ToolProduct) => {
        const IconComponent = iconMap[tool.icon] || IconUsers;
        const color = tool.brand_color || '#0087ff';

        return (
            <UnstyledButton
                key={tool.id}
                className={styles.toolItem}
                onClick={async () => {
                    setToolsOpened(false);
                    if (tool.hasSubscription) {
                        if (currentCompany) {
                            // Has access: generate SSO token and redirect
                            await redirectToProduct(tool as any, currentCompany as any);
                        } else {
                            window.location.href = tool.base_url;
                        }
                    } else {
                        // No access: go to plans/subscriptions
                        window.location.href = `/painel/assinaturas?produto=${tool.id}`;
                    }
                }}
            >
                <ThemeIcon
                    size={44}
                    radius="md"
                    variant="light"
                    style={{ backgroundColor: `${color}18`, color }}
                >
                    <IconComponent size={22} />
                </ThemeIcon>
                <Text size="xs" ta="center" mt={6} fw={500} lineClamp={1} className={styles.toolLabel}>
                    {tool.name.replace('Sincla ', '')}
                </Text>
                {tool.hasSubscription && (
                    <div className={styles.toolActiveDot} />
                )}
            </UnstyledButton>
        );
    };

    return (
        <AppShell
            layout="alt"
            header={{ height: 60 }}
            navbar={isMobile ? undefined : {
                width: sidebarWidth,
                breakpoint: 'sm',
            }}
            padding="md"
            className={styles.shell}
        >
            {/* Header — sits to the right of navbar */}
            <AppShell.Header className={styles.header}>
                <Group h="100%" px="md" justify="space-between">
                    {/* Left: Mobile burger */}
                    <Group gap="sm">
                        {isMobile && (
                            <Burger
                                opened={mobileOpened}
                                onClick={toggleSidebar}
                                size="sm"
                            />
                        )}

                        {isMobile && (
                            <Link to="/painel" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                                <img
                                    src="/logos/logo-sincla-branco.svg"
                                    alt="Sincla"
                                    height={28}
                                    style={{ display: 'block' }}
                                />
                            </Link>
                        )}
                    </Group>

                    {/* Right: Company Selector + Tools Grid + User Menu */}
                    <Group gap="md">
                        {/* Company Selector + External Link */}
                        {!isMobile && (
                            <Group gap="xs">
                                <Select
                                    data={companies.map(c => ({ value: c.id, label: c.name }))}
                                    value={currentCompany?.id}
                                    onChange={handleCompanyChange}
                                    placeholder="Selecione uma empresa"
                                    searchable
                                    nothingFoundMessage="Nenhuma empresa encontrada"
                                    size="sm"
                                    w={220}
                                    rightSection={<IconChevronDown size={14} />}
                                    classNames={{ input: styles.selectInput }}
                                />
                                {companyUrl && (
                                    <Tooltip label={`Abrir ${currentCompany?.name} em nova guia`} withArrow>
                                        <ActionIcon
                                            variant="subtle"
                                            color="gray"
                                            size="lg"
                                            onClick={() => window.open(companyUrl, '_blank')}
                                        >
                                            <IconExternalLink size={18} />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </Group>
                        )}

                        {/* Tools Grid Button */}
                        <Popover
                            opened={toolsOpened}
                            onChange={setToolsOpened}
                            width={320}
                            position="bottom-end"
                            shadow="lg"
                            radius="md"
                        >
                            <Popover.Target>
                                <Tooltip label="Ferramentas Sincla" withArrow>
                                    <UnstyledButton
                                        className={styles.toolsButton}
                                        onClick={() => setToolsOpened(o => !o)}
                                    >
                                        <IconGridDots size={20} />
                                    </UnstyledButton>
                                </Tooltip>
                            </Popover.Target>
                            <Popover.Dropdown className={styles.toolsDropdown}>
                                {activeTools.length > 0 && (
                                    <>
                                        <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="sm">
                                            Suas ferramentas
                                        </Text>
                                        <SimpleGrid cols={3} spacing="xs" mb="md">
                                            {activeTools.map(renderToolItem)}
                                        </SimpleGrid>
                                    </>
                                )}
                                {availableTools.length > 0 && (
                                    <>
                                        {activeTools.length > 0 && <Divider mb="sm" />}
                                        <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="sm">
                                            Conheça mais
                                        </Text>
                                        <SimpleGrid cols={3} spacing="xs">
                                            {availableTools.map(renderToolItem)}
                                        </SimpleGrid>
                                    </>
                                )}
                                {toolProducts.length === 0 && (
                                    <Text size="sm" c="dimmed" ta="center" py="md">
                                        Nenhuma ferramenta disponível
                                    </Text>
                                )}
                            </Popover.Dropdown>
                        </Popover>

                        {/* User Menu */}
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <UnstyledButton className={styles.userButton}>
                                    <Group gap="xs">
                                        <Avatar
                                            src={subscriber?.avatar_url}
                                            radius="xl"
                                            size="sm"
                                            color="#00045c"
                                        >
                                            {subscriber?.name?.charAt(0) || subscriber?.email?.charAt(0)}
                                        </Avatar>
                                        {!isMobile && (
                                            <>
                                                <div style={{ flex: 1 }}>
                                                    <Text size="sm" fw={500} lineClamp={1}>
                                                        {subscriber?.name || 'Usuário'}
                                                    </Text>
                                                </div>
                                                <IconChevronDown size={14} />
                                            </>
                                        )}
                                    </Group>
                                </UnstyledButton>
                            </Menu.Target>

                            <Menu.Dropdown>
                                {isMobile && currentCompany && (
                                    <>
                                        <Menu.Label>Empresa: {currentCompany.name}</Menu.Label>
                                        <Menu.Divider />
                                    </>
                                )}
                                <Menu.Label>Conta</Menu.Label>
                                <Menu.Item
                                    leftSection={<IconSettings style={{ width: rem(14), height: rem(14) }} />}
                                    component={Link}
                                    to="/painel/perfil"
                                >
                                    Meu Perfil
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                    leftSection={<IconShield style={{ width: rem(14), height: rem(14) }} />}
                                    component={Link}
                                    to="/painel/admin"
                                    c="blue"
                                >
                                    Painel Admin
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                    color="red"
                                    leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                                    onClick={handleSignOut}
                                >
                                    Sair
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </AppShell.Header>

            {/* Desktop Sidebar — full height thanks to layout="alt" */}
            {!isMobile && (
                <AppShell.Navbar p="sm" className={styles.navbar}>
                    {sidebarContent}
                </AppShell.Navbar>
            )}

            {/* Mobile Drawer */}
            {isMobile && (
                <Drawer
                    opened={mobileOpened}
                    onClose={() => setMobileOpened(false)}
                    size={280}
                    padding="sm"
                    title={
                        <img
                            src="/logos/logo-sincla.svg"
                            alt="Sincla"
                            height={28}
                        />
                    }
                    classNames={{ body: styles.drawerBody }}
                >
                    <Select
                        data={companies.map(c => ({ value: c.id, label: c.name }))}
                        value={currentCompany?.id}
                        onChange={handleCompanyChange}
                        placeholder="Selecione uma empresa"
                        searchable
                        nothingFoundMessage="Nenhuma empresa encontrada"
                        size="sm"
                        mb="md"
                    />
                    {sidebarContent}
                </Drawer>
            )}

            {/* Main Content */}
            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}
