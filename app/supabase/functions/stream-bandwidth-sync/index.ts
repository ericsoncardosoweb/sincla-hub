/**
 * stream-bandwidth-sync — Estima a banda de streaming entregue por empresa no mês corrente.
 *
 * O Bunny NÃO fornece banda por vídeo/empresa (biblioteca/pull zone compartilhada), apenas
 * views/watch time. Então estimamos: bytes entregues ≈ watchTime(seg) × bitrate, onde
 * bitrate = storage_bytes / duration_seconds. Soma por company_id/tool e grava em storage_quotas
 * (month-to-date; reseta naturalmente na virada do mês porque recalcula a partir do dia 1).
 *
 * Pensado para rodar 1x/dia (cron). Marca bandwidth como estimativa (get-usage expõe estimated:true).
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
    const key = Deno.env.get('BUNNY_STREAM_API_KEY')
        || (await admin.rpc('get_secret', { p_name: 'bunny_stream_api_key' })).data || ''
    const lib = Deno.env.get('BUNNY_STREAM_LIBRARY_ID')
        || (await admin.rpc('get_secret', { p_name: 'bunny_stream_library_id' })).data || ''
    return { key, lib }
}

function sumChart(chart: unknown): number {
    if (!chart || typeof chart !== 'object') return 0
    let total = 0
    for (const v of Object.values(chart as Record<string, unknown>)) {
        const n = Number(v)
        if (!Number.isNaN(n)) total += n
    }
    return total
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST' && req.method !== 'GET') return json({ success: false, error: 'Method not allowed' }, 405)

    try {
        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        })
        const { key: BUNNY_KEY, lib: BUNNY_LIB } = await getBunnyCreds(admin)
        if (!BUNNY_KEY || !BUNNY_LIB) return json({ success: false, error: 'Credenciais Bunny ausentes' }, 500)

        const now = new Date()
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        const dateFrom = monthStart.toISOString().slice(0, 10)
        const dateTo = now.toISOString().slice(0, 10)

        const { data: videos } = await admin.from('stream_videos')
            .select('guid, company_id, tool_id, storage_bytes, duration_seconds')
            .neq('status', 'deleted')

        // Acumula por empresa
        const perCompany: Record<string, { total: number; byTool: Record<string, number> }> = {}

        for (const v of videos || []) {
            const dur = Math.max(Number(v.duration_seconds) || 0, 1)
            const size = Number(v.storage_bytes) || 0
            if (size <= 0) continue
            const bitrate = size / dur // bytes/seg

            let watchSeconds = 0
            try {
                const url = `${BUNNY_API}/library/${BUNNY_LIB}/statistics?videoGuid=${v.guid}&dateFrom=${dateFrom}&dateTo=${dateTo}`
                const r = await fetch(url, { headers: { AccessKey: BUNNY_KEY } })
                if (r.ok) {
                    const s = await r.json()
                    watchSeconds = sumChart(s.watchTimeChart)
                    if (watchSeconds === 0 && typeof s.totalWatchTime === 'number') watchSeconds = s.totalWatchTime
                }
            } catch (_e) { /* segue com 0 */ }

            const estBytes = Math.round(watchSeconds * bitrate)
            const cid = v.company_id
            const tool = v.tool_id || 'ead'
            if (!perCompany[cid]) perCompany[cid] = { total: 0, byTool: {} }
            perCompany[cid].total += estBytes
            perCompany[cid].byTool[tool] = (perCompany[cid].byTool[tool] || 0) + estBytes
        }

        // Grava por empresa + define franquia a partir do plano (se houver assinatura ativa)
        const results: Array<{ company_id: string; bytes: number }> = []
        for (const [cid, agg] of Object.entries(perCompany)) {
            // franquia do plano base ead (limits.bandwidth_gb), se assinatura ativa
            const { data: sub } = await admin.from('subscriptions')
                .select('plan_id, product_plans!inner(limits)')
                .eq('company_id', cid).eq('product_id', 'ead').eq('status', 'active')
                .maybeSingle()
            const bwGb = Number((sub as any)?.product_plans?.limits?.bandwidth_gb) || 0

            const patch: Record<string, unknown> = {
                bandwidth_bytes: agg.total,
                bandwidth_by_tool: agg.byTool,
                updated_at: new Date().toISOString(),
            }
            if (bwGb > 0) patch.bandwidth_quota_bytes = bwGb * 1073741824

            await admin.from('storage_quotas').upsert({ company_id: cid }, { onConflict: 'company_id', ignoreDuplicates: true })
            await admin.from('storage_quotas').update(patch).eq('company_id', cid)
            results.push({ company_id: cid, bytes: agg.total })
        }

        console.log(`[stream-bandwidth-sync] ${dateFrom}..${dateTo} empresas:${results.length}`)
        return json({ success: true, period: { from: dateFrom, to: dateTo }, companies: results, estimated: true })
    } catch (err: any) {
        console.error('[stream-bandwidth-sync]', err)
        return json({ success: false, error: err.message || 'Erro interno' }, 500)
    }
})
