import { Container } from '@mantine/core';
import { HOW_IT_WORKS_STEPS } from '../../../content/site';
import s from './home.module.css';

export function HowItWorksSection() {
    return (
        <section id="como-funciona" className={`${s.section} ${s.sectionInk}`}>
            <Container size={1360}>
                <div className={s.head}>
                    <p className={`${s.eyebrow} ${s.eyebrowInk}`}>Como funciona</p>
                    <h2 className={s.heading}>Da conta à operação em 3 passos</h2>
                    <p className={s.sub}>
                        Você monta a estrutura da empresa uma vez. Depois é só ativar o que precisar.
                    </p>
                </div>

                <div className={s.steps}>
                    {HOW_IT_WORKS_STEPS.map((step) => (
                        <div key={step.number} className={s.step}>
                            <span className={s.stepNum}>{step.number}</span>
                            <h3 className={s.cardTitle} style={{ color: 'var(--on-ink)' }}>
                                {step.title}
                            </h3>
                            <p className={s.cardText}>{step.description}</p>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
}
