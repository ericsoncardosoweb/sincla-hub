import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import {
    AppShell,
    Group,
    Text,
    UnstyledButton,
    Stack,
    Avatar,
    Menu,
    Badge,
    Tooltip,
    Burger,
    Drawer,
    rem,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
    IconLayoutDashboard,
    IconPackage,
    IconUsers,
    IconCreditCard,
    IconSettings,
    IconLogout,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconShield,
    IconHeartHandshake,
    IconShieldCheck,
    IconServer,
    IconFileText,
    IconTags,
} from '@tabler/icons-react';
import { useAuth } from '../../shared/contexts';
import styles from '../../components/dashboard/DashboardLayout.module.css';

interface NavItem {
    icon: typeof IconLayoutDashboard;
    label: string;
    path: string;
}

const navItems: NavItem[] = [
    { icon: IconLayoutDashboard, label: 'Dashboard', path: '/painel/admin' },
    { icon: IconPackage, label: 'Produtos', path: '/painel/admin/produtos' },
    { icon: IconTags, label: 'Planos', path: '/painel/admin/planos' },
    { icon: IconUsers, label: 'Assinantes', path: '/painel/admin/assinantes' },
    { icon: IconCreditCard, label: 'Assinaturas', path: '/painel/admin/assinaturas' },
    { icon: IconHeartHandshake, label: 'Parceiros', path: '/painel/admin/parceiros' },
    { icon: IconShieldCheck, label: 'Admins', path: '/painel/admin/admins' },
    { icon: IconServer, label: 'Infraestrutura', path: '/painel/admin/infraestrutura' },
    { icon: IconFileText, label: 'Políticas e Termos', path: '/painel/admin/paginas-legais' },
    { icon: IconSettings, label: 'Configurações', path: '/painel/admin/configuracoes' },
];

export function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { subscriber, isAdmin, loading, signOut } = useAuth();

    // Responsive breakpoints
    const isCompact = useMediaQuery('(max-width: 1439px)');
    const isMobile = useMediaQuery('(max-width: 1023px)');

    // Sidebar state
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpened, setMobileOpened] = useState(false);

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

    // Admin Route Protection Guard
    useEffect(() => {
        if (!loading && !isAdmin) {
            navigate('/painel', { replace: true });
        }
    }, [isAdmin, loading, navigate]);

    // Prevent render while checking admin status
    if (loading || !isAdmin) {
        return null; // Or a loader if preferred
    }

    const toggleSidebar = useCallback(() => {
        if (isMobile) {
            setMobileOpened(prev => !prev);
        } else {
            setCollapsed(prev => !prev);
        }
    }, [isMobile]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const handleNavClick = (path: string) => {
        navigate(path);
        if (isMobile) setMobileOpened(false);
    };

    const sidebarWidth = collapsed ? 70 : 260;

    // Sidebar content (reusable for both desktop and mobile drawer)
    const sidebarContent = (
        <>
            <Stack gap={4} className={styles.navList}>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/painel/admin' && location.pathname.startsWith(item.path));
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
                                <Text size="sm" className={styles.navLabel}>{item.label}</Text>
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
        </>
    );

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={isMobile ? undefined : {
                width: sidebarWidth,
                breakpoint: 'sm',
            }}
            padding="md"
            className={styles.shell}
        >
            {/* Header */}
            <AppShell.Header className={styles.header}>
                <Group h="100%" px="md" justify="space-between">
                    {/* Left: Toggle + Logo */}
                    <Group gap="sm">
                        {isMobile ? (
                            <Burger
                                opened={mobileOpened}
                                onClick={toggleSidebar}
                                size="sm"
                                color="var(--mantine-color-dark-7)"
                            />
                        ) : (
                            <UnstyledButton
                                onClick={toggleSidebar}
                                className={styles.toggleButton}
                                aria-label={collapsed ? 'Expandir menu' : 'Comprimir menu'}
                            >
                                {collapsed ? (
                                    <IconChevronRight size={18} />
                                ) : (
                                    <IconChevronLeft size={18} />
                                )}
                            </UnstyledButton>
                        )}

                        <Group gap="xs">
                            <IconShield size={24} color="#098eee" />
                            <Text size="lg" fw={700} c="dark">
                                Admin Master
                            </Text>
                            <Badge color="blue" variant="light" size="sm">
                                ADMIN
                            </Badge>
                        </Group>
                    </Group>

                    {/* Right: User Menu */}
                    <Group gap="md">
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <UnstyledButton className={styles.userButton}>
                                    <Group gap="xs">
                                        <Avatar
                                            src={subscriber?.avatar_url}
                                            radius="xl"
                                            size="sm"
                                            color="blue"
                                        >
                                            {subscriber?.name?.charAt(0) || subscriber?.email?.charAt(0)}
                                        </Avatar>
                                        {!isMobile && (
                                            <>
                                                <div style={{ flex: 1 }}>
                                                    <Text size="sm" fw={500} lineClamp={1}>
                                                        {subscriber?.name || 'Admin'}
                                                    </Text>
                                                </div>
                                                <IconChevronDown size={14} />
                                            </>
                                        )}
                                    </Group>
                                </UnstyledButton>
                            </Menu.Target>

                            <Menu.Dropdown>
                                <Menu.Label>Navegação</Menu.Label>
                                <Menu.Item
                                    leftSection={<IconLayoutDashboard style={{ width: rem(14), height: rem(14) }} />}
                                    component={Link}
                                    to="/painel"
                                >
                                    Ir para Hub
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

            {/* Desktop Sidebar */}
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
                        <Group gap="xs">
                            <IconShield size={24} color="#098eee" />
                            <Text size="lg" fw={700}>Admin Master</Text>
                        </Group>
                    }
                    classNames={{ body: styles.drawerBody }}
                >
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
