/**
 * stream-embed — Gera a URL de embed (iframe) do Bunny Stream ASSINADA por tenant.
 * O EAD/ferramentas não montam mais a URL pública direto: pedem ao Hub, que
 * valida que o vídeo pertence à empresa e assina com a Token Authentication Key
 * (Vault), evitando que alguém embede vídeo de outro tenant só com o guid.
 *
 * Entrada: { company_id, guid, expires_in? }
 * Saída:   { success, url, expires, secured }
 *
 * Token (Bunny "Embed View Token Authentication"):
 *   token = SHA256_hex(tokenKey + guid + expires)
 *   url   = https://iframe.mediadelivery.net/embed/{lib}/{guid}?token=..&expires=..
 *
 * Se a chave de token ainda não estiver no Vault, devolve a URL sem assinatura
 * (secured:false) — assim o playback continua funcionando até ativarmos o toggle.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EMBED_BASE = 'https://iframe.mediadelivery.net/embed'

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

async function sha256hex(input: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

    try {
        const { company_id, guid, expires_in } = await req.json()
        if (!company_id || !guid) return json({ success: false, error: 'Campos obrigatórios: company_id, guid' }, 400)

        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        })

        // Isolamento: o vídeo precisa pertencer à empresa
        const { data: row } = await admin
            .from('stream_videos').select('guid, company_id, library_id').eq('guid', guid).maybeSingle()
        if (!row || row.company_id !== company_id) {
            return json({ success: false, error: 'Vídeo não encontrado para esta empresa' }, 404)
        }

        const lib = row.library_id
            || Deno.env.get('BUNNY_STREAM_LIBRARY_ID')
            || (await admin.rpc('get_secret', { p_name: 'bunny_stream_library_id' })).data
            || ''
        const tokenKey = Deno.env.get('BUNNY_STREAM_TOKEN_KEY')
            || (await admin.rpc('get_secret', { p_name: 'bunny_stream_token_key' })).data
            || ''

        const base = `${EMBED_BASE}/${lib}/${guid}`
        const ttl = Math.min(Math.max(Number(expires_in) || 21600, 300), 86400) // 5min..24h
        const expires = Math.floor(Date.now() / 1000) + ttl

        if (!tokenKey) {
            return json({ success: true, url: base, expires, secured: false })
        }

        const token = await sha256hex(`${tokenKey}${guid}${expires}`)
        const url = `${base}?token=${token}&expires=${expires}`
        return json({ success: true, url, expires, secured: true })
    } catch (err: any) {
        console.error('[stream-embed]', err)
        return json({ success: false, error: err.message || 'Erro interno' }, 500)
    }
})
