import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './shared/styles/global.css';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { theme } from './shared/styles/theme';
import { Landing } from './site/pages/Landing';
// Company pages
import { Empresa, Carreiras, Eventos, Blog, Investidores, Fundacao, Imprensa, Contato } from './site/pages/company';
// Resources pages
import { Suporte, Compras, Comunidade, BaseConhecimento, Marketplace, MinhaConta, TicketSuporte } from './site/pages/resources';
// Learn More pages
import { Parceiros, Treinamento, Documentacao, Desenvolvedores, ServicosCorporativos, Recursos } from './site/pages/learn-more';
// Legal pages
import { LegalPage } from './site/pages/LegalPage';

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
          <Routes>
            <Route path="/" element={<Landing />} />
            {/* Company */}
            <Route path="/empresa" element={<Empresa />} />
            <Route path="/carreiras" element={<Carreiras />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/investidores" element={<Investidores />} />
            <Route path="/fundacao" element={<Fundacao />} />
            <Route path="/imprensa" element={<Imprensa />} />
            <Route path="/contato" element={<Contato />} />
            {/* Resources */}
            <Route path="/suporte" element={<Suporte />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/comunidade" element={<Comunidade />} />
            <Route path="/base-conhecimento" element={<BaseConhecimento />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/minha-conta" element={<MinhaConta />} />
            <Route path="/ticket-suporte" element={<TicketSuporte />} />
            {/* Learn More */}
            <Route path="/parceiros" element={<Parceiros />} />
            <Route path="/treinamento" element={<Treinamento />} />
            <Route path="/documentacao" element={<Documentacao />} />
            <Route path="/desenvolvedores" element={<Desenvolvedores />} />
            <Route path="/servicos-corporativos" element={<ServicosCorporativos />} />
            <Route path="/recursos" element={<Recursos />} />
            {/* Legal Pages */}
            <Route path="/politica-privacidade" element={<LegalPage />} />
            <Route path="/termos-de-uso" element={<LegalPage />} />
            <Route path="/legal/:slug" element={<LegalPage />} />
          </Routes>
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
