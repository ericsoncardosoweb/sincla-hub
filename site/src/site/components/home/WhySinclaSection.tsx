import { Container } from '@mantine/core';
import {
    IconSparkles,
    IconShieldLock,
    IconAdjustmentsHorizontal,
    IconDiscount2,
} from '@tabler/icons-react';
import s from './home.module.css';

const ITEMS = [
    {
        Icon: IconSparkles,
        color: 'var(--mod-rh)',
        soft: 'var(--mod-rh-soft)',
        title: 'IA em todos os módulos',
        text: 'Triagem de candidatos, apoio a avaliações e organização de trilhas — a IA tira o trabalho repetitivo do caminho.',
    },
    {
        Icon: IconShieldLock,
        color: 'var(--mod-recrut)',
        soft: 'var(--mod-recrut-soft)',
        title: 'Um login seguro (SSO)',
        text: 'Um e-mail dá acesso a tudo que foi liberado. Saiu da empresa? Um desligamento encerra o acesso a todos os módulos.',
    },
    {
        Icon: IconAdjustmentsHorizontal,
        color: 'var(--mod-ead)',
        soft: 'var(--mod-ead-soft)',
        title: 'Customizável, não engessado',
        text: 'Você desenha funis, etapas e rotinas no jeito da sua empresa. A ferramenta se adapta a você — não o contrário.',
    },
    {
        Icon: IconDiscount2,
        color: '#29d17f',
        soft: 'rgba(41, 209, 127, 0.16)',
        title: 'Pague só pelo que usar',
        text: 'Conta e Hub grátis para começar. Ative módulos conforme cresce — e quanto mais módulos, maior o desconto.',
    },
];

export function WhySinclaSection() {
    return (
        <section className={`${s.section} ${s.sectionInk}`}>
            <Container size={1360}>
                <div className={s.head}>
                    <p className={`${s.eyebrow} ${s.eyebrowInk}`}>Por que Sincla</p>
                    <h2 className={s.heading}>Várias soluções em um lugar — com segurança</h2>
                    <p className={s.sub}>
                        Sem reconstruir processos a cada ferramenta. Você constrói a estrutura da sua
                        empresa uma vez, com praticidade e controle.
                    </p>
                </div>

                <div className={s.grid4}>
                    {ITEMS.map(({ Icon, color, soft, title, text }) => (
                        <div key={title} className={s.cardInk}>
                            <span className={s.iconChip} style={{ background: soft, color }}>
                                <Icon size={24} stroke={1.5} />
                            </span>
                            <h3 className={s.cardTitle} style={{ color: 'var(--on-ink)' }}>
                                {title}
                            </h3>
                            <p className={s.cardText}>{text}</p>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
}
