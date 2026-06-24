import { useState } from 'react';
import { Container } from '@mantine/core';
import {
    IconShieldLock,
    IconUserCheck,
    IconMail,
    IconDatabase,
    IconHistory,
    IconArrowUpRight,
    IconDeviceLaptop,
    IconUsers,
    IconChevronRight,
    IconLock,
    IconFileSpreadsheet,
    IconCheck,
    IconPlus,
} from '@tabler/icons-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { SITE } from '../../content/site';
import { usePageMeta } from '../../shared/hooks/usePageMeta';
import s from '../components/home/home.module.css';

const ROLES = [
    {
        tag: 'A Sincla como Operadora',
        Icon: IconDeviceLaptop,
        title: 'Processamento de dados sob comando',
        text: 'Em soluções como o Sincla RH, a empresa assinante é a Controladora dos dados (admite a equipe, define a base legal e decide sobre exclusões). A Sincla atua como Operadora, processando as informações com segurança para viabilizar as rotinas solicitadas.',
        points: [
            'Segurança da infraestrutura de dados',
            'Exclusões e relatórios a comando do cliente',
            'Armazenamento isolado por empresa (multi-tenant)',
        ],
    },
    {
        tag: 'A Sincla como Controladora',
        Icon: IconUsers,
        title: 'Dados cadastrais e relações diretas',
        text: 'A Sincla é Controladora dos dados cadastrais e financeiros dos clientes diretos e dos perfis que candidatos ou alunos inserem voluntariamente no Hub, Recrutamento ou EAD. Nesses casos, o próprio titular controla e apaga suas informações.',
        points: [
            'Consentimento e autonomia do titular no Hub',
            'Exclusão direta de currículos pelo usuário',
            'Transparência nos termos de cada módulo',
        ],
    },
];

const CHANNELS = [
    {
        Icon: IconShieldLock,
        color: 'var(--mod-rh)',
        soft: 'var(--mod-rh-soft)',
        title: 'Encarregado (DPO)',
        text: 'Canal monitorado pelo Encarregado de Proteção de Dados para auditorias, relatórios de impacto e requisições formais de privacidade.',
        cta: 'privacidade@sincla.com.br',
        href: 'mailto:privacidade@sincla.com.br',
    },
    {
        Icon: IconDeviceLaptop,
        color: 'var(--mod-ead)',
        soft: 'var(--mod-ead-soft)',
        title: 'Suporte para clientes',
        text: 'Para administradores que precisam de apoio na exportação de relatórios ou ações administrativas nos dados dos colaboradores.',
        cta: 'contato@sincla.com.br',
        href: 'mailto:contato@sincla.com.br',
    },
    {
        Icon: IconUserCheck,
        color: 'var(--mod-recrut)',
        soft: 'var(--mod-recrut-soft)',
        title: 'Autonomia do titular',
        text: 'Candidatos e alunos contam com canais no próprio perfil do Sincla Hub para excluir, alterar ou exportar seus dados pessoais.',
        cta: 'Acessar o painel do Hub',
        href: SITE.loginUrl,
    },
];

const FEATURES = [
    {
        Icon: IconLock,
        title: 'Direito ao esquecimento facilitado',
        text: 'Administradores anonimizam ou excluem cadastros de colaboradores desligados, reduzindo riscos de passivos associados a dados legados.',
    },
    {
        Icon: IconFileSpreadsheet,
        title: 'Exportabilidade e portabilidade',
        text: 'Gere em um clique relatórios completos em formato estruturado quando um colaborador solicitar os dados que a empresa possui dele.',
    },
    {
        Icon: IconDatabase,
        title: 'Criptografia em repouso e trânsito',
        text: 'Dados trafegam sob HTTPS/TLS e são persistidos criptografados, em bancos isolados, seguindo padrões reconhecidos de segurança.',
    },
    {
        Icon: IconHistory,
        title: 'Trilha de auditoria (logs)',
        text: 'Registramos ações dos administradores, como acessos e exclusões de informações sensíveis, para relatórios de auditoria.',
    },
];

const FAQS = [
    {
        question: 'Como o Sincla RH lida com os dados do colaborador?',
        answer: 'O colaborador fornece seus dados à empresa empregadora (a assinante), que atua como controladora e é responsável pela base legal. A Sincla disponibiliza a infraestrutura segura de armazenamento e as ferramentas de acesso para o RH administrar as informações.',
    },
    {
        question: 'Como funciona a exclusão de currículos e cadastros?',
        answer: 'Nos módulos de Recrutamento e EAD, o titular tem autonomia total: pode solicitar a alteração ou remoção definitiva do currículo e histórico a qualquer momento, pelo painel do Sincla Hub, respeitando os direitos da LGPD.',
    },
    {
        question: 'Onde os dados ficam armazenados?',
        answer: 'Em infraestrutura de nuvem segura, com backups automatizados, redundância, controle rígido de acesso lógico e criptografia em trânsito e em repouso.',
    },
    {
        question: 'Vocês apoiam a elaboração de RIPD?',
        answer: 'Sim. Nosso time e o DPO apoiam empresas clientes com as informações de arquitetura de dados e segurança necessárias para o Relatório de Impacto à Proteção de Dados Pessoais (RIPD).',
    },
];

export function SuporteLgpd() {
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    usePageMeta(
        'Suporte LGPD | Sincla',
        'Conformidade, governança de dados e canais de privacidade da Sincla em total alinhamento com a LGPD.',
    );

    return (
        <div style={{ background: 'var(--paper)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />

            <main>
                {/* HERO (ink) */}
                <section className={`${s.section} ${s.sectionInk}`} style={{ paddingTop: 150 }}>
                    <Container size={1360}>
                        <div className={`${s.head} ${s.headCenter}`} style={{ maxWidth: 820 }}>
                            <p className={`${s.eyebrow} ${s.eyebrowInk}`}>Conformidade e transparência</p>
                            <h1 className={s.heading} style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
                                Sincla & LGPD: segurança e confiança para a sua empresa
                            </h1>
                            <p className={s.sub}>
                                Tecnologia em total conformidade com a Lei Geral de Proteção de Dados.
                                Conheça nossa governança e os canais de privacidade.
                            </p>
                        </div>
                        <div className={s.ctaActions} style={{ marginTop: 8 }}>
                            <a href={SITE.signupUrl} className={s.btnPrimary}>
                                <IconArrowUpRight size={18} stroke={2} />
                                Criar conta grátis
                            </a>
                            <a href="mailto:privacidade@sincla.com.br" className={s.btnGhostInk}>
                                <IconMail size={18} stroke={1.6} />
                                Falar com o DPO
                            </a>
                        </div>
                    </Container>
                </section>

                {/* RESPONSABILIDADES (light) */}
                <section className={`${s.section} ${s.sectionLight}`}>
                    <Container size={1360}>
                        <div className={`${s.head} ${s.headCenter}`}>
                            <p className={s.eyebrow}>Papéis sob a LGPD</p>
                            <h2 className={s.heading}>Quem é quem no tratamento de dados</h2>
                            <p className={s.sub}>
                                Entender os papéis garante segurança jurídica e tranquilidade para a sua operação.
                            </p>
                        </div>
                        <div className={s.grid2}>
                            {ROLES.map(({ tag, Icon, title, text, points }) => (
                                <div key={tag} className={s.cardLight}>
                                    <span className={s.iconChip} style={{ background: 'var(--mod-rh-soft)', color: 'var(--mod-rh)' }}>
                                        <Icon size={24} stroke={1.5} />
                                    </span>
                                    <p className={s.eyebrow} style={{ margin: '0 0 6px' }}>{tag}</p>
                                    <h3 className={s.cardTitle}>{title}</h3>
                                    <p className={s.cardText} style={{ marginBottom: 16 }}>{text}</p>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {points.map((p) => (
                                            <li key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: '0.875rem', color: 'var(--on-paper-muted)' }}>
                                                <IconCheck size={16} stroke={2} style={{ color: 'var(--mod-rh)', flexShrink: 0, marginTop: 2 }} />
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </Container>
                </section>

                {/* CANAIS (ink) */}
                <section className={`${s.section} ${s.sectionInk}`}>
                    <Container size={1360}>
                        <div className={`${s.head} ${s.headCenter}`}>
                            <p className={`${s.eyebrow} ${s.eyebrowInk}`}>Atendimento</p>
                            <h2 className={s.heading}>Canais de suporte e privacidade</h2>
                            <p className={s.sub}>
                                Estrutura dedicada para requisições de titulares e apoio ao time de conformidade dos nossos parceiros.
                            </p>
                        </div>
                        <div className={s.grid3}>
                            {CHANNELS.map(({ Icon, color, soft, title, text, cta, href }) => (
                                <div key={title} className={s.cardInk} style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span className={s.iconChip} style={{ background: soft, color }}>
                                        <Icon size={24} stroke={1.5} />
                                    </span>
                                    <h3 className={s.cardTitle} style={{ color: 'var(--on-ink)' }}>{title}</h3>
                                    <p className={s.cardText} style={{ flex: 1 }}>{text}</p>
                                    <a href={href} className={s.moduleLink} style={{ color, marginTop: 18 }}>
                                        {cta}
                                        <IconChevronRight size={16} stroke={1.8} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </Container>
                </section>

                {/* RECURSOS DE CONFORMIDADE (light alt) */}
                <section className={`${s.section} ${s.sectionLightAlt}`}>
                    <Container size={1360}>
                        <div className={`${s.head} ${s.headCenter}`}>
                            <p className={s.eyebrow}>Privacy by design</p>
                            <h2 className={s.heading}>Funcionalidades de privacidade inclusas</h2>
                            <p className={s.sub}>
                                Ferramentas completas para a conformidade do seu negócio, nativas na plataforma.
                            </p>
                        </div>
                        <div className={s.grid2}>
                            {FEATURES.map(({ Icon, title, text }) => (
                                <div key={title} className={s.cardLight}>
                                    <span className={s.iconChip} style={{ background: 'var(--mod-rh-soft)', color: 'var(--mod-rh)' }}>
                                        <Icon size={24} stroke={1.5} />
                                    </span>
                                    <h3 className={s.cardTitle}>{title}</h3>
                                    <p className={s.cardText}>{text}</p>
                                </div>
                            ))}
                        </div>
                    </Container>
                </section>

                {/* FAQ (light) */}
                <section className={`${s.section} ${s.sectionLight}`}>
                    <Container size={1360}>
                        <div className={`${s.head} ${s.headCenter}`}>
                            <p className={s.eyebrow}>Dúvidas frequentes</p>
                            <h2 className={s.heading}>LGPD na Sincla, sem complicação</h2>
                        </div>
                        <div className={s.faqList}>
                            {FAQS.map((faq, i) => {
                                const isOpen = openFaq === i;
                                return (
                                    <div key={faq.question} className={s.faqItem}>
                                        <button
                                            type="button"
                                            className={s.faqQ}
                                            aria-expanded={isOpen}
                                            onClick={() => setOpenFaq(isOpen ? null : i)}
                                        >
                                            {faq.question}
                                            <IconPlus size={22} stroke={1.8} className={`${s.faqIcon} ${isOpen ? s.faqIconOpen : ''}`} />
                                        </button>
                                        <div className={`${s.faqA} ${isOpen ? s.faqAOpen : ''}`}>
                                            <p className={s.faqAInner}>{faq.answer}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Container>
                </section>

                {/* CTA FINAL (accent) */}
                <section className={`${s.section} ${s.sectionAccent}`}>
                    <Container size={1360}>
                        <div className={s.ctaWrap}>
                            <span className={s.iconChip} style={{ background: 'var(--ink-surface-strong)', color: '#4aa3ff', margin: '0 auto 20px' }}>
                                <IconShieldLock size={26} stroke={1.5} />
                            </span>
                            <h2 className={s.ctaTitle}>Estruture o RH da sua empresa com segurança desde o primeiro dia</h2>
                            <p className={s.ctaSub}>
                                Gestão automatizada, transparente e em conformidade com a LGPD — sem complicar a rotina da equipe.
                            </p>
                            <div className={s.ctaActions}>
                                <a href={SITE.signupUrl} className={s.btnPrimary}>
                                    <IconArrowUpRight size={18} stroke={2} />
                                    Criar conta grátis
                                </a>
                                <a href="mailto:privacidade@sincla.com.br" className={s.btnGhostInk}>
                                    <IconMail size={18} stroke={1.6} />
                                    Falar com o DPO
                                </a>
                            </div>
                        </div>
                    </Container>
                </section>
            </main>

            <Footer />
        </div>
    );
}
