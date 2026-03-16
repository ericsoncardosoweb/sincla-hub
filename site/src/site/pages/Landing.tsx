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
import { SignatureVisual } from '../components/signature-visual';

const SIGNUP_URL = 'https://app.sincla.com.br/cadastro';

export function Landing() {
    return (
        <div data-landing style={{ background: 'var(--bg-dark)', color: 'var(--text-primary)', minHeight: '100vh' }}>
            {/* Assinatura Visual Sincla - Sistema Gravitacional */}
            <SignatureVisual />

            <ScrollProgress />
            <Header />
            <main id="main-content">
                <Hero signupUrl={SIGNUP_URL} />
                <ProductShowcase signupUrl={SIGNUP_URL} />
                <Stats />
                <TeamSolutions />
                <Testimonials />
                <HowItWorks signupUrl={SIGNUP_URL} />
                <Platforms />
                <Enterprise />
                <Partners />
                <Support />
                <CtaBanner signupUrl={SIGNUP_URL} />
            </main>
            <Footer />
        </div>
    );
}
