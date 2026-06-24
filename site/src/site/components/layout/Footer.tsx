import { Link } from 'react-router-dom';
import { Container } from '@mantine/core';
import { IconBrandWhatsapp, IconArrowUpRight } from '@tabler/icons-react';
import { SITE } from '../../../content/site';
import classes from './Footer.module.css';

const institutionalDesc =
    'Um cadastro monta a estrutura da sua empresa. A partir dele você ativa RH, recrutamento e treinamento — integrados, seguros e turbinados com IA.';

const produtosLinks = [
    { label: 'Sincla RH', to: '/rh' },
    { label: 'Sincla Recrutamento', to: '/recrutamento' },
    { label: 'Sincla EAD', to: '/ead' },
];

const navLinks = [
    { label: 'Como funciona', href: '/#como-funciona' },
    { label: 'Os módulos', href: '/#produtos' },
    { label: 'Dúvidas frequentes', href: '/#faq' },
    { label: 'Agendar conversa', href: '/#agendar' },
];

const legalLinks = [
    { label: 'Política de privacidade', to: '/politicas-de-privacidade' },
    { label: 'Termos de uso', to: '/termos-de-uso' },
    { label: 'Suporte LGPD', to: '/suporte-lgpd' },
];

const whatsappHref = `https://wa.me/${SITE.whatsappNumber}`;

export function Footer() {
    return (
        <footer className={classes.footer}>
            <Container size={1360}>
                <div className={classes.grid}>
                    {/* Marca + contato */}
                    <div className={classes.brandCol}>
                        <Link to="/" className={classes.logoLink}>
                            <img src="/logos/sincla.svg" alt="Sincla" height={28} style={{ display: 'block' }} />
                        </Link>
                        <p className={classes.desc}>{institutionalDesc}</p>
                        <a
                            href={whatsappHref}
                            className={classes.contact}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <IconBrandWhatsapp size={18} stroke={1.6} />
                            Falar com um consultor
                        </a>
                        <a href={SITE.signupUrl} className={classes.footerCta}>
                            <IconArrowUpRight size={16} stroke={2} />
                            Criar conta grátis
                        </a>
                    </div>

                    {/* Produtos */}
                    <div className={classes.linkCol}>
                        <span className={classes.columnTitle}>Produtos</span>
                        {produtosLinks.map((link) => (
                            <Link key={link.label} to={link.to} className={classes.link}>
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Navegação */}
                    <div className={classes.linkCol}>
                        <span className={classes.columnTitle}>Navegação</span>
                        {navLinks.map((link) => (
                            <a key={link.label} href={link.href} className={classes.link}>
                                {link.label}
                            </a>
                        ))}
                    </div>

                    {/* Legal */}
                    <div className={classes.linkCol}>
                        <span className={classes.columnTitle}>Legal</span>
                        {legalLinks.map((link) => (
                            <Link key={link.label} to={link.to} className={classes.link}>
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className={classes.bottomBar}>
                    <span className={classes.copyright}>
                        © {new Date().getFullYear()} Sincla. Todos os direitos reservados.
                    </span>
                    <span className={classes.launchBadge}>{SITE.launchBadge}</span>
                </div>
            </Container>
        </footer>
    );
}
