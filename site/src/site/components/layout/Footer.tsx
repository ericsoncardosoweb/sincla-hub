import { Link } from 'react-router-dom';
import { Container, Group, Text, Stack, Anchor, SimpleGrid, Select } from '@mantine/core';
import { IconWorld, IconArrowRight, IconBrandFacebook, IconBrandX, IconBrandLinkedin, IconBrandYoutube, IconBrandInstagram } from '@tabler/icons-react';
import classes from './Footer.module.css';

// Links da coluna Empresa (sobre a Sincla)
const empresaLinks = [
    { label: 'Empresa', href: '/empresa' },
    { label: 'Carreiras', href: '/carreiras' },
    { label: 'Eventos', href: '/eventos' },
    { label: 'Blogs', href: '/blog' },
    { label: 'Relações com Investidores', href: '/investidores' },
    { label: 'Fundação Sincla', href: '/fundacao' },
    { label: 'Kit de Imprensa', href: '/imprensa' },
    { label: 'Fale com a gente', href: '/contato' },
];

// Links da coluna Produtos (não tem páginas, ficam como #)
const produtosLinks = [
    { label: 'Sincla RH', href: '#' },
    { label: 'Sincla EAD', href: '#' },
    { label: 'Sincla Bolso', href: '#' },
    { label: 'Sincla Leads', href: '#' },
    { label: 'Sincla Agenda', href: '#' },
    { label: 'Sincla Intranet', href: '#' },
];

// Links da coluna Recursos
const recursosLinks = [
    { label: 'Suporte técnico', href: '/suporte' },
    { label: 'Compras e licenciamento', href: '/compras' },
    { label: 'Comunidade Sincla', href: '/comunidade' },
    { label: 'Base de conhecimento', href: '/base-conhecimento' },
    { label: 'Marketplace', href: '/marketplace' },
    { label: 'Minha conta', href: 'https://app.sincla.com.br/painel' },
];

// Links da coluna Saiba Mais
const saibaMaisLinks = [
    { label: 'Parceiros', href: '/parceiros' },
    { label: 'Treinamento e certificação', href: '/treinamento' },
    { label: 'Documentação', href: '/documentacao' },
    { label: 'Recursos de desenvolvedores', href: '/desenvolvedores' },
    { label: 'Serviços corporativos', href: '/servicos-corporativos' },
];

// Links do rodapé inferior (legal)
const legalLinks = [
    { label: 'Política de privacidade', href: '/politica-privacidade' },
    { label: 'Termos de uso', href: '/termos-de-uso' },
    { label: 'Aviso legal', href: '#' },
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
                <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} spacing={{ base: 'xl', md: 60 }} mb={48}>
                    {/* Coluna 1: Logo + Empresa */}
                    <Stack gap="md">
                        <Link to="/" className={classes.logoLink}>
                            <img
                                src="/logos/sincla.svg"
                                alt="Sincla"
                                height={28}
                                style={{ display: 'block' }}
                            />
                        </Link>
                        <Stack gap="xs" mt="md">
                            {empresaLinks.map((link) => (
                                <Anchor key={link.label} component={Link} to={link.href} className={classes.link}>
                                    {link.label}
                                </Anchor>
                            ))}
                        </Stack>
                    </Stack>

                    {/* Coluna 2: Produtos */}
                    <Stack gap="md">
                        <Text className={classes.columnTitle}>PRODUTOS</Text>
                        <Stack gap="xs">
                            {produtosLinks.map((link) => (
                                <Anchor key={link.label} href={link.href} className={classes.link}>
                                    {link.label}
                                </Anchor>
                            ))}
                        </Stack>
                        <Anchor href="#produtos" className={classes.viewAllLink}>
                            Ver todos os produtos <IconArrowRight size={14} />
                        </Anchor>
                    </Stack>

                    {/* Coluna 3: Recursos */}
                    <Stack gap="md">
                        <Text className={classes.columnTitle}>RECURSOS</Text>
                        <Stack gap="xs">
                            {recursosLinks.map((link) => (
                                <Anchor key={link.label} component={Link} to={link.href} className={classes.link}>
                                    {link.label}
                                </Anchor>
                            ))}
                        </Stack>
                        <Anchor component={Link} to="/ticket-suporte" className={classes.viewAllLink}>
                            Criar ticket de suporte <IconArrowRight size={14} />
                        </Anchor>
                    </Stack>

                    {/* Coluna 4: Saiba Mais */}
                    <Stack gap="md">
                        <Text className={classes.columnTitle}>SAIBA MAIS</Text>
                        <Stack gap="xs">
                            {saibaMaisLinks.map((link) => (
                                <Anchor key={link.label} component={Link} to={link.href} className={classes.link}>
                                    {link.label}
                                </Anchor>
                            ))}
                        </Stack>
                        <Anchor component={Link} to="/recursos" className={classes.viewAllLink}>
                            Ver todos os recursos <IconArrowRight size={14} />
                        </Anchor>
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
                                <Anchor key={link.label} href={link.href} className={classes.legalLink}>
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
