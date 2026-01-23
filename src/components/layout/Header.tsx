import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Group, Button, Container, Burger, Drawer, Stack, Text, Box, SimpleGrid, ThemeIcon, TextInput, Avatar, Menu, ActionIcon, Indicator } from '@mantine/core';
import { useDisclosure, useClickOutside } from '@mantine/hooks';
import {
    IconChevronDown,
    IconUsers,
    IconBuilding,
    IconRocket,
    IconTargetArrow,
    IconHeadset,
    IconBook,
    IconCertificate,
    IconNews,
    IconShieldCheck,
    IconTrendingUp,
    IconPuzzle,
    IconCloud,
    IconLock,
    IconArrowRight,
    IconSearch,
    IconGridDots,
    IconBell,
    IconUser,
    IconSettings,
    IconLogout,
    IconX,
} from '@tabler/icons-react';
import classes from './Header.module.css';

// Dados dos Produtos com logos SVG
const products = [
    { logo: '/logos/sincla-rh.svg', name: 'Sincla RH', description: 'Gestão de pessoas completa', color: '#0066CC', href: '#' },
    { logo: '/logos/sincla-ead.svg', name: 'Sincla EAD', description: 'Treinamentos e cursos', color: '#FF6600', href: '#' },
    { logo: '/logos/sincla-bolso.svg', name: 'Sincla Bolso', description: 'Finanças pessoais', color: '#10b981', href: '#' },
    { logo: '/logos/sincla-leads.svg', name: 'Sincla Leads', description: 'Captação de clientes', color: '#DC2626', href: '#' },
    { logo: '/logos/sincla-agenda.svg', name: 'Sincla Agenda', description: 'Agendamentos inteligentes', color: '#f59e0b', href: '#' },
    { logo: '/logos/sincla-intranet.svg', name: 'Sincla Intranet', description: 'Comunicação interna', color: '#ef4444', href: '#', comingSoon: true },
];

// Dados das Soluções
const solutionsByUseCase = [
    { label: 'Gestão de equipes', href: '#' },
    { label: 'Treinamento corporativo', href: '#' },
    { label: 'Captação de leads', href: '#' },
    { label: 'Controle financeiro', href: '#' },
];

const solutionsByTeam = [
    { label: 'RH e Gestão de Pessoas', href: '#' },
    { label: 'Marketing e Vendas', href: '#' },
    { label: 'Financeiro', href: '#' },
    { label: 'TI e Operações', href: '#' },
];

const solutionsBySize = [
    { label: 'Startups', href: '#' },
    { label: 'PMEs', href: '#' },
    { label: 'Empresas', href: '#' },
    { label: 'Autônomos', href: '#' },
];

// Dados do Por que Sincla
const whySinclaItems = [
    { icon: IconPuzzle, title: 'Ecossistema Unificado', description: 'Um cadastro, acesso a tudo', href: '#' },
    { icon: IconCloud, title: 'Na Nuvem', description: 'Acesse de qualquer lugar', href: '#' },
    { icon: IconLock, title: 'Segurança', description: 'Seus dados protegidos', href: '#' },
    { icon: IconTrendingUp, title: 'Escalável', description: 'Cresce com sua empresa', href: '#' },
];

// Dados dos Recursos
const supportItems = [
    { label: 'Central de Ajuda', href: '#suporte' },
    { label: 'Suporte Técnico', href: '#' },
    { label: 'Fale com Consultor', href: '#' },
    { label: 'Status do Sistema', href: '#' },
];

const resourceItems = [
    { label: 'Blog', href: '#' },
    { label: 'Documentação', href: '#' },
    { label: 'Webinars', href: '#' },
    { label: 'Cases de Sucesso', href: '#' },
];

const communityItems = [
    { label: 'Programa de Parceiros', href: '#parceiros' },
    { label: 'Comunidade', href: '#' },
    { label: 'Certificações', href: '#' },
    { label: 'Eventos', href: '#' },
];

type MenuKey = 'produtos' | 'solucoes' | 'porque' | 'recursos' | null;

// Simulação de estado de autenticação (em produção viria de um contexto/store)
interface User {
    name: string;
    email: string;
    avatar?: string;
    initials: string;
}

export function Header() {
    const [opened, { toggle, close }] = useDisclosure(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [appsMenuOpen, setAppsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Simulação: mudar para null para ver estado deslogado, ou objeto para logado
    const [user] = useState<User | null>(null);
    // Exemplo de usuário logado:
    // const [user] = useState<User | null>({ name: 'Henrique Santos', email: 'henrique.santos@email.com', initials: 'HS' });

    const searchRef = useClickOutside(() => setSearchOpen(false));
    const appsRef = useClickOutside(() => setAppsMenuOpen(false));

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleMenuEnter = (menu: MenuKey) => {
        setActiveMenu(menu);
    };

    const handleMenuLeave = () => {
        setActiveMenu(null);
    };

    const handleSearchToggle = () => {
        setSearchOpen(!searchOpen);
        setAppsMenuOpen(false);
    };

    const handleAppsToggle = () => {
        setAppsMenuOpen(!appsMenuOpen);
        setSearchOpen(false);
    };

    return (
        <header
            className={`${classes.header} ${scrolled ? classes.scrolled : ''} ${activeMenu ? classes.menuOpen : ''}`}
            onMouseLeave={handleMenuLeave}
        >
            <Container size="xl">
                <Group justify="space-between" h="100%">
                    {/* Logo */}
                    <a href="/" className={classes.logo}>
                        <img
                            src="/logos/sincla.svg"
                            alt="Sincla"
                            height={36}
                            style={{ display: 'block' }}
                        />
                    </a>

                    {/* Desktop Navigation */}
                    <Group gap={0} visibleFrom="md">
                        {/* Produtos */}
                        <Box
                            className={`${classes.navItem} ${activeMenu === 'produtos' ? classes.active : ''}`}
                            onMouseEnter={() => handleMenuEnter('produtos')}
                        >
                            <span className={classes.navLink}>
                                Produtos
                                <IconChevronDown size={14} className={classes.chevron} />
                            </span>
                        </Box>

                        {/* Soluções */}
                        <Box
                            className={`${classes.navItem} ${activeMenu === 'solucoes' ? classes.active : ''}`}
                            onMouseEnter={() => handleMenuEnter('solucoes')}
                        >
                            <span className={classes.navLink}>
                                Soluções
                                <IconChevronDown size={14} className={classes.chevron} />
                            </span>
                        </Box>

                        {/* Por que Sincla */}
                        <Box
                            className={`${classes.navItem} ${activeMenu === 'porque' ? classes.active : ''}`}
                            onMouseEnter={() => handleMenuEnter('porque')}
                        >
                            <span className={classes.navLink}>
                                Por que Sincla?
                                <IconChevronDown size={14} className={classes.chevron} />
                            </span>
                        </Box>

                        {/* +Mais (Recursos) */}
                        <Box
                            className={`${classes.navItem} ${activeMenu === 'recursos' ? classes.active : ''}`}
                            onMouseEnter={() => handleMenuEnter('recursos')}
                        >
                            <span className={classes.navLink}>
                                +Mais
                                <IconChevronDown size={14} className={classes.chevron} />
                            </span>
                        </Box>

                        {/* Empresas - link direto (último) */}
                        <Box className={classes.navItem} onMouseEnter={handleMenuLeave}>
                            <a href="#empresas" className={classes.navLink}>
                                Empresas
                            </a>
                        </Box>
                    </Group>

                    {/* Header Actions: Search, Apps, Notifications, Profile */}
                    <Group gap="xs" visibleFrom="md">
                        {/* Search */}
                        <Box className={classes.searchWrapper} ref={searchRef}>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="lg"
                                onClick={handleSearchToggle}
                                className={classes.actionIcon}
                            >
                                <IconSearch size={20} />
                            </ActionIcon>
                            {searchOpen && (
                                <Box className={classes.searchDropdown}>
                                    <TextInput
                                        placeholder="Palavras-chave de pesquisa"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                        classNames={{
                                            input: classes.searchInput,
                                        }}
                                        rightSection={
                                            searchQuery ? (
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="gray"
                                                    size="sm"
                                                    onClick={() => setSearchQuery('')}
                                                >
                                                    <IconX size={14} />
                                                </ActionIcon>
                                            ) : (
                                                <IconSearch size={16} color="rgba(255,255,255,0.4)" />
                                            )
                                        }
                                    />
                                </Box>
                            )}
                        </Box>

                        {/* Apps Grid */}
                        <Box className={classes.appsWrapper} ref={appsRef}>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="lg"
                                onClick={handleAppsToggle}
                                className={classes.actionIcon}
                            >
                                <IconGridDots size={20} />
                            </ActionIcon>
                            {appsMenuOpen && (
                                <Box className={classes.appsDropdown}>
                                    <Stack gap="md">
                                        {products.map((product) => (
                                            <a
                                                key={product.name}
                                                href={product.href}
                                                className={classes.appItem}
                                                onClick={() => setAppsMenuOpen(false)}
                                            >
                                                <Box
                                                    style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 8,
                                                        background: product.color,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <img
                                                        src={product.logo}
                                                        alt={product.name}
                                                        style={{
                                                            width: 18,
                                                            height: 18,
                                                            objectFit: 'contain',
                                                            filter: 'brightness(0) invert(1)',
                                                        }}
                                                    />
                                                </Box>
                                                <Text size="sm" fw={500} className={classes.appName}>
                                                    {product.name}
                                                </Text>
                                            </a>
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                        </Box>

                        {/* Notifications - só aparece se logado */}
                        {user && (
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="lg"
                                className={classes.actionIcon}
                            >
                                <Indicator color="red" size={8} offset={2}>
                                    <IconBell size={20} />
                                </Indicator>
                            </ActionIcon>
                        )}

                        {/* User Profile / Login */}
                        {user ? (
                            <Menu shadow="lg" width={220} position="bottom-end">
                                <Menu.Target>
                                    <Group gap="xs" className={classes.userProfile}>
                                        <Avatar
                                            src={user.avatar}
                                            size={32}
                                            radius="xl"
                                            color="blue"
                                        >
                                            {user.initials}
                                        </Avatar>
                                        <Text size="sm" fw={500} className={classes.userName}>
                                            {user.name}
                                        </Text>
                                    </Group>
                                </Menu.Target>
                                <Menu.Dropdown className={classes.userDropdown}>
                                    <Box className={classes.userDropdownHeader}>
                                        <Text size="xs" tt="uppercase" className={classes.userEmail}>
                                            {user.email}
                                        </Text>
                                        <a href="#" className={classes.switchAccount}>
                                            Trocar de conta
                                        </a>
                                    </Box>
                                    <Menu.Divider />
                                    <Menu.Item leftSection={<IconUser size={16} />}>
                                        Perfil
                                    </Menu.Item>
                                    <Menu.Item leftSection={<IconSettings size={16} />}>
                                        Licenças
                                    </Menu.Item>
                                    <Menu.Divider />
                                    <Menu.Item
                                        leftSection={<IconLogout size={16} />}
                                        color="red"
                                    >
                                        Sair
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        ) : (
                            <Group gap="sm">
                                <Button
                                    component={Link}
                                    to="/login"
                                    variant="subtle"
                                    color="gray"
                                    className={classes.loginBtn}
                                >
                                    Entrar
                                </Button>
                                <Button
                                    component={Link}
                                    to="/cadastro"
                                    variant="gradient"
                                    gradient={{ from: '#0087ff', to: '#00c6ff', deg: 135 }}
                                    className={classes.ctaBtn}
                                >
                                    Inscrever-se
                                </Button>
                            </Group>
                        )}
                    </Group>

                    {/* Mobile Burger */}
                    <Burger opened={opened} onClick={toggle} hiddenFrom="md" color="white" />
                </Group>
            </Container>

            {/* Mega Menus */}
            <Box className={`${classes.megaMenuWrapper} ${activeMenu ? classes.visible : ''}`}>
                <Container size="xl">
                    {/* Menu Produtos */}
                    {activeMenu === 'produtos' && (
                        <Box className={classes.megaMenu}>
                            <Box className={classes.megaMenuContent}>
                                <Text className={classes.menuLabel}>PLATAFORMAS SINCLA</Text>
                                <SimpleGrid cols={2} spacing="md" mt="md">
                                    {products.map((product) => (
                                        <a key={product.name} href={product.href} className={classes.productCard}>
                                            <Box
                                                className={classes.productIcon}
                                                style={{
                                                    background: product.color,
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: 10,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <img
                                                    src={product.logo}
                                                    alt={product.name}
                                                    style={{
                                                        width: 24,
                                                        height: 24,
                                                        objectFit: 'contain',
                                                        filter: 'brightness(0) invert(1)',
                                                    }}
                                                />
                                            </Box>
                                            <Box>
                                                <Group gap="xs">
                                                    <Text fw={600} className={classes.productName}>{product.name}</Text>
                                                    {product.comingSoon && (
                                                        <span className={classes.comingSoonTag}>Em breve</span>
                                                    )}
                                                </Group>
                                                <Text size="sm" className={classes.productDesc}>{product.description}</Text>
                                            </Box>
                                        </a>
                                    ))}
                                </SimpleGrid>

                                <Box className={classes.menuFooter}>
                                    <a href="#produtos" className={classes.menuFooterLink}>
                                        <IconArrowRight size={16} />
                                        Ver todos os produtos
                                    </a>
                                </Box>
                            </Box>

                            <Box className={classes.megaMenuSidebar}>
                                <Text className={classes.menuLabel}>DESTAQUE</Text>
                                <Box className={classes.highlightCard}>
                                    <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: '#0087ff', to: '#00c6ff' }}>
                                        <IconRocket size={20} />
                                    </ThemeIcon>
                                    <Text fw={600} mt="sm" className={classes.highlightTitle}>Sincla Hub</Text>
                                    <Text size="sm" className={classes.highlightDesc}>
                                        Cadastre uma vez, use em todo lugar. Um ecossistema completo para sua empresa.
                                    </Text>
                                    <Button
                                        variant="light"
                                        color="blue"
                                        size="sm"
                                        mt="md"
                                        rightSection={<IconArrowRight size={14} />}
                                    >
                                        Conhecer o Hub
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* Menu Soluções */}
                    {activeMenu === 'solucoes' && (
                        <Box className={classes.megaMenu}>
                            <Box className={classes.solutionsGrid}>
                                <Box>
                                    <Text className={classes.menuLabel}>POR CASO DE USO</Text>
                                    <Stack gap="xs" mt="md">
                                        {solutionsByUseCase.map((item) => (
                                            <a key={item.label} href={item.href} className={classes.solutionLink}>
                                                {item.label}
                                            </a>
                                        ))}
                                    </Stack>
                                </Box>

                                <Box>
                                    <Text className={classes.menuLabel}>POR EQUIPE</Text>
                                    <Stack gap="xs" mt="md">
                                        {solutionsByTeam.map((item) => (
                                            <a key={item.label} href={item.href} className={classes.solutionLink}>
                                                {item.label}
                                            </a>
                                        ))}
                                    </Stack>
                                </Box>

                                <Box>
                                    <Text className={classes.menuLabel}>POR TAMANHO</Text>
                                    <Stack gap="xs" mt="md">
                                        {solutionsBySize.map((item) => (
                                            <a key={item.label} href={item.href} className={classes.solutionLink}>
                                                {item.label}
                                            </a>
                                        ))}
                                    </Stack>
                                </Box>
                            </Box>

                            <Box className={classes.megaMenuSidebar}>
                                <Text className={classes.menuLabel}>IA INTEGRADA</Text>
                                <Box className={classes.highlightCard}>
                                    <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: '#8b5cf6', to: '#a78bfa' }}>
                                        <IconTargetArrow size={20} />
                                    </ThemeIcon>
                                    <Text fw={600} mt="sm" className={classes.highlightTitle}>Sincla AI</Text>
                                    <Text size="sm" className={classes.highlightDesc}>
                                        Inteligência artificial em todas as plataformas para automatizar tarefas.
                                    </Text>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* Menu Por que Sincla */}
                    {activeMenu === 'porque' && (
                        <Box className={classes.megaMenu}>
                            <Box className={classes.whySinclaGrid}>
                                {whySinclaItems.map((item) => (
                                    <a key={item.title} href={item.href} className={classes.whyCard}>
                                        <ThemeIcon
                                            size={48}
                                            radius="md"
                                            variant="light"
                                            color="blue"
                                            className={classes.whyIcon}
                                        >
                                            <item.icon size={24} stroke={1.5} />
                                        </ThemeIcon>
                                        <Text fw={600} mt="sm" className={classes.whyTitle}>{item.title}</Text>
                                        <Text size="sm" className={classes.whyDesc}>{item.description}</Text>
                                    </a>
                                ))}
                            </Box>

                            <Box className={classes.megaMenuSidebar}>
                                <Text className={classes.menuLabel}>CONFIANÇA</Text>
                                <Box className={classes.highlightCard}>
                                    <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: '#10b981', to: '#34d399' }}>
                                        <IconShieldCheck size={20} />
                                    </ThemeIcon>
                                    <Text fw={600} mt="sm" className={classes.highlightTitle}>+500 Empresas</Text>
                                    <Text size="sm" className={classes.highlightDesc}>
                                        Confiam no ecossistema Sincla para gerenciar seus negócios.
                                    </Text>
                                    <Button
                                        variant="light"
                                        color="teal"
                                        size="sm"
                                        mt="md"
                                        rightSection={<IconArrowRight size={14} />}
                                    >
                                        Ver cases
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* Menu Recursos */}
                    {activeMenu === 'recursos' && (
                        <Box className={classes.megaMenu}>
                            <Box className={classes.resourcesGrid}>
                                <Box>
                                    <Group gap="xs" mb="md">
                                        <IconHeadset size={18} color="#0087ff" />
                                        <Text className={classes.menuLabel}>SUPORTE</Text>
                                    </Group>
                                    <Stack gap="xs">
                                        {supportItems.map((item) => (
                                            <a key={item.label} href={item.href} className={classes.resourceLink}>
                                                {item.label}
                                            </a>
                                        ))}
                                    </Stack>
                                </Box>

                                <Box>
                                    <Group gap="xs" mb="md">
                                        <IconBook size={18} color="#0087ff" />
                                        <Text className={classes.menuLabel}>APRENDER</Text>
                                    </Group>
                                    <Stack gap="xs">
                                        {resourceItems.map((item) => (
                                            <a key={item.label} href={item.href} className={classes.resourceLink}>
                                                {item.label}
                                            </a>
                                        ))}
                                    </Stack>
                                </Box>

                                <Box>
                                    <Group gap="xs" mb="md">
                                        <IconUsers size={18} color="#0087ff" />
                                        <Text className={classes.menuLabel}>COMUNIDADE</Text>
                                    </Group>
                                    <Stack gap="xs">
                                        {communityItems.map((item) => (
                                            <a key={item.label} href={item.href} className={classes.resourceLink}>
                                                {item.label}
                                            </a>
                                        ))}
                                    </Stack>
                                </Box>
                            </Box>

                            <Box className={classes.megaMenuSidebar}>
                                <Text className={classes.menuLabel}>NOVIDADES</Text>
                                <Box className={classes.highlightCard}>
                                    <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: '#f59e0b', to: '#fbbf24' }}>
                                        <IconNews size={20} />
                                    </ThemeIcon>
                                    <Text fw={600} mt="sm" className={classes.highlightTitle}>Blog Sincla</Text>
                                    <Text size="sm" className={classes.highlightDesc}>
                                        Dicas, novidades e tendências para gestão de negócios.
                                    </Text>
                                    <Button
                                        variant="light"
                                        color="orange"
                                        size="sm"
                                        mt="md"
                                        rightSection={<IconArrowRight size={14} />}
                                    >
                                        Ler artigos
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Container>
            </Box>

            {/* Mobile Drawer */}
            <Drawer
                opened={opened}
                onClose={close}
                size="100%"
                padding="md"
                title={
                    <img
                        src="/logos/sincla.svg"
                        alt="Sincla"
                        height={28}
                    />
                }
                styles={{
                    body: { background: '#0a0a0f' },
                    header: { background: '#0a0a0f' },
                }}
            >
                <Stack gap="lg" mt="xl">
                    <Text className={classes.mobileMenuLabel}>Produtos</Text>
                    {products.map((product) => (
                        <a
                            key={product.name}
                            href={product.href}
                            className={classes.mobileNavLink}
                            onClick={close}
                        >
                            <Box
                                style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    background: product.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <img
                                    src={product.logo}
                                    alt={product.name}
                                    style={{
                                        width: 14,
                                        height: 14,
                                        objectFit: 'contain',
                                        filter: 'brightness(0) invert(1)',
                                    }}
                                />
                            </Box>
                            {product.name}
                        </a>
                    ))}

                    <Text className={classes.mobileMenuLabel} mt="md">Navegação</Text>
                    <a href="#empresas" className={classes.mobileNavLink} onClick={close}>
                        <IconBuilding size={20} />
                        Empresas
                    </a>
                    <a href="#parceiros" className={classes.mobileNavLink} onClick={close}>
                        <IconCertificate size={20} />
                        Parceiros
                    </a>
                    <a href="#suporte" className={classes.mobileNavLink} onClick={close}>
                        <IconHeadset size={20} />
                        Suporte
                    </a>

                    <Button
                        component={Link}
                        to="/login"
                        variant="subtle"
                        color="gray"
                        fullWidth
                        mt="xl"
                        onClick={close}
                    >
                        Entrar
                    </Button>
                    <Button
                        component={Link}
                        to="/cadastro"
                        variant="gradient"
                        gradient={{ from: '#0087ff', to: '#00c6ff', deg: 135 }}
                        fullWidth
                        onClick={close}
                    >
                        Inscrever-se
                    </Button>
                </Stack>
            </Drawer>
        </header>
    );
}
