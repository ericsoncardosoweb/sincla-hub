/**
 * Config pública do Supabase Hub (igwjtvdanulrwntdyfbt).
 * A anon key é publishable — pensada para o frontend.
 * VITE_* no Easypanel sobrescreve estes defaults no build Docker.
 */
export const HUB_SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL || 'https://igwjtvdanulrwntdyfbt.supabase.co';

export const HUB_SUPABASE_ANON_KEY =
    import.meta.env.VITE_SUPABASE_ANON_KEY
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnd2p0dmRhbnVscndudGR5ZmJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwODUxNzUsImV4cCI6MjA4NjY2MTE3NX0.q3eLQ0D2PW6z1U9VwC09K9DlqFsgsW0Jhw-btV2cKXo';
