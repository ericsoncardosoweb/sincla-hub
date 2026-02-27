import { createClient } from '@supabase/supabase-js';

/**
 * Cria o cliente Supabase compartilhado.
 * Cada app fornece suas próprias variáveis de ambiente.
 */
export function createSinclaClient(supabaseUrl?: string, supabaseAnonKey?: string) {
    const url = supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
    const key = supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
        throw new Error(
            '[Sincla Auth] VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios. ' +
            'Verifique seu arquivo .env.'
        );
    }

    return createClient(url, key, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
    });
}

export type { SupabaseClient } from '@supabase/supabase-js';
