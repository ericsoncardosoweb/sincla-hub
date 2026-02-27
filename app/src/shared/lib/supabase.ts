import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Bypass Navigator.locks — causa timeout de 10s em SPAs com HMR/StrictMode
        // O GoTrueClient tenta um lock exclusivo que nunca é liberado em dev
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lock: (async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
            return await fn();
        }) as any,
    },
});
