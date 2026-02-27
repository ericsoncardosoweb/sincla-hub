import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/sections/Hero';
import { ProductShowcase } from '../components/sections/ProductShowcase';
import { Stats } from '../components/sections/Stats';
import { TeamSolutions } from '../components/sections/TeamSolutions';
import { Testimonials } from '../components/sections/Testimonials';
import { HowItWorks } from '../components/sections/HowItWorks';
import { Platforms } from '../components/sections/Platforms';
import { Enterprise } from '../components/sections/Enterprise';
import { Partners } from '../components/sections/Partners';
import { Support } from '../components/sections/Support';
import { CtaBanner } from '../components/sections/CtaBanner';
import { ScrollProgress } from '../components/common/ScrollProgress';
import { OnboardingModal } from '../components/modals/OnboardingModal';
import { SignatureVisual } from '../components/signature-visual';

export function Landing() {
    const [modalOpened, setModalOpened] = useState(false);

    const openModal = () => setModalOpened(true);
    const closeModal = () => setModalOpened(false);

    return (
        <div data-landing style={{ background: 'var(--bg-dark)', color: 'var(--text-primary)', minHeight: '100vh' }}>
            {/* Assinatura Visual Sincla - Sistema Gravitacional */}
            <SignatureVisual />

            <ScrollProgress />
            <Header />
            <main id="main-content">
                <Hero onOpenModal={openModal} />
                <ProductShowcase onOpenModal={openModal} />
                <Stats />
                <TeamSolutions />
                <Testimonials />
                <HowItWorks onOpenModal={openModal} />
                <Platforms />
                <Enterprise />
                <Partners />
                <Support />
                <CtaBanner onOpenModal={openModal} />
            </main>
            <Footer />
            <OnboardingModal opened={modalOpened} onClose={closeModal} />
        </div>
    );
}
