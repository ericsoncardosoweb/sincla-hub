import type { ReactNode } from 'react';
import { Header } from '../../site/components/layout/Header';
import { Footer } from '../../site/components/layout/Footer';
import { StickyMobileBar } from '../../conversion/StickyMobileBar';
import classes from './MarketingLayout.module.css';

interface MarketingLayoutProps {
  children: ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className={classes.shell}>
      <a href="#main-content" className="skip-to-content">
        Ir para o conteúdo
      </a>
      <Header />
      <main id="main-content" className={classes.main}>
        {children}
      </main>
      <Footer />
      <StickyMobileBar />
    </div>
  );
}
