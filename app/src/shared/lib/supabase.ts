import { createClient } from '@supabase/supabase-js';
import { HUB_SUPABASE_ANON_KEY, HUB_SUPABASE_URL } from './supabaseConfig';

export const supabase = createClient(HUB_SUPABASE_URL, HUB_SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Bypass Navigator.locks — causa timeout de 10s em SPAs com HMR/StrictMode
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lock: (async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
            return await fn();
        }) as any,
    },
});
