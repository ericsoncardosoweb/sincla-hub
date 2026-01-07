import { Container, Group, Text, Stack, Anchor, Divider, SimpleGrid } from '@mantine/core';
import { IconBrandLinkedin, IconBrandInstagram, IconBrandYoutube, IconBrandWhatsapp } from '@tabler/icons-react';
import classes from './Footer.module.css';

const footerLinks = {
    produtos: [
        { label: 'Sincla RH', href: '#' },
        { label: 'Sincla EAD', href: '#' },
        { label: 'Sincla Bolso', href: '#' },
        { label: 'Sincla Leads', href: '#' },
        { label: 'Sincla Agenda', href: '#' },
    ],
    empresa: [
        { label: 'Sobre nós', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Carreiras', href: '#' },
        { label: 'Parceiros', href: '#parceiros' },
        { label: 'Imprensa', href: '#' },
    ],
    suporte: [
        { label: 'Central de Ajuda', href: '#suporte' },
        { label: 'Documentação', href: '#' },
        { label: 'Status do Sistema', href: '#' },
        { label: 'Fale Conosco', href: '#' },
    ],
    legal: [
        { label: 'Termos de Uso', href: '#' },
        { label: 'Privacidade', href: '#' },
        { label: 'Cookies', href: '#' },
        { label: 'LGPD', href: '#' },
    ],
};

const socialLinks = [
    { icon: IconBrandLinkedin, href: '#', label: 'LinkedIn' },
    { icon: IconBrandInstagram, href: '#', label: 'Instagram' },
    { icon: IconBrandYoutube, href: '#', label: 'YouTube' },
    { icon: IconBrandWhatsapp, href: '#', label: 'WhatsApp' },
];

export function Footer() {
    return (
        <footer className={classes.footer}>
            <Container size="xl">
                {/* Main Footer Content */}
                <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="xl" mb={60}>
                    {/* Logo & Description */}
                    <Stack gap="md" className={classes.brandSection}>
                        <a href="/">
                            <img
                                src="/logos/sincla.svg"
                                alt="Sincla"
                                height={32}
                                style={{ display: 'block' }}
                            />
                        </a>
                        <Text size="sm" c="dimmed" maw={200}>
                            Hub de tecnologias para transformar pessoas e negócios.
                        </Text>
                        <Group gap="sm" mt="xs">
                            {socialLinks.map((social) => (
                                <Anchor
                                    key={social.label}
                                    href={social.href}
                                    className={classes.socialLink}
                                    aria-label={social.label}
                                >
                                    <social.icon size={20} stroke={1.5} />
                                </Anchor>
                            ))}
                        </Group>
                    </Stack>

                    {/* Products */}
                    <Stack gap="sm">
                        <Text fw={600} size="sm" className={classes.columnTitle}>Produtos</Text>
                        {footerLinks.produtos.map((link) => (
                            <Anchor key={link.label} href={link.href} className={classes.link}>
                                {link.label}
                            </Anchor>
                        ))}
                    </Stack>

                    {/* Company */}
                    <Stack gap="sm">
                        <Text fw={600} size="sm" className={classes.columnTitle}>Empresa</Text>
                        {footerLinks.empresa.map((link) => (
                            <Anchor key={link.label} href={link.href} className={classes.link}>
                                {link.label}
                            </Anchor>
                        ))}
                    </Stack>

                    {/* Support */}
                    <Stack gap="sm">
                        <Text fw={600} size="sm" className={classes.columnTitle}>Suporte</Text>
                        {footerLinks.suporte.map((link) => (
                            <Anchor key={link.label} href={link.href} className={classes.link}>
                                {link.label}
                            </Anchor>
                        ))}
                    </Stack>

                    {/* Legal */}
                    <Stack gap="sm">
                        <Text fw={600} size="sm" className={classes.columnTitle}>Legal</Text>
                        {footerLinks.legal.map((link) => (
                            <Anchor key={link.label} href={link.href} className={classes.link}>
                                {link.label}
                            </Anchor>
                        ))}
                    </Stack>
                </SimpleGrid>

                <Divider color="dark.5" mb="lg" />

                {/* Bottom Bar */}
                <Group justify="space-between" wrap="wrap" gap="md">
                    <Text size="xs" c="dimmed">
                        © {new Date().getFullYear()} Sincla. Todos os direitos reservados.
                    </Text>
                    <Text size="xs" c="dimmed">
                        Feito com 💙 no Brasil
                    </Text>
                </Group>
            </Container>
        </footer>
    );
}

