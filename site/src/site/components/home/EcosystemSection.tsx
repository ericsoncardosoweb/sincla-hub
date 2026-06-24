import { Container } from '@mantine/core';
import {
    IconTargetArrow,
    IconUsers,
    IconSchool,
    IconArrowRight,
    IconBolt,
} from '@tabler/icons-react';
import s from './home.module.css';

const NODES = [
    {
        Icon: IconTargetArrow,
        color: 'var(--mod-recrut)',
        soft: 'var(--mod-recrut-soft)',
        name: 'Recrutamento',
        text: 'Candidato aprovado na vaga',
    },
    {
        Icon: IconUsers,
        color: 'var(--mod-rh)',
        soft: 'var(--mod-rh-soft)',
        name: 'Sincla RH',
        text: 'Vira colaborador, sem redigitar',
    },
    {
        Icon: IconSchool,
        color: 'var(--mod-ead)',
        soft: 'var(--mod-ead-soft)',
        name: 'Sincla EAD',
        text: 'Matrícula automática na trilha',
    },
];

export function EcosystemSection() {
    return (
        <section id="ecossistema" className={`${s.section} ${s.sectionLight}`}>
            <Container size={1360}>
                <div className={`${s.head} ${s.headCenter}`}>
                    <p className={s.eyebrow}>Ecossistema integrado</p>
                    <h2 className={s.heading}>Menos planilha. Mais fluxo.</h2>
                    <p className={s.sub}>
                        Os módulos conversam entre si. Você cadastra uma vez e os dados seguem
                        sozinhos de uma ferramenta para a outra — sem reabrir sistema, sem refazer
                        planilha.
                    </p>
                </div>

                <div className={s.flow}>
                    {NODES.map(({ Icon, color, soft, name, text }, i) => (
                        <div key={name} style={{ display: 'contents' }}>
                            <div className={s.flowNode}>
                                <span className={s.iconChip} style={{ background: soft, color }}>
                                    <Icon size={24} stroke={1.5} />
                                </span>
                                <h3 className={s.cardTitle}>{name}</h3>
                                <p className={s.cardText}>{text}</p>
                            </div>
                            {i < NODES.length - 1 && (
                                <div className={s.flowConnector}>
                                    <IconArrowRight size={26} stroke={1.5} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                    <span className={s.flowHubBadge}>
                        <IconBolt size={16} stroke={1.6} />
                        Tudo orquestrado pelo Sincla Hub — um login, dados sincronizados
                    </span>
                </div>
            </Container>
        </section>
    );
}
