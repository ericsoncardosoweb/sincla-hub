import { useState } from 'react';
import { Container } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { HOME_FAQ } from '../../../content/faq';
import s from './home.module.css';

export function FaqSection() {
    const [open, setOpen] = useState<number | null>(0);

    return (
        <section id="faq" className={`${s.section} ${s.sectionLight}`}>
            <Container size={1360}>
                <div className={`${s.head} ${s.headCenter}`}>
                    <p className={s.eyebrow}>Dúvidas frequentes</p>
                    <h2 className={s.heading}>Perguntas que recebemos sempre</h2>
                </div>

                <div className={s.faqList}>
                    {HOME_FAQ.map((item, i) => {
                        const isOpen = open === i;
                        return (
                            <div key={item.question} className={s.faqItem}>
                                <button
                                    type="button"
                                    className={s.faqQ}
                                    aria-expanded={isOpen}
                                    onClick={() => setOpen(isOpen ? null : i)}
                                >
                                    {item.question}
                                    <IconPlus
                                        size={22}
                                        stroke={1.8}
                                        className={`${s.faqIcon} ${isOpen ? s.faqIconOpen : ''}`}
                                    />
                                </button>
                                <div className={`${s.faqA} ${isOpen ? s.faqAOpen : ''}`}>
                                    <p className={s.faqAInner}>{item.answer}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Container>
        </section>
    );
}
