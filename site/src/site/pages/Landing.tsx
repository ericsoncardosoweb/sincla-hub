import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/sections/Hero';
import { EcosystemSection } from '../components/home/EcosystemSection';
import { HowItWorksSection } from '../components/home/HowItWorksSection';
import { ModulesSection } from '../components/home/ModulesSection';
import { WhySinclaSection } from '../components/home/WhySinclaSection';
import { MeetingCtaSection } from '../components/home/MeetingCtaSection';
import { FaqSection } from '../components/home/FaqSection';
import { ScrollProgress } from '../components/common/ScrollProgress';
import { SITE } from '../../content/site';

export function Landing() {
    return (
        <div style={{ background: 'var(--paper)', minHeight: '100vh' }}>
            <ScrollProgress />
            <Header />
            <main id="main-content">
                <Hero signupUrl={SITE.signupUrl} />
                <EcosystemSection />
                <HowItWorksSection />
                <ModulesSection />
                <WhySinclaSection />
                <MeetingCtaSection />
                <FaqSection />
            </main>
            <Footer />
        </div>
    );
}
