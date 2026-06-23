import { useState, useEffect } from 'react';
import { Group, Button, Container, Burger, Drawer, Stack, Text, Box, SimpleGrid, ThemeIcon, TextInput, Avatar, Menu, ActionIcon, Indicator } from '@mantine/core';
import { useDisclosure, useClickOutside } from '@mantine/hooks';
import {
    IconChevronDown,
    IconRocket,
    IconHeadset,
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
    { logo: '/logos/sincla-rh.svg', name: 'Sincla RH', description: 'Gestão de pessoas completa', color: '#0066CC', href: '/rh' },
    { logo: '/logos/sincla-recrutamento.svg', name: 'Sincla Recrutamento', description: 'Atração e seleção de talentos', color: '#8B5CF6', href: '/recrutamento' },
    { logo: '/logos/sincla-ead.svg', name: 'Sincla EAD', description: 'Treinamentos e cursos', color: '#FF6600', href: '/ead' },
];

type MenuKey = 'produtos' | null;

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

                        {/* Como Funciona */}
                        <Box className={classes.navItem} onMouseEnter={handleMenuLeave}>
                            <a href="/#como-funciona" className={classes.navLink}>
                                Como Funciona
                            </a>
                        </Box>

                        {/* Suporte */}
                        <Box className={classes.navItem} onMouseEnter={handleMenuLeave}>
                            <a href="/#suporte" className={classes.navLink}>
                                Suporte & FAQ
                            </a>
                        </Box>

                        {/* Contato */}
                        <Box className={classes.navItem} onMouseEnter={handleMenuLeave}>
                            <a href="/#suporte" className={classes.navLink}>
                                Contato
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
                                    component="a"
                                    href="https://app.sincla.com.br/login"
                                    variant="subtle"
                                    color="gray"
                                    className={classes.loginBtn}
                                >
                                    Entrar
                                </Button>
                                <Button
                                    component="a"
                                    href="https://app.sincla.com.br/cadastro"
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
                                                </Group>
                                                <Text size="sm" className={classes.productDesc}>{product.description}</Text>
                                            </Box>
                                        </a>
                                    ))}
                                </SimpleGrid>

                                <Box className={classes.menuFooter}>
                                    <a href="/#produtos" className={classes.menuFooterLink}>
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
                                        component="a"
                                        href="https://app.sincla.com.br"
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
                    body: { background: '#f0f4f8' },
                    header: { background: '#f0f4f8' },
                }}
            >
                <Stack gap="lg" mt="md">
                    <Button
                        component="a"
                        href="https://app.sincla.com.br/cadastro"
                        variant="gradient"
                        gradient={{ from: '#0087ff', to: '#00c6ff', deg: 135 }}
                        fullWidth
                        size="lg"
                        radius="xl"
                        onClick={close}
                    >
                        Criar minha conta
                    </Button>
                    <Button
                        component="a"
                        href="https://app.sincla.com.br/login"
                        variant="outline"
                        color="dark"
                        fullWidth
                        size="md"
                        radius="xl"
                        onClick={close}
                    >
                        Já tenho conta — Entrar
                    </Button>

                    <Text className={classes.mobileMenuLabel} mt="xl">Produtos</Text>
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
                    <a href="/#como-funciona" className={classes.mobileNavLink} onClick={close}>
                        <IconRocket size={20} />
                        Como Funciona
                    </a>
                    <a href="/#suporte" className={classes.mobileNavLink} onClick={close}>
                        <IconHeadset size={20} />
                        Suporte & FAQ
                    </a>
                </Stack>
            </Drawer>
        </header>
    );
}
