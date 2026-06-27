/**
 * stream-status — Consulta o status de um vídeo no Bunny pelo Hub e sincroniza
 * o registro em stream_videos. A ferramenta não precisa da chave do Bunny.
 *
 * Entrada: { company_id, guid }
 * Só retorna/atualiza se o vídeo pertencer à empresa informada (isolamento).
 * Também aplica a contabilidade delta na storage_quotas (idempotente), de forma
 * que convergimos para o tamanho real mesmo se o webhook (Fase 3.2) não disparar.
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

const STATUS_MAP: Record<number, string> = {
    0: 'created', 1: 'uploaded', 2: 'processing', 3: 'processing', 4: 'ready', 5: 'error',
}

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
            .from('stream_videos').select('guid, company_id, tool_id, storage_bytes').eq('guid', guid).maybeSingle()
        if (!row || row.company_id !== company_id) {
            return json({ success: false, error: 'Vídeo não encontrado para esta empresa' }, 404)
        }

        const { key: BUNNY_KEY, lib: BUNNY_LIB } = await getBunnyCreds(admin)
        const vr = await fetch(`${BUNNY_API}/library/${BUNNY_LIB}/videos/${guid}`, {
            headers: { AccessKey: BUNNY_KEY },
        })
        if (!vr.ok) return json({ success: false, error: 'Vídeo não encontrado no Bunny' }, 404)
        const v = await vr.json()

        const stored = row.storage_bytes || 0
        const real = v.storageSize || 0
        const status = STATUS_MAP[v.status] ?? 'processing'
        await admin.from('stream_videos').update({
            status,
            storage_bytes: real,
            duration_seconds: Math.round(v.length || 0),
            updated_at: new Date().toISOString(),
        }).eq('guid', guid)

        // Contabilidade delta (idempotente): converge para o tamanho real no Bunny
        const delta = real - stored
        if (delta !== 0) {
            const tool = row.tool_id || 'ead'
            await admin.from('storage_quotas').upsert({ company_id }, { onConflict: 'company_id', ignoreDuplicates: true })
            const { data: q } = await admin.from('storage_quotas')
                .select('stream_bytes, stream_files_count, stream_by_tool').eq('company_id', company_id).single()
            if (q) {
                const byTool = (q.stream_by_tool || {}) as Record<string, number>
                byTool[tool] = Math.max(0, (byTool[tool] || 0) + delta)
                const countDelta = stored === 0 && real > 0 ? 1 : stored > 0 && real === 0 ? -1 : 0
                await admin.from('storage_quotas').update({
                    stream_bytes: Math.max(0, (q.stream_bytes || 0) + delta),
                    stream_files_count: Math.max(0, (q.stream_files_count || 0) + countDelta),
                    stream_by_tool: byTool,
                    updated_at: new Date().toISOString(),
                }).eq('company_id', company_id)
                await admin.from('service_usage_log').insert({
                    company_id, service_type: 'storage', sub_type: 'stream', tool_id: tool,
                    quantity: Math.abs(delta),
                    metadata: { storage_type: 'stream', video_guid: guid, action: delta > 0 ? 'encode' : 'adjust', source: 'status' },
                })
            }
        }

        return json({
            success: true,
            guid,
            status,
            statusCode: v.status,
            storage_bytes: v.storageSize || 0,
            duration_seconds: Math.round(v.length || 0),
            availableResolutions: v.availableResolutions || '',
            encodeProgress: v.encodeProgress || 0,
        })
    } catch (err: any) {
        console.error('[stream-status]', err)
        return json({ success: false, error: err.message || 'Erro interno' }, 500)
    }
})
