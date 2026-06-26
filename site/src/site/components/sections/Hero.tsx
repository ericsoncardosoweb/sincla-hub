import { Container } from '@mantine/core';
import {
    IconArrowUpRight,
    IconHeadset,
    IconUsers,
    IconTargetArrow,
    IconSchool,
    IconCheck,
    IconBolt,
} from '@tabler/icons-react';
import { useConversion } from '../../../conversion/ConversionProvider';
import classes from './Hero.module.css';

interface HeroProps {
    signupUrl: string;
}

const MODULES = [
    {
        id: 'rh',
        name: 'Sincla RH',
        desc: 'Pessoas, avaliações e rotinas',
        Icon: IconUsers,
        color: 'var(--mod-rh)',
        soft: 'var(--mod-rh-soft)',
    },
    {
        id: 'talento',
        name: 'Sincla Talento',
        desc: 'Atração e triagem inteligente',
        Icon: IconTargetArrow,
        color: 'var(--mod-recrut)',
        soft: 'var(--mod-recrut-soft)',
    },
    {
        id: 'ead',
        name: 'Sincla EAD',
        desc: 'Trilhas e certificados',
        Icon: IconSchool,
        color: 'var(--mod-ead)',
        soft: 'var(--mod-ead-soft)',
    },
] as const;

const TRUST = [
    'Conta e Hub grátis para começar',
    'Assine só os módulos que usar',
    '1 login seguro (SSO) para tudo',
];

export function Hero({ signupUrl }: HeroProps) {
    const { openMeetingWizard } = useConversion();

    return (
        <section id="hero" className={classes.hero}>
            <Container size={1360} className={classes.container}>
                <div className={classes.grid}>
                    {/* Coluna de conteúdo */}
                    <div className={classes.content}>
                        <span className={classes.badge}>
                            <span className={classes.badgeDot} aria-hidden="true" />
                            Plataforma em lançamento · Ecossistema para PMEs
                        </span>

                        <h1 className={classes.title}>
                            RH, Talento e treinamento
                            <br />
                            <span className={classes.titleAccent}>no mesmo lugar.</span>
                        </h1>

                        <p className={classes.subtitle}>
                            Um cadastro monta a estrutura da sua empresa. A partir dele você ativa
                            RH, Talento e treinamento — integrados, turbinados com IA e do seu
                            jeito. Um login, dados sincronizados e sem refazer nada a cada ferramenta.
                        </p>

                        <div className={classes.ctaGroup}>
                            <a href={signupUrl} className={classes.primaryCta}>
                                <IconArrowUpRight size={18} stroke={2} />
                                Criar conta grátis
                            </a>
                            <button
                                type="button"
                                className={classes.secondaryCta}
                                onClick={() => openMeetingWizard({ source: 'hero' })}
                            >
                                <IconHeadset size={18} stroke={1.6} />
                                Fale com um especialista
                            </button>
                        </div>

                        <ul className={classes.trust}>
                            {TRUST.map((item) => (
                                <li key={item} className={classes.trustItem}>
                                    <IconCheck size={16} stroke={2} className={classes.trustCheck} />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Card de produto (placeholder até os prints reais) */}
                    <div className={classes.visual}>
                        <div className={classes.productCard}>
                            <div className={classes.cardHeader}>
                                <div className={classes.cardDots} aria-hidden="true">
                                    <span /><span /><span />
                                </div>
                                <span className={classes.cardTitle}>Sincla Hub</span>
                            </div>

                            <div className={classes.cardBody}>
                                {MODULES.map(({ id, name, desc, Icon, color, soft }) => (
                                    <div key={id} className={classes.moduleRow}>
                                        <span
                                            className={classes.moduleIcon}
                                            style={{ background: soft, color }}
                                        >
                                            <Icon size={20} stroke={1.6} />
                                        </span>
                                        <span className={classes.moduleText}>
                                            <span className={classes.moduleName}>{name}</span>
                                            <span className={classes.moduleDesc}>{desc}</span>
                                        </span>
                                        <span className={classes.moduleStatus} style={{ color }}>
                                            <IconCheck size={15} stroke={2.4} />
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className={classes.cardFooter}>
                                <IconBolt size={15} stroke={1.6} />
                                Um cadastro · ative os módulos · dados sincronizados
                            </div>
                        </div>

                        <div className={classes.floatBadge}>
                            <span className={classes.floatBadgeDot} aria-hidden="true" />
                            Integração nativa entre os módulos
                        </div>

                        <div className={classes.glowOne} aria-hidden="true" />
                        <div className={classes.glowTwo} aria-hidden="true" />
                    </div>
                </div>
            </Container>
        </section>
    );
}
