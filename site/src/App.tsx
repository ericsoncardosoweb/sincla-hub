import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './shared/styles/global.css';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { theme } from './shared/styles/theme';
import { Landing } from './site/pages/Landing';
import { SuporteLgpd } from './site/pages/SuporteLgpd';
import { LegalPage } from './site/pages/LegalPage';
import { ProductLanding } from './site/pages/ProductLanding';
import { ScrollToTop } from './site/components/common/ScrollToTop';
import { WhatsappFloat } from './site/components/common/WhatsappFloat';
import { ConversionProvider } from './conversion/ConversionProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-right" />
        <BrowserRouter>
          <ScrollToTop />
          <WhatsappFloat />
          <ConversionProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/suporte-lgpd" element={<SuporteLgpd />} />
              {/* Product Landings */}
              <Route path="/rh" element={<ProductLanding overrideSlug="rh" />} />
              <Route path="/recrutamento" element={<ProductLanding overrideSlug="recrutamento" />} />
              <Route path="/ead" element={<ProductLanding overrideSlug="ead" />} />
              <Route path="/produtos/:slug" element={<ProductLanding />} />
              {/* Legal Pages */}
              <Route path="/politica-privacidade" element={<LegalPage />} />
              <Route path="/politicas-de-privacidade" element={<LegalPage />} />
              <Route path="/termos-de-uso" element={<LegalPage />} />
              <Route path="/politicas-de-compra" element={<LegalPage />} />
              <Route path="/legal/:slug" element={<LegalPage />} />
            </Routes>
          </ConversionProvider>
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
