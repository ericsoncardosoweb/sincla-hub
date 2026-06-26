import { Container } from '@mantine/core';
import {
    IconUsers,
    IconTargetArrow,
    IconSchool,
    IconCheck,
    IconArrowRight,
} from '@tabler/icons-react';
import { productList, type ProductId } from '../../../content/products';
import s from './home.module.css';

const ICONS: Record<ProductId, typeof IconUsers> = {
    rh: IconUsers,
    talento: IconTargetArrow,
    ead: IconSchool,
};

function hexToSoft(hex: string) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.12)`;
}

export function ModulesSection() {
    return (
        <section id="produtos" className={`${s.section} ${s.sectionLightAlt}`}>
            <Container size={1360}>
                <div className={`${s.head} ${s.headCenter}`}>
                    <p className={s.eyebrow}>Os módulos</p>
                    <h2 className={s.heading}>Ative só o que a sua empresa precisa</h2>
                    <p className={s.sub}>
                        Comece por um módulo e adicione os outros quando fizer sentido. Cada um é
                        completo sozinho — e melhor ainda quando integrado.
                    </p>
                </div>

                <div className={s.grid3}>
                    {productList.map((product) => {
                        const Icon = ICONS[product.id];
                        return (
                            <article key={product.id} className={s.moduleCard}>
                                <div
                                    className={s.moduleTop}
                                    style={{ background: product.color }}
                                />
                                <div className={s.moduleInner}>
                                    <span
                                        className={s.iconChip}
                                        style={{
                                            background: hexToSoft(product.color),
                                            color: product.color,
                                        }}
                                    >
                                        <Icon size={24} stroke={1.5} />
                                    </span>
                                    <h3 className={s.cardTitle}>{product.name}</h3>
                                    <p className={s.cardText}>{product.tagline}</p>

                                    <ul className={s.moduleFeatures}>
                                        {product.features.slice(0, 4).map((f) => (
                                            <li key={f} className={s.moduleFeature}>
                                                <IconCheck
                                                    size={17}
                                                    stroke={2}
                                                    style={{ color: product.color, flexShrink: 0, marginTop: 2 }}
                                                />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    <a
                                        href={product.path}
                                        className={s.moduleLink}
                                        style={{ color: product.color }}
                                    >
                                        Conhecer o {product.shortName}
                                        <IconArrowRight size={17} stroke={1.8} />
                                    </a>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </Container>
        </section>
    );
}
