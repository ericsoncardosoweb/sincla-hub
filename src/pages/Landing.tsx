import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/sections/Hero';
import { HowItWorks } from '../components/sections/HowItWorks';
import { Platforms } from '../components/sections/Platforms';
import { Enterprise } from '../components/sections/Enterprise';
import { Partners } from '../components/sections/Partners';
import { Support } from '../components/sections/Support';
import { ScrollProgress } from '../components/common/ScrollProgress';
import { OnboardingModal } from '../components/modals/OnboardingModal';
import { SignatureVisual } from '../components/signature-visual';

export function Landing() {
    const [modalOpened, setModalOpened] = useState(false);

    const openModal = () => setModalOpened(true);
    const closeModal = () => setModalOpened(false);

    return (
        <>
            {/* Assinatura Visual Sincla - Sistema Gravitacional */}
            <SignatureVisual />

            <ScrollProgress />
            <Header />
            <main id="main-content">
                <Hero onOpenModal={openModal} />
                <HowItWorks onOpenModal={openModal} />
                <Platforms />
                <Enterprise />
                <Partners />
                <Support />
            </main>
            <Footer />
            <OnboardingModal opened={modalOpened} onClose={closeModal} />
        </>
    );
}
