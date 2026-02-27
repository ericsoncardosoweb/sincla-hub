import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { createSinclaClient, type SupabaseClient } from './supabase';
import type { SinclaUser, SinclaPlatform } from '@sincla/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthState {
    user: User | null;
    profile: SinclaUser | null;
    session: Session | null;
    loading: boolean;
    initialized: boolean;
}

interface AuthContextValue extends AuthState {
    supabase: SupabaseClient;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    signOut: () => Promise<void>;
    signInWithMagicLink: (email: string) => Promise<void>;
    generateCrossToken: (targetPlatform: SinclaPlatform) => Promise<string | null>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

interface AuthProviderProps {
    children: React.ReactNode;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
}

export function AuthProvider({ children, supabaseUrl, supabaseAnonKey }: AuthProviderProps) {
    const supabase = useMemo(
        () => createSinclaClient(supabaseUrl, supabaseAnonKey),
        [supabaseUrl, supabaseAnonKey]
    );

    const [state, setState] = useState<AuthState>({
        user: null,
        profile: null,
        session: null,
        loading: true,
        initialized: false,
    });

    // Fetch user profile from hub_users
    const fetchProfile = useCallback(async (userId: string) => {
        const { data } = await supabase
            .from('hub_users')
            .select('*')
            .eq('id', userId)
            .single();
        return data as SinclaUser | null;
    }, [supabase]);

    // Listen for auth changes
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                const user = session?.user ?? null;
                let profile: SinclaUser | null = null;

                if (user) {
                    profile = await fetchProfile(user.id);
                }

                setState({
                    user,
                    profile,
                    session,
                    loading: false,
                    initialized: true,
                });
            }
        );

        // Initial session check
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const user = session?.user ?? null;
            let profile: SinclaUser | null = null;

            if (user) {
                profile = await fetchProfile(user.id);
            }

            setState({
                user,
                profile,
                session,
                loading: false,
                initialized: true,
            });
        });

        return () => subscription.unsubscribe();
    }, [supabase, fetchProfile]);

    // ─── Auth Methods ────────────────────────────────────────────────────────

    const signIn = useCallback(async (email: string, password: string) => {
        setState(prev => ({ ...prev, loading: true }));
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setState(prev => ({ ...prev, loading: false }));
            throw error;
        }
    }, [supabase]);

    const signUp = useCallback(async (email: string, password: string, name: string) => {
        setState(prev => ({ ...prev, loading: true }));
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
        });
        if (error) {
            setState(prev => ({ ...prev, loading: false }));
            throw error;
        }
    }, [supabase]);

    const signOut = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true }));
        await supabase.auth.signOut();
        setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            initialized: true,
        });
    }, [supabase]);

    const signInWithMagicLink = useCallback(async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
    }, [supabase]);

    const generateCrossToken = useCallback(async (targetPlatform: SinclaPlatform) => {
        if (!state.user) return null;
        const { data, error } = await supabase.functions.invoke('generate-cross-token', {
            body: {
                user_id: state.user.id,
                target_platform: targetPlatform,
            },
        });
        if (error) throw error;
        return data?.cross_token ?? null;
    }, [supabase, state.user]);

    // ─── Value ───────────────────────────────────────────────────────────────

    const value = useMemo<AuthContextValue>(() => ({
        ...state,
        supabase,
        signIn,
        signUp,
        signOut,
        signInWithMagicLink,
        generateCrossToken,
    }), [state, supabase, signIn, signUp, signOut, signInWithMagicLink, generateCrossToken]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
    }
    return context;
}

/**
 * Hook que retorna apenas o cliente Supabase.
 * Útil quando não precisa do auth state completo.
 */
export function useSupabase(): SupabaseClient {
    return useAuth().supabase;
}
