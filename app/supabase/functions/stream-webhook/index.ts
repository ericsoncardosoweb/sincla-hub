/**
 * stream-webhook — Recebe eventos do Bunny Stream e contabiliza o uso real
 * (pós-transcode) por empresa no Hub. Idempotente: aplica apenas o delta entre
 * o tamanho real no Bunny e o último valor contabilizado em stream_videos.
 *
 * Configurar no Bunny: Stream Library → Settings → Webhook URL apontando para
 * https://<hub>.functions.supabase.co/functions/v1/stream-webhook
 * (sem JWT — verify_jwt=false; processamos apenas guids conhecidos, então é seguro).
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
    if (req.method !== 'POST') return json({ ok: true })

    try {
        const body = await req.json().catch(() => ({}))
        const guid: string = body.VideoGuid || body.videoGuid || body.guid
        if (!guid) return json({ ok: true, ignored: 'no guid' })

        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        })

        // Só processa vídeos que o Hub conhece (segurança + escopo)
        const { data: row } = await admin
            .from('stream_videos')
            .select('guid, company_id, tool_id, storage_bytes')
            .eq('guid', guid).maybeSingle()
        if (!row) return json({ ok: true, ignored: 'unknown guid' })

        const { key: BUNNY_KEY, lib: BUNNY_LIB } = await getBunnyCreds(admin)
        const vr = await fetch(`${BUNNY_API}/library/${BUNNY_LIB}/videos/${guid}`, { headers: { AccessKey: BUNNY_KEY } })
        if (!vr.ok) return json({ ok: true, ignored: 'bunny fetch failed' })
        const v = await vr.json()

        const stored = row.storage_bytes || 0
        const real = v.storageSize || 0
        const status = STATUS_MAP[v.status] ?? 'processing'
        const tool = row.tool_id || 'ead'

        await admin.from('stream_videos').update({
            status, storage_bytes: real, duration_seconds: Math.round(v.length || 0), updated_at: new Date().toISOString(),
        }).eq('guid', guid)

        const delta = real - stored
        if (delta !== 0) {
            await admin.from('storage_quotas').upsert({ company_id: row.company_id }, { onConflict: 'company_id', ignoreDuplicates: true })
            const { data: q } = await admin.from('storage_quotas')
                .select('stream_bytes, stream_files_count, stream_by_tool').eq('company_id', row.company_id).single()
            if (q) {
                const byTool = (q.stream_by_tool || {}) as Record<string, number>
                byTool[tool] = Math.max(0, (byTool[tool] || 0) + delta)
                const countDelta = stored === 0 && real > 0 ? 1 : stored > 0 && real === 0 ? -1 : 0
                await admin.from('storage_quotas').update({
                    stream_bytes: Math.max(0, (q.stream_bytes || 0) + delta),
                    stream_files_count: Math.max(0, (q.stream_files_count || 0) + countDelta),
                    stream_by_tool: byTool,
                    updated_at: new Date().toISOString(),
                }).eq('company_id', row.company_id)

                await admin.from('service_usage_log').insert({
                    company_id: row.company_id, service_type: 'storage', sub_type: 'stream', tool_id: tool,
                    quantity: Math.abs(delta),
                    metadata: { storage_type: 'stream', video_guid: guid, action: delta > 0 ? 'encode' : 'adjust', source: 'webhook' },
                })
            }
        }

        console.log(`[stream-webhook] guid:${guid} status:${status} real:${real} delta:${delta}`)
        return json({ ok: true })
    } catch (err: any) {
        console.error('[stream-webhook]', err)
        return json({ ok: true, error: err.message })
    }
})
