import { Link } from 'react-router-dom';
import { Container, Group, Text, Stack, Anchor, SimpleGrid, Select } from '@mantine/core';
import { IconWorld, IconBrandFacebook, IconBrandX, IconBrandLinkedin, IconBrandYoutube, IconBrandInstagram } from '@tabler/icons-react';
import classes from './Footer.module.css';

// Descrição institucional
const institutionalDesc = 'Ecossistema completo de gestão de pessoas, recrutamento inteligente e treinamento integrado para equipes de alto desempenho.';

// Links de produtos
const produtosLinks = [
    { label: 'Sincla RH', to: '/rh' },
    { label: 'Sincla Recrutamento', to: '/recrutamento' },
    { label: 'Sincla EAD', to: '/ead' },
];

// Links do rodapé inferior (legal)
const legalLinks = [
    { label: 'Política de privacidade', href: '/politicas-de-privacidade' },
    { label: 'Termos de uso', href: '/termos-de-uso' },
    { label: 'Suporte LGPD', href: '/suporte-lgpd' },
];

// Redes sociais
const socialLinks = [
    { icon: IconBrandFacebook, href: '#', label: 'Facebook' },
    { icon: IconBrandX, href: '#', label: 'X (Twitter)' },
    { icon: IconBrandLinkedin, href: '#', label: 'LinkedIn' },
    { icon: IconBrandYoutube, href: '#', label: 'YouTube' },
    { icon: IconBrandInstagram, href: '#', label: 'Instagram' },
];

export function Footer() {
    return (
        <footer className={classes.footer}>
            <Container size="xl">
                {/* Main Footer Content */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={{ base: 'xl', md: 120 }} mb={48}>
                    {/* Coluna 1: Logo + Descrição */}
                    <Stack gap="md" style={{ maxWidth: '450px' }}>
                        <Link to="/" className={classes.logoLink}>
                            <img
                                src="/logos/sincla.svg"
                                alt="Sincla"
                                height={28}
                                style={{ display: 'block' }}
                            />
                        </Link>
                        <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }} mt="xs">
                            {institutionalDesc}
                        </Text>
                    </Stack>

                    {/* Coluna 2: Produtos */}
                    <Stack gap="md">
                        <Text className={classes.columnTitle}>PRODUTOS</Text>
                        <Stack gap="xs">
                            {produtosLinks.map((link) => (
                                <Anchor key={link.label} component={Link} to={link.to} className={classes.link}>
                                    {link.label}
                                </Anchor>
                            ))}
                        </Stack>
                    </Stack>
                </SimpleGrid>

                {/* Bottom Bar */}
                <div className={classes.bottomBar}>
                    <Group justify="space-between" wrap="wrap" gap="md">
                        {/* Copyright */}
                        <Text size="sm" className={classes.copyright}>
                            Copyright © {new Date().getFullYear()} Sincla
                        </Text>

                        {/* Legal Links */}
                        <Group gap="lg" wrap="wrap" className={classes.legalLinks}>
                            {legalLinks.map((link) => (
                                <Anchor key={link.label} component={Link} to={link.href} className={classes.legalLink}>
                                    {link.label}
                                </Anchor>
                            ))}
                        </Group>

                        {/* Language Selector */}
                        <Group gap="xs" className={classes.languageSelector}>
                            <IconWorld size={16} className={classes.languageIcon} />
                            <Select
                                data={[
                                    { value: 'pt-BR', label: 'Português' },
                                    { value: 'en', label: 'English' },
                                    { value: 'es', label: 'Español' },
                                ]}
                                defaultValue="pt-BR"
                                variant="unstyled"
                                size="sm"
                                classNames={{
                                    input: classes.languageInput,
                                    dropdown: classes.languageDropdown,
                                }}
                                rightSection={null}
                                comboboxProps={{ withinPortal: false }}
                            />
                        </Group>

                        {/* Social Media Icons */}
                        <Group gap="sm" className={classes.socialLinks}>
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    className={classes.socialIcon}
                                    aria-label={social.label}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <social.icon size={22} />
                                </a>
                            ))}
                        </Group>
                    </Group>
                </div>
            </Container>
        </footer>
    );
}
