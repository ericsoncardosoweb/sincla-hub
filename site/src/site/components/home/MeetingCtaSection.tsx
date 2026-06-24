import { Container } from '@mantine/core';
import { IconArrowUpRight, IconHeadset } from '@tabler/icons-react';
import { useConversion } from '../../../conversion/ConversionProvider';
import { SITE } from '../../../content/site';
import s from './home.module.css';

export function MeetingCtaSection() {
    const { openMeetingWizard } = useConversion();

    return (
        <section id="agendar" className={`${s.section} ${s.sectionAccent}`}>
            <Container size={1360}>
                <div className={s.ctaWrap}>
                    <h2 className={s.ctaTitle}>Vamos montar a estrutura da sua empresa juntos?</h2>
                    <p className={s.ctaSub}>
                        Crie sua conta grátis agora ou agende uma conversa de 20 minutos. A gente
                        entende seu cenário e mostra o melhor caminho — sem compromisso.
                    </p>
                    <div className={s.ctaActions}>
                        <a href={SITE.signupUrl} className={s.btnPrimary}>
                            <IconArrowUpRight size={18} stroke={2} />
                            Criar conta grátis
                        </a>
                        <button
                            type="button"
                            className={s.btnGhostInk}
                            onClick={() => openMeetingWizard({ source: 'home-cta' })}
                        >
                            <IconHeadset size={18} stroke={1.6} />
                            Fale com um especialista
                        </button>
                    </div>
                </div>
            </Container>
        </section>
    );
}
