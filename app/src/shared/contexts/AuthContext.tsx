import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Dev-mode logger
const isDev = import.meta.env.DEV;
const devLog = (label: string, ...args: unknown[]) => {
  if (isDev) console.log(`%c[Auth] ${label}`, 'color: #098eee; font-weight: bold;', ...args);
};
const devWarn = (label: string, ...args: unknown[]) => {
  if (isDev) console.warn(`[Auth] ${label}`, ...args);
};

// Types
export interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  cpf_cnpj: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface CompanyBranding {
  logo?: string | null;
  logo_dark?: string | null;
  favicon?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

export interface Company {
  id: string;
  subscriber_id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  custom_domain: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  description: string | null;
  industry: string | null;
  employee_count: number | null;
  status: 'active' | 'suspended' | 'canceled';
  settings: Record<string, unknown>;
  branding: CompanyBranding | null;
  created_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'manager' | 'member';
  status: 'active' | 'invited' | 'suspended';
  joined_at: string | null;
}

interface AuthContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  subscriber: Subscriber | null;
  loading: boolean;

  // Company state
  companies: Company[];
  currentCompany: Company | null;
  currentMembership: CompanyMember | null;

  // Auth methods
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name: string, refCode?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;

  // Company methods
  setCurrentCompany: (companyId: string) => void;
  refreshCompanies: () => Promise<void>;

  // Cross-auth
  generateCrossToken: (productId: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_COMPANY_KEY = 'sincla_current_company';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);

  // Company state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);
  const [currentMembership, setCurrentMembership] = useState<CompanyMember | null>(null);

  // Load subscriber data
  const loadSubscriber = async (userId: string) => {
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error loading subscriber:', error);
      return null;
    }

    return data as Subscriber;
  };

  // Load companies (duas queries separadas para evitar recursão RLS)
  const loadCompanies = async (userId: string) => {
    try {
      // 1. Buscar company_ids do usuário
      const { data: memberships, error: memberError } = await supabase
        .from('company_members')
        .select('company_id, role, status')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (memberError) {
        console.error('Error loading memberships:', memberError);
        return [];
      }

      if (!memberships || memberships.length === 0) {
        return [];
      }

      const companyIds = memberships.map(m => m.company_id);

      // 2. Buscar companies por IDs
      const { data: companiesData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .in('id', companyIds)
        .order('created_at', { ascending: false });

      if (companyError) {
        console.error('Error loading companies:', companyError);
        return [];
      }

      return (companiesData || []) as Company[];
    } catch (err) {
      console.error('Unexpected error loading companies:', err);
      return [];
    }
  };

  // Load current membership
  const loadMembership = async (userId: string, companyId: string) => {
    const { data, error } = await supabase
      .from('company_members')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    if (error) {
      console.error('Error loading membership:', error);
      return null;
    }

    return data as CompanyMember;
  };

  // Initialize auth
  useEffect(() => {
    devLog('init', 'Iniciando autenticação...');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      devLog('getSession', session ? `Sessão encontrada: ${session.user.email}` : 'Sem sessão ativa');
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        initializeUserData(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      devWarn('getSession ERROR', err);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        devLog('onAuthStateChange', event, session?.user?.email ?? 'null');
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await initializeUserData(session.user.id);
        } else {
          // Clear state on sign out
          devLog('signOut', 'Limpando estado...');
          setSubscriber(null);
          setCompanies([]);
          setCurrentCompanyState(null);
          setCurrentMembership(null);
          localStorage.removeItem(CURRENT_COMPANY_KEY);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Initialize user data after auth
  const initializeUserData = async (userId: string) => {
    devLog('initializeUserData', `Carregando dados para ${userId}...`);
    setLoading(true);

    try {
      // Load subscriber profile
      devLog('loadSubscriber', 'Buscando perfil...');
      const subscriberData = await loadSubscriber(userId);
      devLog('loadSubscriber', subscriberData ? 'OK' : 'Não encontrado');
      setSubscriber(subscriberData);

      // Load companies
      devLog('loadCompanies', 'Buscando empresas...');
      const companiesData = await loadCompanies(userId);
      devLog('loadCompanies', `${companiesData.length} empresa(s) encontrada(s)`);
      setCompanies(companiesData);

      // Restore or set current company
      const savedCompanyId = localStorage.getItem(CURRENT_COMPANY_KEY);
      devLog('savedCompany', savedCompanyId ?? 'nenhuma salva');
      let targetCompany: Company | null = null;

      if (savedCompanyId) {
        targetCompany = companiesData.find(c => c.id === savedCompanyId) || null;
      }

      if (!targetCompany && companiesData.length > 0) {
        targetCompany = companiesData[0];
      }

      if (targetCompany) {
        devLog('setCompany', targetCompany.name);
        setCurrentCompanyState(targetCompany);
        localStorage.setItem(CURRENT_COMPANY_KEY, targetCompany.id);

        // Load membership for current company
        devLog('loadMembership', 'Buscando membership...');
        const membership = await loadMembership(userId, targetCompany.id);
        devLog('loadMembership', membership ? `Role: ${membership.role}` : 'Não encontrado');
        setCurrentMembership(membership);
      }
    } catch (error) {
      console.error('Error initializing user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auth methods
  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string, refCode?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, ...(refCode ? { affiliate_ref: refCode } : {}) },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Company methods
  const setCurrentCompany = async (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (!company || !user) return;

    setCurrentCompanyState(company);
    localStorage.setItem(CURRENT_COMPANY_KEY, companyId);

    // Load membership for new company
    const membership = await loadMembership(user.id, companyId);
    setCurrentMembership(membership);
  };

  const refreshCompanies = async () => {
    if (!user) return;
    const companiesData = await loadCompanies(user.id);
    setCompanies(companiesData);

    // Also refresh currentCompany with fresh data
    if (currentCompany) {
      const updated = companiesData.find(c => c.id === currentCompany.id);
      if (updated) {
        setCurrentCompanyState(updated);
      }
    }
  };

  // Cross-auth token generation
  const generateCrossToken = async (productId: string): Promise<string | null> => {
    if (!session || !currentCompany) return null;

    try {
      const { data, error } = await supabase.functions.invoke('generate-cross-token', {
        body: {
          product_id: productId,
          company_id: currentCompany.id,
        },
      });

      if (error) {
        console.error('Error generating cross token:', error);
        return null;
      }

      return data.token;
    } catch (error) {
      console.error('Error generating cross token:', error);
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    subscriber,
    loading,
    companies,
    currentCompany,
    currentMembership,
    signInWithMagicLink,
    signInWithPassword,
    signUp,
    signOut,
    setCurrentCompany,
    refreshCompanies,
    generateCrossToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for requiring auth
export function useRequireAuth(redirectTo = '/login') {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = redirectTo;
    }
  }, [user, loading, redirectTo]);

  return { user, loading };
}

// Hook for requiring company
export function useRequireCompany() {
  const { currentCompany, companies, loading } = useAuth();

  const needsCompany = !loading && companies.length === 0;

  return { currentCompany, needsCompany, loading };
}
