/**
 * stream-delete — Remove um vídeo do Bunny pelo Hub, com isolamento por empresa.
 *
 * Entrada: { company_id, guid }
 * Só apaga se o vídeo pertencer à empresa (registro em stream_videos), impedindo
 * delete cross-tenant. Ajusta storage_quotas e registra a remoção no log.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BUNNY_API = 'https://video.bunnycdn.com'

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}

async function getBunnyCreds(admin: any): Promise<{ key: string; lib: string }> {
    let key = Deno.env.get('BUNNY_STREAM_API_KEY') || ''
    let lib = Deno.env.get('BUNNY_STREAM_LIBRARY_ID') || ''
    if (!key) key = (await admin.rpc('get_secret', { p_name: 'bunny_stream_api_key' })).data || ''
    if (!lib) lib = (await admin.rpc('get_secret', { p_name: 'bunny_stream_library_id' })).data || ''
    return { key, lib }
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)

    try {
        const { company_id, guid } = await req.json()
        if (!company_id || !guid) return json({ success: false, error: 'Campos obrigatórios: company_id, guid' }, 400)

        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        })

        const { data: row } = await admin
            .from('stream_videos')
            .select('guid, company_id, tool_id, storage_bytes')
            .eq('guid', guid).maybeSingle()
        if (!row || row.company_id !== company_id) {
            return json({ success: false, error: 'Vídeo não encontrado para esta empresa' }, 404)
        }

        const { key: BUNNY_KEY, lib: BUNNY_LIB } = await getBunnyCreds(admin)

        // Apagar no Bunny (404 = já não existe, segue o fluxo)
        const dr = await fetch(`${BUNNY_API}/library/${BUNNY_LIB}/videos/${guid}`, {
            method: 'DELETE', headers: { AccessKey: BUNNY_KEY },
        })
        if (!dr.ok && dr.status !== 404) {
            return json({ success: false, error: 'Falha ao deletar no Bunny' }, 502)
        }

        const bytes = row.storage_bytes || 0
        const tool = row.tool_id || 'ead'

        // Ajustar quota para baixo
        const { data: q } = await admin
            .from('storage_quotas')
            .select('stream_bytes, stream_files_count, stream_by_tool')
            .eq('company_id', company_id).maybeSingle()
        if (q) {
            const byTool = (q.stream_by_tool || {}) as Record<string, number>
            byTool[tool] = Math.max(0, (byTool[tool] || 0) - bytes)
            await admin.from('storage_quotas').update({
                stream_bytes: Math.max(0, (q.stream_bytes || 0) - bytes),
                stream_files_count: Math.max(0, (q.stream_files_count || 0) - 1),
                stream_by_tool: byTool,
                updated_at: new Date().toISOString(),
            }).eq('company_id', company_id)
        }

        // Log da remoção
        if (bytes > 0) {
            await admin.from('service_usage_log').insert({
                company_id, service_type: 'storage', sub_type: 'stream', tool_id: tool,
                quantity: bytes, metadata: { action: 'delete', storage_type: 'stream', video_guid: guid },
            })
        }

        // Remover registro
        await admin.from('stream_videos').delete().eq('guid', guid)

        console.log(`[stream-delete] company:${company_id} guid:${guid} freed:${bytes}`)
        return json({ success: true, freed_bytes: bytes })
    } catch (err: any) {
        console.error('[stream-delete]', err)
        return json({ success: false, error: err.message || 'Erro interno' }, 500)
    }
})
