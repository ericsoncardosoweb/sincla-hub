import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/sections/Hero';
import { Platforms } from '../components/sections/Platforms';
import { Enterprise } from '../components/sections/Enterprise';
import { Partners } from '../components/sections/Partners';
import { Support } from '../components/sections/Support';
import { ScrollProgress } from '../components/common/ScrollProgress';

export function Landing() {
    return (
        <>
            <ScrollProgress />
            <Header />
            <main id="main-content">
                <Hero />
                <Platforms />
                <Enterprise />
                <Partners />
                <Support />
            </main>
            <Footer />
        </>
    );
}
