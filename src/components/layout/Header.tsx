import { useState, useEffect } from 'react';
import { Group, Button, Container, Burger, Drawer, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from './Header.module.css';

const navLinks = [
    { label: 'Produtos', href: '#produtos' },
    { label: 'Empresas', href: '#empresas' },
    { label: 'Parceiros', href: '#parceiros' },
    { label: 'Suporte', href: '#suporte' },
];

export function Header() {
    const [opened, { toggle, close }] = useDisclosure(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`${classes.header} ${scrolled ? classes.scrolled : ''}`}>
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
                    <Group gap="xl" visibleFrom="sm">
                        {navLinks.map((link) => (
                            <a key={link.label} href={link.href} className={classes.navLink}>
                                {link.label}
                            </a>
                        ))}
                    </Group>

                    {/* CTA Buttons */}
                    <Group gap="sm" visibleFrom="sm">
                        <Button variant="subtle" color="gray" className={classes.loginBtn}>
                            Entrar
                        </Button>
                        <Button
                            variant="gradient"
                            gradient={{ from: '#0087ff', to: '#00c6ff', deg: 90 }}
                            className={classes.ctaBtn}
                        >
                            Começar Grátis
                        </Button>
                    </Group>

                    {/* Mobile Burger */}
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" color="white" />
                </Group>
            </Container>

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
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className={classes.mobileNavLink}
                            onClick={close}
                        >
                            {link.label}
                        </a>
                    ))}
                    <Button variant="subtle" color="gray" fullWidth mt="md">
                        Entrar
                    </Button>
                    <Button
                        variant="gradient"
                        gradient={{ from: '#0087ff', to: '#00c6ff', deg: 90 }}
                        fullWidth
                    >
                        Começar Grátis
                    </Button>
                </Stack>
            </Drawer>
        </header>
    );
}

