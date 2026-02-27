import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { theme } from './shared/styles/theme';
import { AuthProvider, CompanyProvider } from './shared/contexts';

// Auth pages
import { Login, Register, ForgotPassword, AuthCallback } from './pages/auth';

// Dashboard pages
import { DashboardLayout } from './components/dashboard';
import { DashboardHome, Companies, CompanySettings, Team, Subscriptions, Integrations, Contacts, Profile, Onboarding } from './pages/Dashboard';

// Checkout (layout independente)
import { CheckoutLayout } from './components/checkout/CheckoutLayout';
import { CheckoutPage } from './pages/Checkout/CheckoutPage';

// Admin pages
import { AdminLayout, AdminDashboard, AdminProducts, AdminPlans, AdminPartners, AdminUsers, AdminInfrastructure, AdminSubscribers, AdminSubscriptions, AdminSettings, AdminLegalPages } from './pages/Admin';

// Partner pages
import { PartnerLayout, PartnerDashboard, PartnerClients, PartnerWithdrawals, PartnerSettings } from './pages/Partner';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
        },
    },
});

export function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <MantineProvider theme={theme} defaultColorScheme="light">
                <Notifications position="top-right" />
                <AuthProvider>
                    <CompanyProvider>
                        <BrowserRouter>
                            <Routes>
                                {/* Auth */}
                                <Route path="/login" element={<Login />} />
                                <Route path="/cadastro" element={<Register />} />
                                <Route path="/esqueci-senha" element={<ForgotPassword />} />
                                <Route path="/auth/callback" element={<AuthCallback />} />

                                {/* Redireciona raiz para /painel */}
                                <Route path="/" element={<Navigate to="/painel" replace />} />

                                {/* Checkout independente (sem sidebar) */}
                                <Route path="/checkout" element={<CheckoutLayout />}>
                                    <Route index element={<CheckoutPage />} />
                                </Route>

                                {/* Dashboard do Usuário */}
                                <Route path="/painel" element={<DashboardLayout />}>
                                    <Route index element={<DashboardHome />} />
                                    <Route path="empresas" element={<Companies />} />
                                    <Route path="empresas/nova" element={<Companies />} />
                                    <Route path="configuracoes" element={<CompanySettings />} />
                                    <Route path="equipe" element={<Team />} />
                                    <Route path="assinaturas" element={<Subscriptions />} />
                                    <Route path="integracoes" element={<Integrations />} />
                                    <Route path="contatos" element={<Contacts />} />
                                    <Route path="perfil" element={<Profile />} />
                                    <Route path="onboarding" element={<Onboarding />} />
                                    <Route path="parceiro" element={<PartnerLayout />}>
                                        <Route index element={<PartnerDashboard />} />
                                        <Route path="clientes" element={<PartnerClients />} />
                                        <Route path="saques" element={<PartnerWithdrawals />} />
                                        <Route path="configuracoes" element={<PartnerSettings />} />
                                    </Route>
                                </Route>

                                {/* Admin Master */}
                                <Route path="/painel/admin" element={<AdminLayout />}>
                                    <Route index element={<AdminDashboard />} />
                                    <Route path="produtos" element={<AdminProducts />} />
                                    <Route path="produtos/:productId/planos" element={<AdminPlans />} />
                                    <Route path="planos" element={<AdminPlans />} />
                                    <Route path="assinantes" element={<AdminSubscribers />} />
                                    <Route path="assinaturas" element={<AdminSubscriptions />} />
                                    <Route path="parceiros" element={<AdminPartners />} />
                                    <Route path="admins" element={<AdminUsers />} />
                                    <Route path="infraestrutura" element={<AdminInfrastructure />} />
                                    <Route path="paginas-legais" element={<AdminLegalPages />} />
                                    <Route path="configuracoes" element={<AdminSettings />} />
                                </Route>
                            </Routes>
                        </BrowserRouter>
                    </CompanyProvider>
                </AuthProvider>
            </MantineProvider>
        </QueryClientProvider>
    );
}
