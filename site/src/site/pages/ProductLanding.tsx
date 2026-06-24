import { useState, type CSSProperties } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Container } from '@mantine/core';
import {
    IconArrowUpRight,
    IconHeadset,
    IconCheck,
    IconPlus,
    IconBolt,
    IconRocket,
    IconSparkles,
    IconAdjustmentsHorizontal,
    IconPlugConnected,
    IconLayoutGrid,
} from '@tabler/icons-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { useConversion } from '../../conversion/ConversionProvider';
import { getProduct, type ProductId } from '../../content/products';
import { usePageMeta } from '../../shared/hooks/usePageMeta';
import s from '../components/home/home.module.css';
import c from './ProductLanding.module.css';

const BENEFIT_ICONS = [IconRocket, IconSparkles, IconAdjustmentsHorizontal];

function softColor(hex: string, alpha = 0.14) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ProductLanding({ overrideSlug }: { overrideSlug?: string }) {
    const { slug: paramSlug } = useParams<{ slug: string }>();
    const slug = (overrideSlug || paramSlug)?.toLowerCase();
    const product = slug ? getProduct(slug) : undefined;

    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const { openMeetingWizard } = useConversion();

    usePageMeta(
        product ? `${product.name} | Sincla` : 'Sincla',
        product?.description,
    );

    if (!product) {
        return <Navigate to="/" replace />;
    }

    const accent = product.color;
    const intent = product.id as ProductId;

    return (
        <div className={c.page} style={{ '--accent': accent } as CSSProperties}>
            <Header />

            <main key={product.id}>
                {/* HERO */}
                <section className={c.hero}>
                    <Container size={1360}>
                        <div className={c.heroInner}>
                            <div className={c.heroText}>
                                <span className={c.badge}>{product.tagline}</span>
                                <h1 className={c.title}>
                                    {product.headline}{' '}
                                    <span className={c.titleAccent}>{product.subheadline}</span>
                                </h1>
                                <p className={c.subtitle}>{product.description}</p>
                                <div className={c.heroCtas}>
                                    <a href={product.signupUrl} className={c.ctaPrimary}>
                                        <IconArrowUpRight size={18} stroke={2} />
                                        Criar conta grátis
                                    </a>
                                    <button
                                        type="button"
                                        className={c.ctaGhost}
                                        onClick={() => openMeetingWizard({ intent, source: `produto-${product.id}` })}
                                    >
                                        <IconHeadset size={18} stroke={1.6} />
                                        Fale com um especialista
                                    </button>
                                </div>
                            </div>

                            <div className={c.previewCard}>
                                <div className={c.previewHeader}>
                                    <div className={c.previewDots}>
                                        <span /><span /><span />
                                    </div>
                                    <span className={c.previewTitle}>
                                        <IconLayoutGrid size={16} stroke={1.6} style={{ color: accent }} />
                                        {product.name}
                                    </span>
                                </div>
                                <div className={c.previewBody}>
                                    {product.features.slice(0, 4).map((feat) => (
                                        <div key={feat} className={c.previewItem}>
                                            <span
                                                className={c.previewItemIcon}
                                                style={{ background: softColor(accent, 0.18), color: accent }}
                                            >
                                                <IconCheck size={17} stroke={2.2} />
                                            </span>
                                            <span className={c.previewItemText}>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className={c.previewFooter}>
                                    <IconBolt size={14} stroke={1.6} style={{ color: accent }} />
                                    Integrado ao Hub · um login · dados sincronizados
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* BENEFÍCIOS */}
                <section className={`${s.section} ${s.sectionLight}`}>
                    <Container size={1360}>
                        <div className={`${s.head} ${s.headCenter}`}>
                            <p className={s.eyebrow} style={{ color: accent }}>Recursos</p>
                            <h2 className={s.heading}>Feito para o dia a dia, sem burocracia</h2>
                            <p className={s.sub}>
                                Projetado para eliminar tarefas manuais e focar no que realmente importa.
                            </p>
                        </div>
                        <div className={s.grid3}>
                            {product.benefits.map((b, i) => {
                                const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
                                return (
                                    <div key={b.title} className={s.cardLight}>
                                        <span
                                            className={s.iconChip}
                                            style={{ background: softColor(accent), color: accent }}
                                        >
                                            <Icon size={24} stroke={1.5} />
                                        </span>
                                        <h3 className={s.cardTitle}>{b.title}</h3>
                                        <p className={s.cardText}>{b.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </Container>
                </section>

                {/* TUDO QUE VEM JUNTO (features + templates) */}
                <section className={`${s.section} ${s.sectionInk}`}>
                    <Container size={1360}>
                        <div className={s.head}>
                            <p className={`${s.eyebrow} ${s.eyebrowInk}`}>Tudo que vem junto</p>
                            <h2 className={s.heading}>Recursos do {product.shortName}</h2>
                        </div>
                        <div className={c.featureGrid}>
                            {product.features.map((feat) => (
                                <div key={feat} className={c.featureItem}>
                                    <IconCheck size={19} stroke={2} className={c.featureCheck} style={{ color: accent }} />
                                    {feat}
                                </div>
                            ))}
                        </div>
                        <div className={c.templates}>
                            {product.templates.map((t) => (
                                <span key={t} className={c.templatePill}>
                                    <IconSparkles size={15} stroke={1.6} style={{ color: accent }} />
                                    {t}
                                </span>
                            ))}
                        </div>
                    </Container>
                </section>

                {/* INTEGRAÇÃO */}
                <section className={`${s.section} ${s.sectionLightAlt}`}>
                    <Container size={1360}>
                        <div className={`${s.head} ${s.headCenter}`}>
                            <p className={s.eyebrow} style={{ color: accent }}>Ecossistema</p>
                            <h2 className={s.heading}>{product.integrationTitle}</h2>
                            <p className={s.sub}>{product.integrationDesc}</p>
                        </div>
                        <div className={s.grid2}>
                            {product.integrationPoints.map((p) => (
                                <div key={p.title} className={s.cardLight}>
                                    <span
                                        className={s.iconChip}
                                        style={{ background: softColor(accent), color: accent }}
                                    >
                                        <IconPlugConnected size={24} stroke={1.5} />
                                    </span>
                                    <h3 className={s.cardTitle}>{p.title}</h3>
                                    <p className={s.cardText}>{p.description}</p>
                                </div>
                            ))}
                        </div>
                    </Container>
                </section>

                {/* FAQ */}
                <section className={`${s.section} ${s.sectionLight}`}>
                    <Container size={1360}>
                        <div className={`${s.head} ${s.headCenter}`}>
                            <p className={s.eyebrow} style={{ color: accent }}>Dúvidas</p>
                            <h2 className={s.heading}>Perguntas frequentes</h2>
                        </div>
                        <div className={s.faqList}>
                            {product.faqs.map((faq, i) => {
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
                                            <IconPlus
                                                size={22}
                                                stroke={1.8}
                                                className={`${s.faqIcon} ${isOpen ? s.faqIconOpen : ''}`}
                                                style={{ color: accent }}
                                            />
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

                {/* CTA FINAL */}
                <section className={`${s.section} ${s.sectionAccent}`}>
                    <Container size={1360}>
                        <div className={s.ctaWrap}>
                            <h2 className={s.ctaTitle}>Pronto para começar com o {product.shortName}?</h2>
                            <p className={s.ctaSub}>
                                Ative sua conta gratuita em menos de 2 minutos. Sem cartão de crédito,
                                sem compromisso.
                            </p>
                            <div className={s.ctaActions}>
                                <a href={product.signupUrl} className={s.btnPrimary}>
                                    <IconArrowUpRight size={18} stroke={2} />
                                    Criar conta grátis
                                </a>
                                <button
                                    type="button"
                                    className={s.btnGhostInk}
                                    onClick={() => openMeetingWizard({ intent, source: `produto-${product.id}-cta` })}
                                >
                                    <IconHeadset size={18} stroke={1.6} />
                                    Fale com um especialista
                                </button>
                            </div>
                        </div>
                    </Container>
                </section>
            </main>

            <Footer />
        </div>
    );
}
